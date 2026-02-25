// categories.store.ts
import { writable } from 'svelte/store';
import { dbService } from '$lib/services/db.service';

import { entries } from './app.store';
import { selectedCategory } from './app.store';

function createCategoriesStore() {
  const { subscribe, set } = writable<string[]>(['All']);

  return {
    subscribe,

    load: async () => {
      const cats = await dbService.getAllCategories();
      set(cats);
    },

    add: async (name: string) => {
      await dbService.addCategory(name);
      const cats = await dbService.getAllCategories();
      set(cats);
    },

    rename: async (oldName: string, newName: string) => {
      // Rename category record
      await dbService.renameCategoryRecord(oldName, newName);

      // Update entries using it
      await dbService.renameCategory(oldName, newName);
      
      // Reload entries store (IMPORTANT)
      await entries.load();

      // Update selected category if it was the renamed one
      selectedCategory.update(current =>
        current === oldName ? newName : current
      );
      // Reload categories list
      const cats = await dbService.getAllCategories();
      set(cats);
    },

    remove: async (name: string) => {
      await dbService.deleteCategory(name);
      const cats = await dbService.getAllCategories();
      set(cats);
    }
  };
}

export const categories = createCategoriesStore();
