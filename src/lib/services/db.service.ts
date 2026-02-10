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
}

export function entryFingerprint(entry: Partial<LData>) {
  return [
    (entry.title ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
    (entry.alternativeTitles?.join(' ') ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
    (entry.coverImageUrl ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  ].join('|');
}

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

  // ----------------------------
  // Queries
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

  // ----------------------------
  // Mutations
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
      dataType: 'json'
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

  // Imported IDs are explicitly discarded. IndexedDB generates new IDs, Navigation IDs are guaranteed unique. 
  async importFromJSON(entries: LData[]): Promise<void> {
    await this.ensureInitialized();

    const existing = await this.getAllEntries();
    const existingFingerprints = new Set(
      existing.map(entryFingerprint)
    );

    for (const entry of entries) {
      const fp = entryFingerprint(entry);

      // Skip exact duplicates
      if (existingFingerprints.has(fp)) continue;

      const { id, ...withoutId } = entry;
      await this.addEntry(withoutId);
      existingFingerprints.add(fp);
    }
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
      md.push(`## ${entry.title}`);

      if (entry.alternativeTitles?.length) {
        md.push(`*(**AltTitles:** ${entry.alternativeTitles.join(', ')})*`);
        md.push(``);
      }

      if (entry.rating != null) { md.push(`- ***Rating:** ${entry.rating}*`);}
      if (entry.category) { md.push(`- ***Category:** #${entry.category}*`);}
      if (entry.tags?.length) { md.push(`- ***Tags:** ${entry.tags.join(', ')}*`);}
      if (entry.badges?.length) { md.push(`- ***Badges:** ${entry.badges.join(', ')}*`);}
      
      if (entry.description) {
        md.push(entry.description);
        md.push(``);}

      // ---- Cover + Characters table ----
      md.push(`|   Cover   | Cover Image |`);
      md.push(`| :------: | :---------- |`);

      if (entry.coverImageUrl) {
        md.push(
          `| Cover | <img src="${entry.coverImageUrl}" width="120" style="aspect-ratio:1/1;object-fit:cover;" /> |`
        );
      } else {
        md.push(`| Cover | — |`);}

      // Characters
      if (entry.characters?.length) {
        md.push(`| Characters |  |`);

        for (const char of entry.characters) {
          md.push(
            `| ${char.Name} | <img src="${char.Image}" width="100" style="aspect-ratio:1/1;object-fit:cover;" /> |`
          );
        }
      } else {
        md.push(`| Characters | — |`);}

      md.push(``);

      // ---- Chapter rows table (4 cols) ----
      if (entry.rows?.length) {
        md.push(`### Chapters`);
        md.push(``);
        md.push(`| Chapter | Description | Tags | Characters |`);
        md.push(`| :-----: | ----------- | ---- | ---------- |`);

        for (const row of entry.rows) {
          md.push(
            `| ${row.ChapterSE ?? ''} | ${row.Description ?? ''} | ${(row.Tags ?? []).join(', ')} | ${row.Characters ?? ''} |`
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
      dataType: 'json'
    };
  }
}

// Export singleton instance of database service
// Singleton instance
export const dbService = new DatabaseService();
