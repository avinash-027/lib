<!-- src/lib/components/HomeScreen.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { dbService } from '$lib/services/db.service';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';

  import { entries, filteredEntries, selectedCategory, gridCols } from '$lib/stores/app.store';
  import { categories } from '$lib/stores/categories.store';
  import CardGrid from './CardGrid.svelte';
  import SearchBar from './SearchBar.svelte';
  import FilterSheet from './FilterSheet.svelte';
  import DrawerMenu from './DrawerMenu.svelte';
  import EditModal from './EditModal.svelte';
  import NewModal from './NewModal.svelte';
  import CategoriesModal from './CategoriesModal.svelte';
  import Themes from './Themes.svelte';
  import SelectionToolbar from '$lib/components/SelectionToolbar.svelte';

  let MainTitle = 'Lib';
  
  let showSearch = false;
  let showFilter = false;
  let showDrawer = false;
  let showEditModal = false;
  let showNewModal = false;
  let newEntryId: number | null = null;
  let editingEntryId: number | null = null;
  let showCategories = false;

  let selectedEntries: Set<number> = new Set();
  let selectionMode = false;

  const dispatch = createEventDispatcher();

  // -----------------------------
  // Grid columns for CardGrid
  // -----------------------------
  function toggleGridCols() {
    gridCols.update(c => (c === 3 ? 4 : 3));
  }

  // -----------------------------
  // Load entries and categories
  // -----------------------------
  async function loadEntries() {
    const allEntries = await dbService.getAllEntries();
    entries.set(allEntries);

    // Only update categories store with unique, non-empty, non-'All' categories
    const cats = Array.from(new Set(allEntries.map(e => e.category).filter(c => c && c !== 'All')));
    categories.set(cats);
  }

  onMount(async () => {
    await loadEntries();

    // Restore last selected category from localStorage
    const savedCategory = localStorage.getItem('selectedCategory');
    if (savedCategory) selectedCategory.set(savedCategory);
  });

  // -----------------------------
  // Entry Modals
  // -----------------------------
  function openAddNew() {
    newEntryId = null;
    showNewModal = true;
    selectionMode = false;
  }

  async function handleNewSave() {
    showNewModal = false;
    newEntryId = null;
    await loadEntries();
  }

  function handleNewCancel() {
    showNewModal = false;
    newEntryId = null;
  }

  function openEdit(id: number) {
    editingEntryId = id;
    showEditModal = true;
  }

  function openDetail(id: number) {
    window.location.href = `/detail/${id}`;
  }

  async function handleSave() {
    showEditModal = false;
    editingEntryId = null;
    await loadEntries();
  }

  function handleCancel() {
    showEditModal = false;
    editingEntryId = null;
  }

  // -----------------------------
  // Import / Export
  // -----------------------------
  async function handleImport(jsonData: any[]) {
    await dbService.importFromJSON(jsonData);
    await loadEntries();
    showDrawer = false;
  }

  async function handleExport() {
    const data = await dbService.exportToJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lib-export-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showDrawer = false;
  }

  // -----------------------------
  // Category management
  // -----------------------------
  async function handleCategoryDelete(category: string) {
    await dbService.moveCategoryToAll(category);

    if ($selectedCategory === category) {
      selectedCategory.set('All');
    }

    await loadEntries();
    showCategories = false;
  }

  // -----------------------------
  // Selection Mode
  // -----------------------------
  let showCategoryDropdown = false;
  // Use the store instead in the template
  $: categoryList = $categories.filter(c => c !== 'All');

  async function moveSelectedToCategory(category: string) {
    for (const id of selectedEntries) {
      const entry = $entries.find(e => e.id === id);
      if (!entry) continue;
      await dbService.updateEntry(id, { category });
    }
    // Reload entries and reset selection
    // Clear selection
    selectedEntries.clear();
    selectedEntries = new Set(selectedEntries); // trigger reactivity
    selectionMode = false;
    const allEntries = await dbService.getAllEntries();
    entries.set(allEntries);
    showCategoryDropdown = false;
  }
  
  function handleToggleSelect(id: number) {
    if (selectedEntries.has(id)) {
      selectedEntries.delete(id);
    } else {
      selectedEntries.add(id);
    }
    selectedEntries = new Set(selectedEntries); // trigger reactivity
  }

  async function deleteSelected() {
    if (selectedEntries.size === 0) return;
    const ids = Array.from(selectedEntries);
    for (const id of ids) {
      await dbService.deleteEntry(id);
    }
    selectedEntries.clear();
    selectedEntries = new Set(selectedEntries); // trigger reactivity
    await loadEntries();
    selectionMode = false;
  }

  function selectAll() {
    selectedEntries = new Set($filteredEntries.map(e => e.id));
  }

  function deselectAll() {
    selectedEntries.clear();
    selectedEntries = new Set(selectedEntries); // trigger reactivity
  }
</script>

