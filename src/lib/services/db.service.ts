// db.service.ts
// Use IndexedDB for storage
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

// Import application-specific data type
import type { LData } from '$lib/types/ldata';
interface Entry {
  id?: number;
  title: string;
  alternativeTitles: string[];
  coverImageUrl: string | null;
  description: string;
  badges: string[];
  rating: number | null;     // <-- optional
  createdAt: string | null;
  openedAt: string | null;
  editedAt: string | null;
  tags: string[];
  characters: any[];
  rows: any[];
  category: string;
  dataType: string;
}

interface Category {
  name: string;
  createdAt: string;
}

interface MyDB extends DBSchema {
  entries: {
    key: number;
    value: Entry;
    indexes: {
      'by-category': string;
    };
  };
  categories: {
    key: string;
    value: {
      name: string;
      createdAt: string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

export function entryFingerprint(entry: Partial<LData>) {
  const clean = (str: string) => 
    (str ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const mainTitle = clean(entry.title ?? '');

  // IF dataType is md, we include alt-titles in the fingerprint for stricter matching
  // if (entry.dataType.toLowerCase() === 'md') {
  //   const altTitles = Array.from(new Set((entry.alternativeTitles ?? []).map(clean)))
  //     .sort()
  //     .join('|');
  //   return `${mainTitle}::${altTitles}`;
  // }

  // Default / jsonDb: Only match on the cleaned main title
  return mainTitle;
}

// export function entryFingerprint(entry: Partial<LData>) {
//   return [
//     (entry.title ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
//     (entry.description ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
//     (entry.alternativeTitles?.join(' ') ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
//     (entry.coverImageUrl ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
//     (entry.characters?.map((c) => c.Name).join(' ').toLowerCase()),
//     (entry.rows?.map((c) => c.ChapterSE).join(' ').toLowerCase()),
//   ].join('|');
// }

class DatabaseService {
  private db: IDBPDatabase<MyDB> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // ----------------------------
  // Initialization
  // ----------------------------

  private async initialize(): Promise<void> {
    this.db = await openDB<MyDB>('libdb', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('by-category', 'category');
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      }
    });

    this.isInitialized = true;
  }
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }
  /** Expose DB for services like auto-backup */
  async getDB(): Promise<IDBPDatabase<MyDB>> {
    await this.ensureInitialized();
    return this.db!;
  }

  // ----------------------------
  // Entries - Queries
  // ----------------------------

  async getAllEntries(): Promise<LData[]> {
    await this.ensureInitialized();

    const tx = this.db!.transaction('entries', 'readonly');
    const store = tx.objectStore('entries');
    const all = await store.getAll();

    all.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return all.map(this.rowToLData);
  }
  async getEntriesByCategory(category: string): Promise<LData[]> {
    await this.ensureInitialized();

    if (category === 'All') {
      return this.getAllEntries();
    }

    const tx = this.db!.transaction('entries', 'readonly');
    const index = tx.objectStore('entries').index('by-category');
    const rows = await index.getAll(category);

    rows.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return rows.map(this.rowToLData);
  }
  async getEntryById(id: number): Promise<LData | null> {
    await this.ensureInitialized();

    const entry = await this.db!
      .transaction('entries', 'readonly')
      .objectStore('entries')
      .get(id);

    return entry ? this.rowToLData(entry) : null;
  }

  async searchEntries(query: string, searchAlt = false): Promise<LData[]> {
    const entries = await this.getAllEntries();
    const lower = query.toLowerCase();

    return entries.filter((entry) => {
      if (!searchAlt) {
        return entry.title.toLowerCase().includes(lower);
      }
      return (
        entry.alternativeTitles.join(' ').toLowerCase().includes(lower) ||
        entry.tags.join(' ').toLowerCase().includes(lower) ||
        entry.badges.join(' ').toLowerCase().includes(lower) ||
        entry.characters.map((c) => c.Name).join(' ').toLowerCase().includes(lower)
      );
    });
  }

  // ----------------------------
  // Category -Queries
  // ----------------------------
  async getAllCategories(): Promise<string[]> {
    await this.ensureInitialized();
    const tx = this.db!.transaction('categories', 'readonly');
    const cats = await tx.objectStore('categories').getAll();
    return ['All', ...cats.map(c => c.name).filter(c => c !== 'All')];
  }

  async addCategory(name: string): Promise<void> {
    await this.ensureInitialized();
    if (!name || name === 'All') return;

    const tx = this.db!.transaction('categories', 'readwrite');
    await tx.objectStore('categories').put({
      name,
      createdAt: new Date().toISOString()
    });
    await tx.done;
  }
  async deleteCategory(name: string): Promise<void> {
    await this.ensureInitialized();
    if (name === 'All') return;

    const tx = this.db!.transaction('categories', 'readwrite');
    await tx.objectStore('categories').delete(name);
    await tx.done;
  }

  private async ensureCategoryExists(category: string | undefined | null) {
    if (!category || category === 'All') return;

    await this.ensureInitialized();

    const tx = this.db!.transaction('categories', 'readonly');
    const existing = await tx.objectStore('categories').get(category);
    await tx.done;

    if (!existing) {
      await this.addCategory(category);
    }
  }

  // ----------------------------
  // Entry,Category -Mutations
  // ----------------------------

  async addEntry(entry: Omit<LData, 'id'>): Promise<number> {
    await this.ensureInitialized();

    const now = new Date().toISOString();

    const newEntry: Entry = {
      ...entry,
      rating: entry.rating ?? 0,
      createdAt: now,
      openedAt: null,
      editedAt: null,
      dataType: entry.dataType ?? 'json'
    };

    const tx = this.db!.transaction('entries', 'readwrite');
    const id = await tx.objectStore('entries').add(newEntry);
    await tx.done;

    return id as number;
  }
  async updateEntry(id: number, entry: Partial<LData>): Promise<void> {
    await this.ensureInitialized();

    const tx = this.db!.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');

    const existing = await store.get(id);
    if (!existing) throw new Error('Entry not found');

    const { createdAt, ...entryWithoutCreatedAt } = entry;
    const updated: Entry = {
      ...existing,
      ...entryWithoutCreatedAt,
      rating: entryWithoutCreatedAt.rating ?? existing.rating ?? 0,
      editedAt: new Date().toISOString()
    };

    await store.put(updated);
    await tx.done;
  }
  async updateEntryPartial(id: number, data: Partial<LData>) {
    const entry = await this.getEntryById(id);
    if (!entry) return;

    const updated = { ...entry, ...data, editedAt: new Date().toISOString() };
    await this.updateEntry(id, updated);
  }
  async markAsOpened(id: number): Promise<void> {
    await this.ensureInitialized();

    const tx = this.db!.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');

    const entry = await store.get(id);
    if (!entry) throw new Error('Entry not found');

    entry.openedAt = new Date().toISOString();

    await store.put(entry);
    await tx.done;
  }
  async deleteEntry(id: number): Promise<void> {
    await this.ensureInitialized();

    const tx = this.db!.transaction('entries', 'readwrite');
    await tx.objectStore('entries').delete(id);
    await tx.done;
  }

  async moveCategoryToAll(category: string): Promise<void> {
    await this.ensureInitialized();

    const tx = this.db!.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');

    const all = await store.getAll();

    for (const entry of all) {
      if (entry.category === category) {
        entry.category = 'All';
        entry.editedAt = new Date().toISOString();
        await store.put(entry);
      }
    }
    await tx.done;
  }
  async renameCategory(oldName: string, newName: string) {
    const entries = await this.getAllEntries();

    for (const entry of entries) {
      if (entry.category === oldName) {
        await this.updateEntry(entry.id!, { category: newName });
      }
    }
  }

  // ----------------------------
  // Import / Export
  // ----------------------------

  // ----------------------------
  // Imported IDs are explicitly discarded. IndexedDB generates new IDs, Navigation IDs are guaranteed unique. 
  // The new entry is silently skipped during import. No duplicate is created. The existing entry is not modified.

  // async importFromJSON(entries: LData[]): Promise<void> {
  //   await this.ensureInitialized();

  //   const existing = await this.getAllEntries();
  //   const existingFingerprints = new Set(
  //     existing.map(entryFingerprint)
  //   );

  //   for (const entry of entries) {
  //     const fp = entryFingerprint(entry);

  //     // Skip exact duplicates
  //     if (existingFingerprints.has(fp)) continue;

  //     const { id, ...withoutId } = entry;
  //     await this.addEntry(withoutId);
  //     existingFingerprints.add(fp);
  //   }
  // }

  // ----------------------------
  // If fingerprint matches → update existing entry (keep its id). If no match → insert as new
  // async importFromJSON(entries: LData[]): Promise<void> {
  //   await this.ensureInitialized();

  //   const existing = await this.getAllEntries();

  //   // Map fingerprint → existing entry
  //   const fingerprintMap = new Map<string, LData>();

  //   for (const entry of existing) {
  //     fingerprintMap.set(entryFingerprint(entry), entry);
  //   }

  //   for (const entry of entries) {
  //     const fp = entryFingerprint(entry);

  //     if (fingerprintMap.has(fp)) {
  //       // Update existing entry (preserve id + createdAt)
  //       const existingEntry = fingerprintMap.get(fp)!;

  //       const { id, ...rest } = entry;

  //       await this.updateEntry(existingEntry.id!, {
  //         ...rest
  //       });

  //     } else {
  //       // Add as new
  //       const { id, ...withoutId } = entry;
  //       const newId = await this.addEntry(withoutId);

  //       // update map so duplicates inside same import also overwrite correctly
  //       fingerprintMap.set(fp, { ...entry, id: newId });
  //     }
  //   }
  // }

  async importFromJSON(entries: LData[]): Promise<void> {
    // console.log("🚀 IMPORT START");

    await this.ensureInitialized();

    const existingEntries = await this.getAllEntries();
    // Load existing categories once
    const existingCategories = new Set(await this.getAllCategories());

    // console.log("📚 Existing entries loaded:", existingEntries.length);

    // Map fingerprint → existing entry
    const fingerprintMap = new Map<string, LData>();
    for (const e of existingEntries) {
      const fp = entryFingerprint(e);
      fingerprintMap.set(fp, e);
    }

    for (const incoming of entries) {
      // console.log("--------------------------------------------------");
      // console.log("📥 Processing incoming entry:", incoming.title);

      // Ensure category exists (optimized)
      if (
        incoming.category &&
        incoming.category !== 'All' &&
        !existingCategories.has(incoming.category)
      ) {
        await this.addCategory(incoming.category);
        existingCategories.add(incoming.category); // prevent duplicate adds
      }
      // existingCategories Set + addCategory already ensures new categories are created.
      // await this.ensureCategoryExists(incoming.category);

      const fp = entryFingerprint(incoming);
      // console.log("🔑 Generated fingerprint:", fp);
      const existing = fingerprintMap.get(fp);
      // console.log("🔍 Existing match found?", !!existing);

      if (!existing) {
        // console.log("🟢 NO MATCH → Adding as new entry");

        // NO MATCH: Add as new
        const { id, ...withoutId } = incoming;
        // console.log("➖ Removed incoming ID:", id);
        const newId = await this.addEntry({ 
          ...withoutId, 
          dataType: incoming.dataType || 'Lib' 
        });

        // console.log("✅ Added new entry with ID:", newId);
        
        // Update map so subsequent items in the same import 
        // that share a fingerprint don't create duplicates
        fingerprintMap.set(fp, { ...incoming, id: newId });
        // console.log("🗺️ Fingerprint map updated with new entry");
        continue;
      }

      // console.log("🟡 MATCH FOUND → Existing ID:", existing.id);
      const incomingType = incoming.dataType?.toLowerCase();
      const existingType = existing.dataType?.toLowerCase();

      // MATCH EXISTS logic
      const isIncomingMd = incomingType === 'md';
      const descMatches = existing.description === incoming.description;

      // console.log("📄 Incoming dataType:", incomingType);
      // console.log("📝 Description matches?", descMatches);
      // console.log("📦 Existing dataType:", existingType);

      // ARCHIVE CONDITION: MD import with changes
      // If manual notes (MD) changed, we archive the old one to prevent loss.
      if (isIncomingMd && !descMatches && existingType !== 'archive') {
        // console.log("🗄️ ARCHIVE CONDITION TRIGGERED");

        await this.updateEntry(existing.id!, { dataType: 'archive' });
        // console.log("📦 Existing entry archived (ID:", existing.id, ")");

        const { id, ...withoutId } = incoming;
        // console.log("➕ Creating new Lib entry from modified MD import");

        await this.addEntry({ ...withoutId, dataType: 'Lib' });
        // console.log("✅ New Lib entry added");
      } 
      else {
        // console.log("🔄 UPDATE & MERGE PATH");

        // UPDATE & MERGE (Priority: jsonDb or unchanged MD)
        
        // 1. Merge -Tags, Badges
        const mergedTags = Array.from(
          new Set([...(existing.tags || []), ...(incoming.tags || [])])
        );
        // console.log("🏷️ Merged Tags:", mergedTags);
        const mergedBadges = Array.from(
          new Set([...(existing.badges || []), ...(incoming.badges || [])])
        );

        // 2. Characters Merge (by Name)
        const charMap = new Map();
        // Existing chars go in first, incoming chars overwrite them if Name matches
        [...(existing.characters || []), ...(incoming.characters || [])].forEach(c => {
          if (c.Name) charMap.set(c.Name, c);
        });
        // console.log("👥 Merged Characters count:", charMap.size);

        // 3. Rows Merge (by ChapterSE)
        const rowMap = new Map();
        [...(existing.rows || []), ...(incoming.rows || [])].forEach(r => { if (r.ChapterSE) rowMap.set(r.ChapterSE, r); });
        // console.log("📑 Merged Rows count:", rowMap.size);

        // Determine final dataType: 
        // If it was Archived but we get a fresh JSON update, bring it back to Lib
        const finalType = (existingType === 'archive' && !isIncomingMd) ? 'Lib' : incoming.dataType;

        // console.log("📌 Final dataType will be:", finalType);

        await this.updateEntry(existing.id!, {
          description: incoming.description?.trim() ? incoming.description.trim() : (existing.description ?? ''),
          rating: existing.rating ? existing.rating : (incoming.rating ?? null),
          coverImageUrl: existing.coverImageUrl ?? incoming.coverImageUrl ?? null,
          category: existing.category || incoming.category || 'All',
          characters: Array.from(charMap.values()),
          rows: Array.from(rowMap.values()),
          badges: mergedBadges,
          tags: mergedTags,
          dataType: finalType,
          editedAt: new Date().toISOString()
        });

        // console.log("✅ Entry updated (ID:", existing.id, ")");
      }
    }
    console.log("🏁 IMPORT COMPLETE");
  }
  async exportToJSON(): Promise<LData[]> {
    return this.getAllEntries();
  }
  async exportToMarkdown(): Promise<string> {
    const entries = await this.getAllEntries();

    const md: string[] = [];

    md.push(`# Library Export`);
    md.push(`_Exported on ${new Date().toLocaleString()}_`);
    md.push(``);

    for (const entry of entries) {
      md.push(`---`);
      md.push(``);
      md.push(`## ${entry.title}`);

      if (entry.alternativeTitles?.length) {
        md.push(`*(**AltTitles:** ${entry.alternativeTitles.join(', ')})*`);
        md.push(``);
      }

      if (entry.rating != null) { md.push(`- **Rating:** ${entry.rating}*`);}
      if (entry.category) { md.push(`- **Category:** #${entry.category}`);}
      if (entry.tags?.length) { md.push(`- **Tags:** ${entry.tags.join(', ')}`);}
      if (entry.badges?.length) { md.push(`- **Badges:** ${entry.badges.join(', ')}`);}
      
      if (entry.description) {
        md.push(entry.description);
        md.push(``);}

      // ---- Cover + Characters table ----

      md.push(``);
      md.push(`|   Cover   | Cover Image |`);
      md.push(`| :------: | :---------- |`);

      if (entry.coverImageUrl) {
        md.push(
          `| Cover | <img src="${entry.coverImageUrl}" width="120" style="aspect-ratio:1/1;object-fit:cover;" /> |  |`
        );
      } else {
        md.push(`| Cover | — |  |`);}

      // Characters
      if (entry.characters?.length) {
        md.push(`| Characters |  | role |tags| alternativeNames|`);

        for (const char of entry.characters) {
          md.push(
            `| ${char.Name} | <img src="${char.Image}" width="100" style="aspect-ratio:1/1;object-fit:cover;" /> | ${char.role} |${(char.tags ?? []).join(',')} |${(char.alternativeNames ?? []).join(',')} |`
          );
        }
      } else {
        md.push(`| Characters | — |  |`);}

      md.push(``);

      // ---- Chapter rows table (4 cols) ----
      if (entry.rows?.length) {
        md.push(`**Chapters**`);
        md.push(``);
        md.push(`| Chapter | Characters  | Description | Tags |`);
        md.push(`| :-----: | ----------- | ----------- |----- |`);

        for (const row of entry.rows) {
          md.push(
            `| ${row.ChapterSE ?? ''} | ${row.Characters ?? ''} | ${row.Description ?? ''} | ${(row.Tags ?? []).join(', ')} |`
          );}

        md.push(``);
      }
    }

    return md.join('\n');
  }

  // ----------------------------
  // Mapping
  // ----------------------------

  private rowToLData(row: Entry): LData {
    return {
      id: row.id!,
      title: row.title,
      alternativeTitles: row.alternativeTitles ?? [],
      coverImageUrl: row.coverImageUrl,
      description: row.description,
      badges: row.badges ?? [],
      rating: row.rating ?? 0,
      createdAt: row.createdAt,
      openedAt: row.openedAt,
      editedAt: row.editedAt,
      tags: row.tags ?? [],
      characters: row.characters ?? [],
      rows: row.rows ?? [],
      category: row.category,
      dataType: row.dataType
    };
  }

}

// Export singleton instance of database service
// Singleton instance
export const dbService = new DatabaseService();
