<script lang="ts">
  import { searchQuery, searchMode } from '$lib/stores/app.store';
  import { tick } from 'svelte';

  export let show = false;

  import { get } from 'svelte/store';
  $: {
    if (get(searchQuery)) {
      show = true;
    }
  }

  let inputValue = '';
  let inputEl: HTMLInputElement;
  type SearchMode = 'default' | 'a' | 't' | 'b' | 'c' | 'd';

  $: if (show) {
    focusInput();
  }

  async function focusInput() {
    await tick(); // wait for DOM update
    inputEl?.focus();
  }

  $: {
    const raw = inputValue.trim();
    const lower = raw.toLowerCase();

    if (lower.startsWith('a:')) {
      searchMode.set('a');
      searchQuery.set(raw.slice(2));
    } else if (lower.startsWith('t:')) {
      searchMode.set('t');
      searchQuery.set(raw.slice(2));
    } else if (lower.startsWith('b:')) {
      searchMode.set('b');
      searchQuery.set(raw.slice(2));
    } else if (lower.startsWith('c:')) {
      searchMode.set('c');
      searchQuery.set(raw.slice(2));
    } else if (lower.startsWith('d:')) {
      searchMode.set('d');
      searchQuery.set(raw.slice(2));
    } else {
      searchMode.set('default');
      searchQuery.set(raw);
    }
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
    <button class="btn btn-square btn-ghost" on:click={handleClose} aria-label="Close search">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none"
        viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
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
