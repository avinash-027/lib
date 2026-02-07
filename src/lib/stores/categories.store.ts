// categories.store.ts
import { writable } from 'svelte/store';

function createCategoriesStore() {
  const stored = localStorage.getItem('categories');
  const { subscribe, set, update } = writable<string[]>(stored ? JSON.parse(stored) : ['All']);

  return {
    subscribe,
    set: (cats: string[]) => {
      localStorage.setItem('categories', JSON.stringify(cats));
      set(cats);
    },
    update: (fn: (cats: string[]) => string[]) => {
      update(current => {
        const updated = fn(current);
        localStorage.setItem('categories', JSON.stringify(updated));
        return updated;
      });
    }
  };
}

export const categories = createCategoriesStore();
