<!-- src\lib\components\FilterSheet.svelte -->
<script lang="ts">
  import { sortField, sortOrder } from '$lib/stores/app.store';
  import type { SortField, SortOrder } from '$lib/types/ldata';

  export let show = false;

  let selectedField: SortField = $sortField;
  let selectedOrder: SortOrder = $sortOrder;

  sortField.subscribe(v => selectedField = v);
  sortOrder.subscribe(v => selectedOrder = v);

  function apply() {
    sortField.set(selectedField);
    sortOrder.set(selectedOrder);
    show = false;
  }

  function reset() {
    selectedField = 'title';
    selectedOrder = 'asc';
    sortField.set(selectedField);
    sortOrder.set(selectedOrder);
    show = false;
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/50 z-150 flex items-end"
    role="presentation"
    on:click={() => (show = false)}
    on:keydown
  >
    <div
      class="bg-base-100 w-full rounded-t-2xl p-6 max-h-[80vh] overflow-auto"
      role="dialog"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown
    >
      <h3 class="text-2xl font-bold mb-6">Sort & Filter</h3>

      <div class="form-control mb-4">
        <label class="label" for="sort-field">
          <span class="label-text font-semibold">Sort By</span>
        </label>
        <select
          id="sort-field"
          class="select select-bordered w-full"
          bind:value={selectedField}
        >
          <option value="title">Title (A-Z)</option>
          <option value="rating">Rating</option>
          <option value="editedAt">Last Edited</option>
          <option value="createdAt">Date Created</option>
          <option value="openedAt">Last Opened</option>
        </select>
      </div>

      <div class="form-control mb-6">
        <label class="label" for="sort-order">
          <span class="label-text font-semibold">Order</span>
        </label>
        <div class="flex gap-2">
          <button
            class="btn flex-1"
            class:btn-primary={selectedOrder === 'asc'}
            aria-pressed={selectedOrder === 'asc'}
            on:click={() => (selectedOrder = 'asc')}
          >
            Ascending
          </button>
          <button
            class="btn flex-1"
            class:btn-primary={selectedOrder === 'desc'}
            aria-pressed={selectedOrder === 'desc'}
            on:click={() => (selectedOrder = 'desc')}
          >
            Descending
          </button>
        </div>
      </div>

      <div class="flex gap-2">
        <button class="btn btn-outline flex-1" on:click={reset}>Reset</button>
        <button class="btn btn-primary flex-1" on:click={apply}>Apply</button>
      </div>
    </div>
  </div>
{/if}
