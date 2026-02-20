<!-- src\routes\detail\[id]\+page.svelte -->
<script lang="ts">
  import { base } from '$app/paths';

  import { marked } from 'marked';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { copyOn } from '$lib/services/copyOn';
  
  import { page } from '$app/stores';
  import { dbService } from '$lib/services/db.service';
  import type { LData, ChapterRow, Character } from '$lib/types/ldata';
  import EditModal from '$lib/components/EditModal.svelte';
  import { theme } from '$lib/stores/theme.store';
  import { RatingLevel, type Rating } from '$lib/index';
  import { Svg } from '$lib/index';

  let entry: LData | null = null;
  let showEditModal = false;
  let entryId: number;

  let showImagePreview = false;
  
  let rating = 0; // 0–10 scale

  // -----------------------------
  // Track which character is currently expanded
  let expandedCharacter: string | null = null;

  function toggleCharacter(name: string) {
      expandedCharacter = expandedCharacter === name ? null : name;
  }

  // -----------------------------
  // Sorted characters
  // Define priority roles
  const mainRoles = ['main', 'lead', 'mc', 'fmc', 'protagonist'];

  // Sorted characters array
  // $: sortedCharacters = entry?.characters
  //   ? [...entry.characters].sort((a, b) => {
  //       const aPriority = mainRoles.includes(a.role.toLowerCase()) ? 0 : 1;
  //       const bPriority = mainRoles.includes(b.role.toLowerCase()) ? 0 : 1;
  //       // if both same priority, keep original order
  //       return aPriority - bPriority;
  //     })
  //   : [];
