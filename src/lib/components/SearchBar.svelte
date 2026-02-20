<script lang="ts">
	import { Svg } from '$lib';
  import { searchQuery, searchMode } from '$lib/stores/app.store';
  import { tick } from 'svelte';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  export let show = false;

  let inputValue = '';
  let inputEl: HTMLInputElement;
  type SearchMode = 'default' | 'a' | 't' | 'b' | 'c' | 'd';

  let initialized = false;

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

  // 4. Update the store ONLY after initialization
  $: if (initialized) {
    const raw = inputValue.trim();
    const lower = raw.toLowerCase();

    // Your existing logic...
    if (lower.startsWith('a:')) {
      searchMode.set('a');
      searchQuery.set(raw.slice(2));
    } else if (lower.startsWith('t:')) {
      searchMode.set('t');
      searchQuery.set(raw.slice(2));
    } 
    // ... add your other else ifs ...
    else {
      searchMode.set('default');
      searchQuery.set(raw);
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
</script>

<div class="bg-base-200 px-4 pt-3 pb-1 shadow-lg">
  <div class="flex gap-2 items-center">
    <input
      bind:this={inputEl}
      type="text"
      placeholder="Search ('a:' altTitles, 't:' tags, 'b:' badges, 'c:' characters, 'd:' dataType)"
      class="input input-bordered flex-1"
      bind:value={inputValue}
    />
    <button class="btn px-[10px] btn-secondary btn-soft rounded-full" on:click={handleClose} aria-label="Close search">{@html Svg.closeCross}</button>
  </div>
  {#if $searchMode !== 'default'}
    <div class="text-xs text-info mt-2">
      Searching in:
      {#if $searchMode === 'a'} alternative titles <br>('a:' altTitles, 't:' tags, 'b:' badges, 'c:' characters, 'd:' dataType){/if}
      {#if $searchMode === 't'} tags <br>('a:' altTitles, 't:' tags, 'b:' badges, 'c:' characters, 'd:' dataType){/if}
      {#if $searchMode === 'b'} badges <br>('a:' altTitles, 't:' tags, 'b:' badges, 'c:' characters, 'd:' dataType){/if}
      {#if $searchMode === 'c'} characters <br>('a:' altTitles, 't:' tags, 'b:' badges, 'c:' characters, 'd:' dataType){/if}
    </div>
  {/if}
</div>
