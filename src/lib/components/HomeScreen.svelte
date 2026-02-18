<!-- src/lib/components/HomeScreen.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { dbService, entryFingerprint } from '$lib/services/db.service';
  import { goto } from '$app/navigation';
  import { Svg } from '$lib/index';

  import { entries, filteredEntries, selectedCategory, gridCols } from '$lib/stores/app.store';
  import { categories } from '$lib/stores/categories.store';
  import { restoreAutoBackup } from '$lib/services/autoBackup.service';

  import CardGrid from './CardGrid.svelte';
  import SearchBar from './SearchBar.svelte';
  import FilterSheet from './FilterSheet.svelte';
  import DrawerMenu from './DrawerMenu.svelte';
  import EditModal from './EditModal.svelte';
  import NewModal from './NewModal.svelte';
  import CategoriesModal from './CategoriesModal.svelte';
  import Themes from './Themes.svelte';
  import SelectionToolbar from '$lib/components/SelectionToolbar.svelte';
  import Alert from './Alert.svelte';

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

  // showUniqueOnly 
  let showUniqueOnly = false;

  $: displayedEntries = showUniqueOnly
      ? Array.from(new Map($filteredEntries.map(e => [entryFingerprint(e), e])).values())
      : $filteredEntries;

  // Alert
  let alertMessage = '';
  let showAlert = false;

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
    categories.load();
  }

  onMount(async () => {
    await loadEntries();

    restoreAutoBackup();

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

  let alertTimer: number;
  function showToast(message: string) {
    alertMessage = message;
    showAlert = true;

    clearTimeout(alertTimer);
    alertTimer = window.setTimeout(() => {
      showAlert = false;
    }, 1500);
  }

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
    showToast('Exported to JSON 👍 :Downloads/');
  }

  async function handleExportMd() {
    const md = await dbService.exportToMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lib-export-${new Date().toISOString()}.md`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showDrawer = false;
    showToast('Exported to Markdown 👍 :Downloads/');
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

<style>
  @media (max-width: 320px) {
    .hide-on-320 {
      display: none;
    }
  }
</style>

<!-- -----------------------------
UI Layout
------------------------------ -->
<div class="flex h-screen flex-col">
  <!-- Navbar -->
  <div class="navbar bg-base-100 shadow-lg">
    <div class="flex-none">
      <button class="btn btn-square btn-ghost" aria-label="Open menu" on:click={() => showDrawer = true}>
        {@html Svg.menu}
      </button>
    </div>
    <div class="flex-1"><span class="text-md md:text-xl font-bold">{MainTitle} <span class="hide-on-320">({$entries.length})</span></span></div>
    <div class="flex-none">
      <button class="btn btn-square btn-ghost" aria-label="Toggle search"
        on:click={() => { 
          showSearch = !showSearch;
          selectionMode = false;
          }} >
        {@html Svg.search}
      </button>
      <div class="tooltip tooltip-bottom" data-tip="Open filters">
      <button class="btn btn-square btn-ghost" aria-label="Open filters" 
        on:click={() => { 
          showFilter = !showFilter;
          selectionMode = false;
          }} >
        {@html Svg.filter}
      </button>
      </div>
      <div class="tooltip tooltip-bottom" data-tip="Select entries">
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
        {@html Svg.select}
      </button>
      </div>
      <button
        class="btn btn-square btn-ghost inline-block md:hidden" on:click={toggleGridCols} aria-label="Toggle grid columns" title="Toggle grid columns">
        {@html Svg.toggleGrid}
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
    <button class="p-0 m-0" title="Toggle unique entries" aria-label="Show unique entries only"
      on:click={() => showUniqueOnly = !showUniqueOnly}>
      {#if showUniqueOnly}
        <!-- Filled / active duplicate filter icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4V4z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8" />
        </svg>
      {:else}
        <!-- Outline / inactive duplicate filter icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" stroke="currentColor" stroke-width="2" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8" />
        </svg>
      {/if}
    </button>
    <button class="tab relative" class:tab-active={$selectedCategory === 'All'} on:click={() => selectedCategory.set('All')} >
      <div class="z-10">All</div>
      <span class="bg-base-100 text-xs rounded-3xl px-1.5 py-0.5">{$entries.length}</span>
    </button>

    {#each categoryList as cat}
      <button class="tab" class:tab-active={$selectedCategory === cat} on:click={() => selectedCategory.set(cat)} >
        <div class="indicator">
          <span class="indicator-item bg-base-100 text-xs rounded-3xl px-1.5 py-0.5 -top-1">{$entries.filter(e => e.category === cat).length}</span>
          <div class="z-10">{cat}</div>
        </div>
      </button>
    {/each}
 
  </div>

  <!-- Add Entry Button -->
  <button class="z-100 btn fixed right-6 bottom-6 btn-circle shadow-xl btn-lg btn-primary" on:click={openAddNew} aria-label="Add new entry">
    {@html Svg.add}
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
      entries={displayedEntries}
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
    on:exportMd={handleExportMd}
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

<Alert {showAlert} message={alertMessage} />
