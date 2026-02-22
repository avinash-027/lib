<!-- src\lib\components\CardGrid.svelte --> 
<script lang="ts">
  import { base } from '$app/paths';

  import type { LData } from '$lib/types/ldata';
  import { createEventDispatcher } from 'svelte';
  import { lozadAction1 } from '$lib/services/lozadAction';
  import { goto } from '$app/navigation';
  import { Svg } from '$lib';

  export let entries: LData[] = [];
  export let selectionMode = false;
  export let selectedEntries: Set<number> = new Set();
  export let gridCols: number = 4// <-- prop from HomeScreen

  const dispatch = createEventDispatcher<{
    toggleSelect: number;
  }>();
  
  // cardClick: number;
  // dispatch('cardClick', id);
  function handleCardClick(id: number | undefined) {
    if (!selectionMode && id !== undefined) {
      // Use the base path prefix here
      goto(`${base}/detail/${id}`);
    }
  }

  function toggleSelect(id: number) {
    dispatch('toggleSelect', id);
  }
  const colClasses: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };
</script>
<!-- <div style="grid-template-columns: repeat({gridCols}, minmax(0, 1fr));" class="grid gap-2 md:gap-4 md:grid-cols-6 lg:grid-cols-8"> -->
<!-- <div class="grid gap-2 md:gap-4 grid-cols-{gridCols} sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10"> -->

{#if entries.length === 0}
  <div class="px-1 w-full opacity-80 text-sm h-65 md:h-55 flex items-end justify-center text-base-content/50 scroll-smooth">
    <div> 
      No entries found.
      <ul class="list-disc list-inside mt-1">
        <li>Add new entries by clicking the <b>"+"</b> button.</li>
        <li>To Manage categories, click the "Categories" button in the <b>Menu</b>.</li>
        <li class="text-success mt-1">ID (auto-generated) and slug are <b>unique identifiers</b></li>
        <li class="text-success"><b>Import</b> uses fingerprint matching (slug prioritized)</li>
      </ul> 
    </div>
  </div>
{:else}
<div class={`grid gap-2 ${colClasses[gridCols]} md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 scroll-smooth`}>
  {#each entries as entry (entry.id)}
    <div class="relative">
      {#if selectionMode}
        <button type="button" 
          class="rounded-xl absolute inset-0 z-10 flex items-center justify-center bg-black/30 text-base-accent cursor-pointer transition-opacity"
          class:selected={selectedEntries.has(entry.id)}
          on:click={(e) => { e.stopPropagation(); toggleSelect(entry.id); }} >
          {#if selectedEntries.has(entry.id)}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-12 h-12 bg-base-300/50 rounded-xl  drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7M5 7l4 4L19 1"/></svg>
          {/if}
        </button>
      {/if}
      <button
        class="group card bg-base-100 shadow-xl cursor-pointer hover:shadow-info/30 transition-[1px] w-full h-full transition duration-150 ease-in-out hover:-translate-y-1 hover:scale-102"
        on:click={() => handleCardClick(entry.id)}>
        <figure class="relative aspect-[3/4] bg-base-300">
          {#if entry.coverImageUrl}
            <img src={entry.coverImageUrl} alt={entry.title} class="w-full h-full object-cover lozad" use:lozadAction1 />
          {:else}
            <div class="w-full h-full flex items-center justify-center text-base-content/20">
              {@html Svg.imgIcon}
            </div>
          {/if}
          {#if entry.dataType}<span class="absolute bottom-0 left-0 rounded-se-md text-[.7em] md:text-sm bg-base-200/85 px-1 py-0">{entry.dataType}</span>{/if}
        </figure>

        {#if entry.category && entry.category.trim().toLowerCase() !== "all"}
        <span class="z-11 absolute -top-[5px] right-1 rounded-full text-[.6em] w-1/2 font-semibold px-1 py-0 line-clamp-1 break-words md:text-sm bg-info text-base-300 group-hover:hidden">
          {entry.category}</span>
        {/if}
        <div class="card-body p-2">
          {#if entry.rating !== null && entry.rating > 0}
          <span class="absolute top-1 left-1 rounded-2xl text-xs md:text-sm bg-info text-base-300 px-1 py-0 font-semibold">{entry.rating}</span>
          {/if}
          <div class="card-title text-xs sm:text-sm line-clamp-2">{entry.title}</div>
        </div>
      </button>
    </div>
  {/each}
</div>
{/if}
<!-- rotate-270 origin-right -->