<!-- -----------------------------
UI Layout
------------------------------ -->
<div class="flex h-screen flex-col">
  <!-- Navbar -->
  <div class="navbar bg-base-100 shadow-lg">
    <div class="flex-none">
      <button class="btn btn-square btn-ghost" aria-label="Open menu" on:click={() => showDrawer = true}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-5 w-5 stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
    <div class="flex-1"><span class="text-xl font-bold">{MainTitle} ({$entries.length})</span></div>
    <div class="flex-none">
      <button class="btn btn-square btn-ghost" aria-label="Toggle search"
        on:click={() => { 
          showSearch = !showSearch;
          selectionMode = false;
          }} >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-5 w-5 stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </button>
      <button class="btn btn-square btn-ghost" aria-label="Open filters" 
        on:click={() => { 
          showFilter = !showFilter;
          selectionMode = false;
          }} >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-5 w-5 stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
        </svg>
      </button>
      <button class="btn btn-square btn-ghost" 
        on:click={() => {
          if (selectionMode) {
            selectedEntries.clear();
            selectedEntries = new Set(selectedEntries); // trigger reactivity
            showCategoryDropdown = false;
          }
          selectionMode = !selectionMode; 
        }} 
        aria-label="Select entries">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-5 w-5 stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M3 12a9 9 0 1118 0 9 9 0 01-18 0z"/>
        </svg>
      </button>
      <button
        class="btn btn-square btn-ghost inline-block md:hidden" on:click={toggleGridCols} aria-label="Toggle grid columns" title="Toggle grid columns">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-5 w-5 stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h6v6H4V4zm0 10h6v6H4v-6zm10-10h6v6h-6V4zm0 10h6v6h-6v-6z"/>
        </svg>
      </button>
      <!-- Bottom Themes button -->
      <Themes dropdownDirection="dropdown-bottom dropdown-end"/>
    </div>
  </div>

  <!-- Search Bar -->
  {#if showSearch}
    <SearchBar bind:show={showSearch} />
  {/if}

  <!-- Category Tabs -->
  <div class="tabs tabs-border flex-nowrap gap-1 overflow-x-auto bg-base-200 px-2 pt-2 pb-1 scrollbar-hide">
    <button class="tab relative" class:tab-active={$selectedCategory === 'All'} on:click={() => selectedCategory.set('All')} >
      <div class="z-10">All</div>
      <span class="bg-base-100 text-xs rounded-3xl px-1.5 py-0.5">{$entries.length}</span>
    </button>

    {#each categoryList as cat}
      <button class="tab" class:tab-active={$selectedCategory === cat} on:click={() => selectedCategory.set(cat)} >
        <div class="indicator">
          <span class="indicator-item bg-base-100 text-xs rounded-3xl px-1.5 py-0.5">{$entries.filter(e => e.category === cat).length}</span>
          <div class="z-10">{cat}</div>
        </div>
      </button>
    {/each}
  </div>

  <!-- Add Entry Button -->
  <button class="z-100 btn fixed right-6 bottom-6 btn-circle shadow-xl btn-lg btn-primary" on:click={openAddNew} aria-label="Add new entry">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-6 w-6 stroke-current">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>

  <!-- Selection Toolbar -->
  {#if selectionMode}
    <SelectionToolbar
      selectedCount={selectedEntries.size}
      {categoryList}
      {showCategoryDropdown}

      on:delete={deleteSelected}
      on:selectAll={selectAll}
      on:deselectAll={deselectAll}
      on:toggleCategoryDropdown={() =>
        showCategoryDropdown = !showCategoryDropdown
      }
      on:moveCategory={(e) => moveSelectedToCategory(e.detail)}
      on:cancel={() => {
        selectionMode = false;
        showCategoryDropdown = false;
        selectedEntries.clear();
        selectedEntries = new Set(selectedEntries);
      }}
    />
  {/if}
    
  <!-- Card Grid -->
  <!-- on:cardClick={(e) => openDetail(e.detail)} -->
  <!-- on:cardClick={(e) => goto(`/detail/${e.detail}`)}  -->
  <div class="flex-1 overflow-auto p-4">
    <CardGrid
      entries={$filteredEntries}
      {selectionMode}
      {selectedEntries}
      gridCols={$gridCols}
      on:toggleSelect={(e) => handleToggleSelect(e.detail)}
    />
  </div>
</div>

<!-- Modals -->

{#if showFilter}
  <FilterSheet bind:show={showFilter} />
{/if}

{#if showDrawer}
  <DrawerMenu
    bind:show={showDrawer}
    on:import={(e) => handleImport(e.detail)}
    on:export={handleExport}
    on:showCategories={() => {
      showDrawer = false;
      showCategories = true;
    }}
  />
{/if}

{#if showCategories}
  <CategoriesModal
    show={showCategories}
    on:close={() => showCategories = false}
    on:rename={(e) => dispatch('renameCategory', e.detail)}
    on:delete={(e) => handleCategoryDelete(e.detail)}/>
{/if}

{#if showEditModal}
  <EditModal entryId={editingEntryId} on:save={handleSave} on:cancel={handleCancel} />
{/if}

{#if showNewModal}
  <NewModal entryId={newEntryId} on:save={handleNewSave} on:cancel={handleNewCancel} />
{/if}
