<script lang="ts">
	import { Svg } from '$lib';
  import { searchQuery, searchMode } from '$lib/stores/app.store';
  import { get } from 'svelte/store';
  import { tick } from 'svelte';
  import { onMount } from 'svelte';

  export let show = false;

  let inputValue = '';
  let inputEl: HTMLInputElement;
  // Only these modes are allowed
  type SearchMode = 'default' | 'b' | 'c' | 'd';

  let initialized = false;
  
  import { filteredEntries } from '$lib/stores/app.store';

  let matchedCount = 0;

  // Subscribe reactively
  $: filteredEntries.subscribe(entries => {
    matchedCount = entries.length;
  });

  onMount(async () => {
    // 1. Get current values from the store
    const currentQuery = $searchQuery;
    const currentMode = $searchMode;
    if (currentQuery) {
      show = true;
      // 2. Set local value first
      inputValue = currentMode !== 'default' ? `${currentMode}:${currentQuery}` : currentQuery;
    }
    // 3. Wait for the DOM to catch up
    await tick();
    initialized = true; 
  });

  $: {
    if (get(searchQuery)) {
      show = true;
    }
  }

  // Ensure focus works when show changes
  $: if (show && inputEl) {
     tick().then(() => inputEl.focus());
  }

  // Update store only after initialization
  $: if (initialized) {
    const raw = inputValue.trim().toLowerCase();

    if (raw.startsWith('b:')) {
      searchMode.set('b');
      searchQuery.set(inputValue.slice(2).trim());
    } else if (raw.startsWith('d:')) {
      searchMode.set('d');
      searchQuery.set(inputValue.slice(2).trim());
    } else if (raw.startsWith('c:')) {
      searchMode.set('c');
      searchQuery.set(inputValue.slice(2).trim());
    } else {
      searchMode.set('default');
      searchQuery.set(inputValue.trim());
    }
  }

  async function focusInput() {
    await tick(); // wait for DOM update
    inputEl?.focus();
  }

  function handleClose() {
    inputValue = '';
    searchQuery.set('');
    searchMode.set('default');
    show = false;
  }
  function handleClear() {
    inputValue = '';
    // focusInput()
    tick().then(() => inputEl.focus());
  }
</script>

<div class="bg-base-200 px-4 pt-3 pb-1 shadow-lg">
  <div class="flex gap-2 items-center">
    <input
      bind:this={inputEl}
      type="text"
      placeholder="Search ('b:' badges, 'd:' dataType(lib, md, db), 'c:' category)"
      class="input input-bordered flex-1"
      bind:value={inputValue}
    />
    {#if inputValue?.trim()}
      <!-- Clear text only -->
      <button class="btn px-[10px] btn-outline text-bg-accent rounded-full" on:click={handleClear} aria-label="Clear search" >
        {@html Svg.cleanSvg}
      </button>
    {:else}
      <!-- Close/hide search -->
      <button class="btn px-[10px] btn-outline text-bg-accent rounded-full" on:click={handleClose} aria-label="Close search" >
        {@html Svg.closeCross}
      </button>
    {/if}
  </div>
  {#if inputValue?.trim()}
    <div class="text-xs text-warning mt-2">Items matched: {matchedCount}</div>
  {/if}
  {#if $searchMode !== 'default'}
    <div class="text-xs text-info mt-2">
      Searching in:
      {#if $searchMode === 'b'} badges <br>('b:' badges, 'd:' dataType(lib, md, db), 'c:' category){/if}
      {#if $searchMode === 'c'} characters <br>('b:' badges, 'd:' dataType(lib, md, db), 'c:' category){/if}
      {#if $searchMode === 'd'} badges <br>('b:' badges, 'd:' dataType(lib, md, db), 'c:' category){/if}
    </div>
  {/if}
</div>
