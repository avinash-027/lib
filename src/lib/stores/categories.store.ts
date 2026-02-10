// categories.store.ts
import { writable } from 'svelte/store';
import { dbService } from '$lib/services/db.service';

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
        await dbService.renameCategory(oldName, newName);
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