$: sortedCharacters = (entry?.characters ?? [])
  .slice() // Create a shallow copy to avoid mutating the store/prop
  .sort((a, b) => {
    // 1. Safe access to roles with fallbacks to empty strings
    const roleA = (a?.role ?? '').toLowerCase();
    const roleB = (b?.role ?? '').toLowerCase();

    // 2. Determine priority (0 for main roles, 1 for others)
    // Uses optional chaining on mainRoles just in case it's not loaded
    const aPriority = mainRoles?.includes(roleA) ? 0 : 1;
    const bPriority = mainRoles?.includes(roleB) ? 0 : 1;

    // 3. Sort by priority
    return aPriority - bPriority;
  });
  
  // -----------------------------
  // open modal by section
  type Section = 'All' | 'characters' | 'chapters' | 'description' | 'category' | '1chapters1' | '1characters1';
  let editSection: Section = 'All';

  function openEdit(section: Section = 'All') {
    editSection = section;
    showEditModal = true;
  }

  // function openEdit() {
  //   showEditModal = true;
  // }

  onMount(async () => {
    entryId = parseInt($page.params.id);
    await loadEntry();
    await dbService.markAsOpened(entryId);
  });

  async function loadEntry() {
    entry = await dbService.getEntryById(entryId);
    // Initialize rating from entry
    rating = entry?.rating ?? 0;
  }
  async function updateRating(newRating: number) {
    if (!entryId) return;

    rating = newRating;
    await dbService.updateEntryPartial(entryId, { rating });

    if (entry) entry.rating = rating;
  }
  function goBack() {
    history.length > 1 ? window.history.back() : goto('/'); // fallback if no history
  }

  async function handleSave() {
    showEditModal = false;
    await loadEntry();
  }
  function handleCancel() {
    showEditModal = false;
  }

  let showDeleteModal = false;

  function handleDelete() {
    showDeleteModal = true;
  }
  async function confirmDelete() {
    await dbService.deleteEntry(entryId);
    showDeleteModal = false;
    goBack();
  }
  function cancelDelete() {
    showDeleteModal = false;
  }
  // async function handleDelete() {
  //   if (confirm('Are you sure you want to delete this entry?')) {
  //     await dbService.deleteEntry(entryId);
  //     goBack();
  //   }
  // }

  // -----------------------------
  // Markdown description → rendered HTML description
  // -----------------------------
  $: descriptionHtml = entry?.description ? marked.parse(entry.description) : '';
  function md(text: string) {
    return marked.parse(text);
  }
  // Use inline Markdown only: That means: **bold**, *italic*, `code`, links
  function mdInline(text: string) {
    return marked.parseInline(text);
  }

  // Sort rows 
  function chapterSort(a: string, b: string) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);

    const isNumA = !isNaN(numA);
    const isNumB = !isNaN(numB);

    // 1️⃣ numbers come before letters
    if (isNumA && !isNumB) return -1;
    if (!isNumA && isNumB) return 1;

    // 2️⃣ both numbers → numeric sort
    if (isNumA && isNumB) return numA - numB;

    // 3️⃣ both strings → alphabetical sort
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
  $: sortedRows = (entry?.rows ?? []).slice().sort(
    (a, b) => chapterSort(a.chapterSE, b.chapterSE)
  );

  // -----------------------------
  // date time
  function fmt(date?: string | null) {
    if (!date) return null;
    return new Date(date).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  // Add + Button In Details Page
  type EditableRow = ChapterRow & { 
    _tagsText: string;
    _originalChapterSE?: string;  // optional, because new rows won’t have it
  };
  type EditableCharacter = Character & { 
    _tagsString: string;
    _alternativeNamesString: string;
    _originalName?: string;  // optional,because new ones won’t have it
  };

  let selectedChapter: EditableRow | null = null;
  let selectedCharacter: EditableCharacter | null = null;

  function openNewChapter() {
    selectedChapter = {
      chapterSE: '',
      description: '',
      characters: '',
      tags: [],
      _tagsText: ''
    };

    editSection = '1chapters1';
    showEditModal = true;
  }
  function openSingleChapter(row: ChapterRow) {
    selectedChapter = {
      ...structuredClone(row),
      _tagsText: (row.tags ?? []).join(', '),
      _originalChapterSE: row.chapterSE  // <<< track original
    };

    editSection = '1chapters1';
    showEditModal = true;
  }
  function openNewCharacter() {
    selectedCharacter = {
      name: '',
      role: '',
      image: '',
      description: '',
      tags: [],
      _tagsString: '',
      alternativeNames: [],
      _alternativeNamesString: ''
    };

    editSection = '1characters1';
    showEditModal = true;
  }
  function openSingleCharacter(char: Character) {
    selectedCharacter = {
      ...structuredClone(char),
      _alternativeNamesString: (char.alternativeNames ?? []).join(', '),
      _tagsString: (char.tags ?? []).join(', '),
      _originalName: char.name // <<< track original
    };

    editSection = '1characters1';
    showEditModal = true;
  }
  async function removeCharacter(remChar: Character) {
    if (!entry || !entryId) return;

    const updatedCharacters = entry.characters.filter(
      (char) => char !== remChar
    );
    // Update DB
    await dbService.updateEntryPartial(entryId, {
      characters: updatedCharacters
    });
    // Update local state
    entry = { ...entry, characters: updatedCharacters };
    expandedCharacter = null;
  }
  let chapterDeleteMode = false;
  function removeChapters() {
    chapterDeleteMode = !chapterDeleteMode;
  }
  async function removeSingleChapter(chapterSE: string) {
    if (!entry || !entryId) return;
    // const confirmed = confirm(`Delete chapter "${chapterSE}"?`);
    // if (!confirmed) return;

    const updatedRows = entry.rows.filter(
      (row) => row.chapterSE !== chapterSE
    );
    await dbService.updateEntryPartial(entryId, {
      rows: updatedRows
    });
    entry = {
      ...entry,
      rows: updatedRows
    };
    if (updatedRows.length == 0) {chapterDeleteMode = false}
  }

  let chapterContainer: HTMLElement | null = null;

  import { onDestroy } from 'svelte';

  function handleClickOutside(event: MouseEvent) {
    if (!chapterDeleteMode) return;
    if (!chapterContainer) return;

    if (!chapterContainer.contains(event.target as Node)) {
      chapterDeleteMode = false;
    }
  }

  onMount(() => {
    window.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    window.removeEventListener('click', handleClickOutside);
  });
</script>
<svelte:head>
  <title>
    {entry?.title
      ? `${entry.title.split(' ').slice(0, 2).join(' ')}... - ${(entry.dataType || "")}`
      : 'Loading... - lib'}
  </title>
</svelte:head>

{#if showDeleteModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
    <div class="bg-base-100 rounded-lg p-4 m-4 shadow-lg w-96">
      <h3 class="text-lg font-bold mb-4">Confirm Delete</h3>
      <p class="mb-6">Are you sure you want to delete this entry?</p>
      <div class="flex justify-end gap-2">
        <button class="btn btn-soft" on:click={cancelDelete}>Cancel</button>
        <button class="btn btn-error" on:click={confirmDelete}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<div class="min-h-screen bg-base-200">
  <!-- Navbar -->
  <div class="sticky top-0 z-50 navbar bg-base-100 shadow-lg">
    <div class="flex-none">
      <!-- <a href="{base}/" class="btn btn-ghost">🏠</a> -->
      <!-- <a class="btn btn-square btn-ghost" aria-label="Go back" on:click={goBack}> -->
      <a href="{base}/" class="btn btn-square btn-ghost" aria-label="Go back">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current" >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </a>
    </div>
    <div class="flex-1">
      <span class="text-xl font-bold">Details</span>
    </div>
    <div class="flex-none gap-2">
      <button class="btn btn-square btn-ghost" aria-label="Edit" on:click={() => openEdit('All')}>
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current" >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button class="btn btn-square btn-ghost text-error" aria-label="Delete" on:click={handleDelete}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current" >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
  
  {#if showImagePreview && entry && entry.coverImageUrl}
    <div class="fixed inset-0 bg-base-100/69 flex items-center justify-center z-50 p-4" on:click={() => (showImagePreview = false)} >
      <img src={entry.coverImageUrl} alt={entry.title} class="max-h-full max-w-full rounded-lg shadow-2xl" on:click|stopPropagation />
      <button class="absolute bottom-5 right-5 btn btn-circle btn-md btn-ghost text-white bg-base-300" on:click={() => (showImagePreview = false)} >✕</button>
    </div>
  {/if}

  {#if entry}
    <div class="container scroll-smooth mx-auto p-2 md:p-4 max-w-4xl space-y-2 md:space-y-6">
      <!-- General -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4 md:p-6">
          <div class="flex flex-row md:flex-row gap-3 md:gap-5">
            <div class="flex-shrink-0">
              {#if entry.coverImageUrl}
                <img src={entry.coverImageUrl} alt={entry.title} class="w-31 h-46 md:w-35 md:h-55 object-cover rounded-lg" 
                    on:click={() => (showImagePreview = true)}/>
              {:else}
                <div class="w-34 h-50 bg-base-300 rounded-lg flex items-center justify-center text-base-content/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-16 h-16 stroke-current" >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              {/if}
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <h1 use:copyOn={entry?.title} class="text-2xl font-bold mb-2 whitespace-pre-wrap break-words" title="Title">{entry.title}</h1>

              {#if entry.slug}
              <p use:copyOn={entry.slug} class="text-sm text-base-content/70 mb-2 whitespace-pre-wrap break-words hidden md:inline-block">{entry.slug}</p>
              {/if} 

              {#if (entry.alternativeTitles ?? []).length > 0}
              <p use:copyOn={entry.alternativeTitles.join(', ')} class="text-sm text-base-content/70 mb-2 whitespace-pre-wrap break-words hidden md:inline-block">
                {entry.alternativeTitles.join(', ')}
              </p>
              {/if} 

              {#if (entry.badges ?? []).length > 0}
                <div class="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4" title="badges">
                  {#each entry.badges as badge}
                    <span use:copyOn={badge} class="badge badge-primary badge-sm md:badge-md">{badge}</span>
                  {/each}
                </div>
              {/if}

              <div class="flex flex-wrap gap-1.5 md:gap-2 mt-2">
                {#if entry.category}
                <button class="btn badge-soft badge-outline badge-sm md:badge-md block break-all whitespace-normal line-clamp-2" title="category" on:click={() => openEdit('category')}>{entry.category}</button>
                {/if}
                {#if entry.dataType}
                <div class="badge badge-dash badge-sm md:badge-md" title="dataType">{entry.dataType}</div>
                {/if}
                {#if entry.rating}
                <span class="text-xm badge badge-sm badge-ghost gap-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" class="w-3 h-3 stroke-current fill-base-content"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.122 6.53a1 1 0 00.95.69h6.866c.969 0 1.371 1.24.588 1.81l-5.556 4.04a1 1 0 00-.364 1.118l2.122 6.53c.3.921-.755 1.688-1.54 1.118l-5.556-4.04a1 1 0 00-1.176 0l-5.556 4.04c-.784.57-1.838-.197-1.539-1.118l2.122-6.53a1 1 0 00-.364-1.118L.47 11.957c-.783-.57-.38-1.81.588-1.81h6.866a1 1 0 00.95-.69l2.122-6.53z"/></svg>
                  {RatingLevel[rating]}
                </span>
                {/if}
              </div>

              <!-- Rating -->
              {#if entry.rating}
                <div>
                  <div class="rating rating-lg rating-half mt-2">
                    {#each Array.from({ length: 5 }, (_, starIndex) => starIndex + 1) as star}
                      <!-- half star -->
                      <input type="radio" name="rating" value={star * 2 - 1} checked={rating === star * 2 - 1} 
                        on:change={() => updateRating(star * 2 - 1)} class="mask mask-star-2 mask-half-1 bg-base-content" 
                        aria-label={`${star - 0.5} star`}/>
                      <!-- full star -->
                      <input type="radio" name="rating" value={star * 2} checked={rating === star * 2}
                        on:change={() => updateRating(star * 2)} class="mask mask-star-2 mask-half-2 bg-base-content"
                        aria-label={`${star} star`}/>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
          <div>
            {#if (entry.alternativeTitles ?? []).length > 0}
              <p use:copyOn={entry.alternativeTitles.join(', ')} class="text-sm text-base-content/70 mb-2 whitespace-pre-wrap break-words inline-block md:hidden">
                {entry.alternativeTitles.join(', ')}
              </p>
            {/if} 
            {#if (entry.tags ?? []).length > 0}
              <div class="flex flex-wrap gap-1 md:gap-2 mb-2 mt-1 justify-end" title="tags">
                {#each entry.tags as tag}
                  <span use:copyOn={tag} class="badge badge-info badge-sm md:badge-md">{tag}</span>
                {/each}
              </div> 
            {/if}
          </div>
          </div>
      </div>
      
      <!-- Characters -->
      {#if (entry.characters ?? []).length > 0}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-5 md:p-6">
            <h2 class="card-title">Characters
              <button class="btn btn-ghost btn-sm ml-auto" aria-label="Edit Characters" on:click={() => openEdit('characters')}>{@html Svg.edit} </button>
              <button class="btn btn-ghost btn-sm" on:click={openNewCharacter}> {@html Svg.add} </button>
            </h2>

            <div class="flex gap-2 md:gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {#each sortedCharacters as character}
                <div class="flex flex-col items-center gap-2 flex-shrink-0 w-18 md:w-22 text-center cursor-pointer" on:click={() => toggleCharacter(character.name)}>
                  {#if character.image}
                    <img use:copyOn={character.name} src={character.image} alt={character.name} class="w-15 h-15 md:w-18 md:h-18 rounded-full object-cover"/>
                  {:else}
                    <div class="w-15 h-15 md:w-18 md:h-18 rounded-full bg-base-300 flex items-center justify-center" >
                      <svg
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        class="w-8 h-8 stroke-current text-base-content/20" >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  {/if}
                  <div class="text-sm text-center leading-tight break-all line-clamp-2">
                    {#if mainRoles.includes(character.role?.toLowerCase() ?? '')}
                      <span class="indicator-item indicator-bottom indicator-center status status-info"></span>
                    {/if}
                    <span>{character.name}</span>
                  </div>
                </div>
              {/each}
            </div>
            {#each sortedCharacters as character}
              {#if expandedCharacter === character.name && (character.name || character.role || (character.alternativeNames ?? []).length > 0 || (character.tags ?? []).length > 0)}
              <div transition:slide={{ duration: 200 }} class="">
                <ul class="list bg-base-200 rounded-xl shadow-md">
                  <li class="list-row items-center py-1">
                  <div class="flex flex-col md:flex-row md:gap-1">
                  <button class="h-10 w-10 btn btn-soft btn-outline btn-sm border border-b-1 border-base-300 rounded-b-none rounded-t-xl md:rounded-xl" on:click={()=>openSingleCharacter(character)}>{@html Svg.edit} </button>
                  <button class="h-10 w-10 btn btn-soft btn-outline btn-sm border border-1 border-base-300 rounded-t-none rounded-b-xl md:rounded-xl" on:click={()=>removeCharacter(character)}>{@html Svg.delete} </button>
                  </div>
                  <div use:copyOn={character.name} class="p-2 w-full bg-base-200 rounded-md text-xs text-left space-y-1 text-info">
                    <div class="break-all"><span class="font-semibold">Name: </span> <span class="text-success">{character.name}</span></div>
                    {#if character.role}
                    <div class="break-all"><span class="font-semibold">Role: </span> <span class="text-base-content">{character.role}</span></div>{/if}
                    {#if character.description}
                    <div class="break-all"><span class="font-semibold">Description: </span> <span class="text-base-content">{character.description}</span></div>{/if}
                    {#if (character.alternativeNames ?? []).length > 0}
                    <div class="break-words"><span class="font-semibold">Alternative Names: </span> <span class="text-base-content">{character.alternativeNames.join(', ')}</span></div>{/if}
                    {#if (character.tags ?? []).length > 0}
                    <div class="flex flex-wrap gap-1 font-semibold">Tags: <span class="text-base-content">{#each character.tags as tag}<span class="badge badge-info badge-xs">{tag}</span>{/each}</span></div>
                    {/if}
                  </div>
                  </li>
                </ul>
              </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <!-- Description -->
      {#if entry.description}
        <div class="card bg-base-100 shadow-xl">
          <div use:copyOn={entry.description} class="card-body gap-1 md:gap-2 p-4 md:p-6">
            <h2 class="card-title">Description          
              <button class="btn btn-square btn-ghost ml-auto" aria-label="Edit Description" on:click={() => openEdit('description')}>
                <svg
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current" >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </h2>
            <!-- Using DaisyUI + Tailwind, so add prose (from typography plugin). Without this, Markdown renders but looks “unstyled”.
             npm install -D @tailwindcss/typography 
             plugins: [ require('@tailwindcss/typography')]
             -->
            <div class="ml-2 break-words prose prose-sm max-w-none prose-p:my-1 prose-ul:my-0 prose-li:my-0 prose-h1:my-0 prose-h2:my-0">{@html descriptionHtml}</div>
          </div>
        </div>
      {/if}

      <!-- Chapters Rows-->
      {#if (entry.rows ?? []).length > 0}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-3 md:p-6" bind:this={chapterContainer}>
            <h2 class="card-title ml-1">Chapters
              <button class="btn btn-ghost btn-sm ml-auto" on:click = {() => openEdit('chapters')}> {@html Svg.edit} </button>
              <button class="btn btn-ghost btn-sm" on:click={openNewChapter}> {@html Svg.add} </button>
              <button class="btn btn-ghost btn-sm rounded-full" on:click={removeChapters} 
              class:text-base-300={chapterDeleteMode} class:bg-error={chapterDeleteMode}> {@html Svg.delete} </button>
            </h2>

            <div class="overflow-x-auto text-xs md:text-sm">
              <div class="w-full border border-base-300 bg-base-200 rounded-lg">
                <!-- Header -->
                <div class="grid grid-cols-[15vw_2fr_3fr] md:grid-cols-[7vw_1fr_2fr] gap-4 px-4 py-3 font-semibold bg-base-200 rounded-t-lg">
                  <div>Chapter</div>
                  <div>Characters</div>
                  <div>Tags</div>
                </div>

                <!-- Rows -->
                {#each sortedRows as row}
                  <div class="py-1 px-[2px] bg-base-200 rounded-lg">
                  
                    <div class="relative">
                    <div 
                      on:click={() => !chapterDeleteMode && openSingleChapter(row)} aria-label="Edit Chapters"
                      class="grid grid-cols-[15vw_2fr_3fr] md:grid-cols-[7vw_1fr_2fr] gap-2 md:gap-4 p-2 md:p-4 bg-base-100 divide-x-[2px] divide-base-content/10 border border-base-content/10 rounded-t-lg rounded-b-md cursor-pointer hover:bg-base-200 z-1"
                      class:bg-base-300={chapterDeleteMode}> 

                        <div class="font-semibold break-words" class:opacity-70={chapterDeleteMode}>{row.chapterSE}</div>
                        <div class="break-all" class:opacity-70={chapterDeleteMode}>{row.characters}</div> 
                        {#if (row.tags ?? []).length > 0}
                          <div class="flex flex-wrap justify-start content-start gap-1" class:opacity-70={chapterDeleteMode}>
                            {#each row.tags as tag}
                              <span class="bg-base-300/70 rounded-lg px-1 break-all">{tag}</span>
                            {/each}
                          </div>
                        {/if}
                        {#if chapterDeleteMode}<button class="absolute top-1 md:top-2 right-2 btn btn-xs md:btn-sm btn-circle btn-error z-10" on:click|stopPropagation={() => removeSingleChapter(row.chapterSE)} > ✕ </button>
                        {/if}

                      </div>
                    </div>

                    <div>
                      {#if row.description}
                        <div class="p-1 text-sm text-base-content/70 bg-base-200/50 border border-base-content/10 border-t-0 rounded-b-lg">
                          <span class="ml-2 text-base-content/60">
                            ↳ <span class="font-semibold">Description:</span>
                          </span>
                          <span class="ml-1 break-words inline prose prose-sm prose-neutral prose-p:m-0 prose-strong:inline prose-em:inline prose-code:inline">
                            {@html mdInline(row.description)}
                          </span>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Timestamps -->
      {#if entry.createdAt || entry.openedAt || entry.editedAt}
        <details class="collapse bg-base-100">
        <summary class="collapse-title font-semibold">Timestamps</summary>
        <div class="collapse-content text-sm">
          <div class="rounded-lg bg-base-200 p-3 text-xs text-gray-500 space-y-1">
            {#if entry.createdAt}
              <div><span class="font-semibold text-base-content">Created:</span>
                <span>{fmt(entry.createdAt)}</span></div>
            {/if}
            {#if entry.openedAt}
              <div><span class="font-semibold text-base-content">Last opened:</span>
                <span>{fmt(entry.openedAt)}</span></div>
            {/if}
            {#if entry.editedAt}
              <div><span class="font-semibold text-base-content">Last edited:</span>
                <span>{fmt(entry.editedAt)}</span></div>
            {/if}
          </div>
        </div>
        </details>
      {/if}
    </div>
  {:else}
    <div class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {/if}
</div>

{#if showEditModal}
  <EditModal
    {entryId}
    {editSection}
    {selectedChapter}
    {selectedCharacter}
    on:save={handleSave}
    on:cancel={handleCancel}
  />
{/if}

