<!-- src/lib/components/HomeScreen.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { dbService, entryFingerprint } from '$lib/services/db.service';
  import { searchQuery } from '$lib/stores/app.store';
  import { goto } from '$app/navigation';
  import { Svg } from '$lib/index';
  import { tick } from 'svelte';
  
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

  let showSearch = false;
  $: if ($searchQuery.trim().length > 0) {
    showSearch = true;
  }

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

    const savedCategory = localStorage.getItem('selectedCategory');
    if (savedCategory) {
      selectedCategory.set(savedCategory);
    }

    await tick();
    scrollActiveTabIntoView();
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
    goto(`/detail/${id}`);
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

  let importing = false;
  async function handleImport(jsonData: any[]) {
    importing = true;

    await dbService.importFromJSON(jsonData);
    await loadEntries();

    importing = false;
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
  // $: categoryList = $categories.filter(c => c !== 'All');
  // safe fallback if $categories isn’t an array yet
  $: categoryList = Array.isArray($categories) ? $categories.filter(c => c !== 'All') : [];

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

  // Add loading state
  let deleting = false;
  async function deleteSelected() {
    if (selectedEntries.size === 0) return;

    deleting = true; // 🔥 show loader

    const ids = Array.from(selectedEntries);
    for (const id of ids) {
      await dbService.deleteEntry(id);
    }

    selectedEntries.clear();
    selectedEntries = new Set(selectedEntries); // trigger reactivity
    await loadEntries();
    selectionMode = false;
    deleting = false; // 🔥 hide loader
  }

  function selectAll() {
    selectedEntries = new Set($filteredEntries.map(e => e.id));
  }

  function deselectAll() {
    selectedEntries.clear();
    selectedEntries = new Set(selectedEntries); // trigger reactivity
  }

  // Swipe Categories
  // const allCats = ['All', ...categoryList];
  // derive allCats reactively
  $: allCats = ['All', ...categoryList];

  // scroll when both selectedCategory AND categoryList are ready
  $: if ($selectedCategory && categoryList.length > 0) {
    tick().then(() => {
      const tab = document.querySelector('.tab.tab-active');
      if (tab) {
        tab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    });
  }

  async function scrollActiveTabIntoView() {
    // let the DOM update first
    await tick();

    const tab = document.querySelector('.tab.tab-active');
    if (tab) {
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  }

  function goToNextCategory() {
    const idx = allCats.indexOf($selectedCategory);
    const next = allCats[(idx + 1) % allCats.length];
    selectedCategory.set(next);
    // scrollActiveTabIntoView();
  }

  function goToPrevCategory() {
    const idx = allCats.indexOf($selectedCategory);
    const prev = allCats[(idx - 1 + allCats.length) % allCats.length];
    selectedCategory.set(prev);
    // scrollActiveTabIntoView();
  }

  import { afterNavigate } from '$app/navigation';

  // -----------------------------
  // Save scroll position
  // ----------------------------- 
  let scrollContainer: HTMLDivElement;
  let savedScroll = 0;

  function saveScroll() {
    savedScroll = scrollContainer?.scrollTop || 0;
    sessionStorage.setItem('home-scroll', String(savedScroll));
  }

  afterNavigate(() => {
    const saved = sessionStorage.getItem('home-scroll');
    if (saved && scrollContainer) {
      scrollContainer.scrollTop = Number(saved);
    }
  });
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
      <div class="tooltip-bottom tooltip" data-tip="Open filters">
      <button class="btn btn-square btn-ghost hidden sm:inline-block" aria-label="Open filters" 
        on:click={() => { 
          showFilter = !showFilter;
          selectionMode = false;
          }} >
        {@html Svg.filter}
      </button>
      </div>
      <div class="tooltip-bottom tooltip" data-tip="Select entries">
      <button class="btn btn-square btn-ghost hidden sm:inline-block" 
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
      <button class="btn btn-square btn-ghost inline-block md:hidden" 
        on:click={toggleGridCols} aria-label="Toggle grid columns" title="Toggle grid columns">
        {@html Svg.toggleGrid}
      </button>
      <!-- Bottom Themes button -->
      <Themes dropdownDirection="dropdown-bottom dropdown-end"/>

      <div class="dropdown dropdown-end inline-block sm:hidden">
        <button class="btn btn-square btn-ghost" aria-label="More options" tabindex="0"
          >{@html Svg.dots3}</button
        >
        <ul tabindex="0" class="dropdown-content menu w-44 rounded-box bg-base-100 p-2 shadow">
          <li>
            <button
              on:click={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                showFilter = !showFilter;
              }}>{@html Svg.filter}Filters</button
            >
          </li>
          <li>
            <button
              on:click={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                if (selectionMode) {
                  selectedEntries.clear();
                  selectedEntries = new Set(selectedEntries); // trigger reactivity
                  showCategoryDropdown = false;
                }
                selectionMode = !selectionMode;
              }}
              aria-label="Select entries"
            >
              {@html Svg.select}Select Entries
            </button>
          </li>
          <li>
            <button
              class="inline-block md:hidden"
              on:click={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                toggleGridCols();
              }}
              aria-label="Toggle grid columns">{@html Svg.toggleGrid} ToggleGrid</button
            >
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Search Bar -->
  {#if showSearch}
    <SearchBar bind:show={showSearch} />
  {/if}

  <!-- Category Tabs -->
  <div class="tabs tabs-border flex-nowrap gap-3 overflow-x-auto bg-base-200 px-2 pt-2 pb-1 scrollbar-hide">
    <button class="p-0 m-0" title="Toggle unique entries" aria-label="Show unique entries only"
      on:click={() => showUniqueOnly = !showUniqueOnly}>
      {#if showUniqueOnly}
        <!-- Filled / active duplicate filter icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" stroke="currentColor" stroke-width="2" />
          <path d="M3 3h18v18H3zM15 9l-6 6m0-6l6 6"/>
        </svg><span class="text-sm">{displayedEntries.length}</span>
      {:else}
        <!-- Outline / inactive duplicate filter icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4V4z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8" />
        </svg>
      {/if}
    </button>
    <button class="tab relative" class:tab-active={$selectedCategory === 'All'} on:click={() => selectedCategory.set('All')} >
      <div class="z-10">All</div>
      <span class="bg-base-100 text-xs rounded-3xl px-1.5 py-0.5">{$entries.length}</span>
    </button>

    {#each categoryList as cat}
      <button class="tab" class:tab-active={$selectedCategory === cat} on:click={() => {
        selectedCategory.set(cat);scrollActiveTabIntoView();
      }} >
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
  <div bind:this={scrollContainer} class="flex-1 overflow-auto py-4 px-1 sm:px-2 pt-2.5">
    {#if deleting}
      <div class="flex items-center justify-center bg-base-300 rounded-xl m-2">
        <span class="loading loading-dots loading-sm text-primary"></span>
        <span class="loading loading-ring loading-sm text-primary"></span>
        <span class="loading loading-dots loading-sm text-primary"></span>
      </div>
    {/if}
    {#if importing}
      <div class="flex items-center justify-center bg-base-300 rounded-xl m-2"><span class="loading loading-bars loading-sm text-primary"></span></div>
    {/if}
    <CardGrid
      entries={displayedEntries}
      {selectionMode}
      {selectedEntries}
      gridCols={$gridCols}
      selectedCat={$selectedCategory}
      on:cardClick={(e) => {saveScroll();goto(`/detail/${e.detail}`);}}
      on:toggleSelect={(e) => handleToggleSelect(e.detail)}
      goToNextCategory={goToNextCategory}
      goToPrevCategory={goToPrevCategory}
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
    {importing}
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
