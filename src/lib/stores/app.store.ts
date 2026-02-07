// src\lib\stores\app.store.ts
import { writable, derived } from 'svelte/store';
import { dbService } from '$lib/services/db.service';
import { entryFingerprint } from '$lib/services/db.service';
import type { LData } from '$lib/types/ldata';

// -----------------------------
// Persistent entries store
// -----------------------------
function createEntriesStore() {
  const { subscribe, set, update } = writable<LData[]>([]);

  return {
    subscribe,
    set,
    update,
    load: async () => {
      const data = await dbService.getAllEntries();
      set(data);
      return data;
    },
    add: async (entry: Omit<LData, 'id'>) => {
      const id = await dbService.addEntry(entry);
      update(entries => [...entries, { ...entry, id }]);
    },
    updateEntry: async (id: number, entry: Partial<LData>) => {
      await dbService.updateEntry(id, entry);
      update(entries => entries.map(e => (e.id === id ? { ...e, ...entry } : e)));
    },
    deleteEntry: async (id: number) => {
      await dbService.deleteEntry(id);
      update(entries => entries.filter(e => e.id !== id));
    }
  };
}

export const entries = createEntriesStore();

// full dataset
export const allEntries = writable<LData[]>([]);

// -----------------------------
// Other UI / filter stores
// -----------------------------
export const searchQuery = writable('');
export const searchMode = writable<'default' | 'a' | 't' | 'b' | 'c'>('default');

// // ORIGINAL (non-persistent)
// export const selectedCategory = writable('All');
// export const sortField = writable('createdAt');
// export const sortOrder = writable<'asc' | 'desc'>('desc');

// selectedCategory.subscribe(value => {
//   localStorage.setItem('selectedCategory', value);
// });


export type SortField = 'title' | 'editedAt' | 'createdAt' | 'openedAt' | 'rating';

// -----------------------------
// Persistent filter stores(later)
// -----------------------------
export const selectedCategory = createPersistentStore<string>('libsettings:selectedCategory', 'All');
// persist sort settings too
export const sortField = createPersistentStore<string>('libsettings:sortField', 'createdAt');
export const sortOrder = createPersistentStore<'asc' | 'desc'>('libsettings:sortOrder', 'desc');
// Persistent layout settings
export const gridCols = createPersistentStore<number>('lib:gridCols', 4);

// -----------------------------
// Derived filtered entries
// -----------------------------
export const filteredEntries = derived(
  [
    entries,
    selectedCategory,
    searchQuery,
    searchMode,
    sortField,
    sortOrder
  ],
  ([$entries, $selectedCategory, $searchQuery, $searchMode, $sortField, $sortOrder]) => {
    // let filtered = $entries;
    // let filtered = dedupeByContent($entries);
    let filtered = [...$entries];

    if ($selectedCategory !== 'All') {
      filtered = filtered.filter(e => e.category === $selectedCategory);
    }

    if ($searchQuery) {
      const q = $searchQuery.toLowerCase();

      filtered = filtered.filter(entry => {
        switch ($searchMode) {
          case 'a':
            return entry.alternativeTitles.join(' ').toLowerCase().includes(q);

          case 't':
            return entry.tags.join(' ').toLowerCase().includes(q);

          case 'b':
            return entry.badges.join(' ').toLowerCase().includes(q);

          case 'c':
            return entry.characters
              .map(c => c.Name)
              .join(' ')
              .toLowerCase()
              .includes(q);

          default:
            return (
              entry.title.toLowerCase().includes(q) ||
              entry.alternativeTitles.join(' ').toLowerCase().includes(q)
            );
        }
      });
    }

    // Sort
    filtered = filtered.sort((a, b) => {
      const aVal = (a as any)[$sortField] ?? '';
      const bVal = (b as any)[$sortField] ?? '';
      if ($sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }
);

// If you ever import old DBs, sync devices, or manually edit IndexedDB, add a derived-store dedupe.
// In app.store.ts
function dedupeByContent(entries: LData[]) {
  const map = new Map<string, LData>();

  for (const entry of entries) {
    const key = entryFingerprint(entry);
    const existing = map.get(key);

    // Keep newest (higher ID)
    if (!existing || entry.id > existing.id) {
      map.set(key, entry);
    }
  }

  return [...map.values()];
}

// -----------------------------
// Other UI / filter stores
// -----------------------------
function createPersistentStore<T>(key: string, initial: T) {
  const stored = localStorage.getItem(key);
  const { subscribe, set, update } = writable<T>(stored ? JSON.parse(stored) : initial);

  return {
    subscribe,
    set: (value: T) => {
      localStorage.setItem(key, JSON.stringify(value));
      set(value);
    },
    update: (fn: (value: T) => T) => {
      update(current => {
        const updated = fn(current);
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    }
  };
}
