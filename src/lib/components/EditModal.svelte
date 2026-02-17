<!-- src\lib\components\EditModal.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { dbService } from '$lib/services/db.service';
  import type { LData, Character, ChapterRow } from '$lib/types/ldata';
  import { categories } from '$lib/stores/categories.store';
  import { RatingLevel, type Rating } from '$lib/index';

  type Section = 'All' | 'characters' | 'chapters' | 'description' | 'category';

  export let entryId: number | null = null;
  export let editSection: Section = 'All';

  const dispatch = createEventDispatcher();

  let title = '';
  let alternativeTitles = '';
  let coverImageUrl = '';
  let description = '';
  let badges = '';
  let rating = 0;
  let tags = '';
  let category = 'All';

  type EditableCharacter = Character & { _alternativeNamesString: string, _tagsString:string };
  let characters: EditableCharacter[] = [];

  // UI rows with editable tag string
  type EditableRow = ChapterRow & { _tagsText: string };
  let rows: EditableRow[] = [];

  // -----------------------------
  // Sorted characters (based on editable characters)
  const mainRoles = ['main', 'lead', 'mc', 'fmc', 'protagonist'];

  $: sortedcharacters = [...characters].sort((a, b) => {
    const aPriority = mainRoles.includes((a.role ?? '').toLowerCase()) ? 0 : 1;
    const bPriority = mainRoles.includes((b.role ?? '').toLowerCase()) ? 0 : 1;
    return aPriority - bPriority;
  });

  // -----------------------------
  // Sorted rows (based on editable rows)
  function chapterSort(a: string, b: string) {
    // 🟢 1. Always push empty chapters to bottom
    if (!a?.trim()) return 1;
    if (!b?.trim()) return -1;

    const numA = parseFloat(a);
    const numB = parseFloat(b);

    const isNumA = !isNaN(numA);
    const isNumB = !isNaN(numB);

    // numbers before letters
    if (isNumA && !isNumB) return -1;
    if (!isNumA && isNumB) return 1;

    // both numbers
    if (isNumA && isNumB) return numA - numB;

    // both strings
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
  $: sortedRows = [...rows].sort((a, b) =>
    chapterSort(a.chapterSE, b.chapterSE)
  );

  onMount(async () => {
    if (!entryId) return;
    const entry = await dbService.getEntryById(entryId);
    if (!entry) return;

    // All
    title = entry.title;
    alternativeTitles = entry.alternativeTitles.join(', ');
    coverImageUrl = entry.coverImageUrl || '';
    description = entry.description;
    badges = entry.badges.join(', ');
    rating = entry.rating ?? 0;
    tags = entry.tags.join(', ');
    category = entry.category;

    // characters
    characters = entry.characters.map(c => ({
      ...c,
      _alternativeNamesString: (c.alternativeNames ?? []).join(', '),
      _tagsString: (c.tags ?? []).join(', ')
    }));

    // Chapters
    rows = entry.rows.map(r => ({
      ...structuredClone(r),
      _tagsText: r.tags.join(', ')
    }));
  });

  // character mention picker
  let activeRowIndex: number | null = null;
  function toggleCharacterForRow(rowIndex: number, charName: string) {
    const row = rows[rowIndex];
    // split existing names by comma
    const current = row.characters
      ? row.characters.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (current.includes(charName)) {
      // REMOVE
      row.characters = current.filter(c => c !== charName).join(', ');
    } else {
      // ADD
      row.characters = [...current, charName].join(', ');
    }
    rows = [...rows]; // trigger reactivity
  }
  function clearCharacters(rowIndex: number) {
    rows[rowIndex].characters = '';
    rows = [...rows]; // trigger reactivity
    // clearCharactersAndClose()
    // activeRowIndex = null;
  }
  function closePicker() {
    activeRowIndex = null;
  }

  function addCharacter() {
    characters = [
      ...characters,
      { name: '', image: '', role: '', alternativeNames: [], tags: [], description: '', _alternativeNamesString: '', _tagsString: '' }
    ];
  }
  function removeCharacter(index: number) {
    characters = characters.filter((_, i) => i !== index);
  }

  function addChapter() {
    rows = [
      ...rows,
      { chapterSE: '', description: '', characters: '', tags: [], _tagsText: ''}
    ];
  }
  function removeChapter(i: number) {
    rows = rows.filter((_, idx) => idx !== i);
  }

  async function handleSave() {
    if (!entryId) return;

    const updateData: Partial<LData> = {};

    switch (editSection) {
      case 'All':
        updateData.title = title;
        updateData.alternativeTitles = alternativeTitles.split(',').map(t => t.trim()).filter(Boolean);
        updateData.coverImageUrl = coverImageUrl || null;
        updateData.description = description;
        updateData.badges = badges.split(',').map(b => b.trim()).filter(Boolean);
        updateData.rating = rating;
        updateData.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        updateData.category = category || 'All';
        updateData.characters = characters.map(c => ({
          name: c.name,
          image: c.image,
          role: c.role,
          description: c.description,
          alternativeNames: (c._alternativeNamesString ?? '').split(',').map(s => s.trim()).filter(Boolean),
          tags: (c._tagsString ?? '').split(',').map(s => s.trim()).filter(Boolean)
        }));
        updateData.rows = rows
          .filter(r => r.chapterSE)
          .map(r => ({
            chapterSE: r.chapterSE,
            description: r.description,
            characters: r.characters,
            tags: r._tagsText.split(',').map(t => t.trim()).filter(Boolean)
          }));
        break;

      case 'characters':
        updateData.characters = characters.map(c => ({
          name: c.name,
          image: c.image,
          role: c.role,
          description: c.description,
          alternativeNames: (c._alternativeNamesString ?? '').split(',').map(s => s.trim()).filter(Boolean),
          tags: (c._tagsString ?? '').split(',').map(s => s.trim()).filter(Boolean)
        }));
        break;

      case 'chapters':
        updateData.rows = rows
          .filter(r => r.chapterSE)
          .map(r => ({
            chapterSE: r.chapterSE,
            description: r.description,
            characters: r.characters,
            tags: r._tagsText
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          }));
        break;

      case 'description':
        updateData.description = description;
        break;

      case 'category':
        updateData.category = category || 'All';
        updateData.rating = rating;
        break;
    }

    await dbService.updateEntryPartial(entryId, updateData);
    dispatch('save');
  }
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<!-- Modal -->
<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="presentation">
  <button class="absolute inset-0 bg-transparent" on:click={handleCancel} aria-label="Close"></button>
  <div role="dialog" tabindex="-1" 
    class="bg-base-100 w-full max-w-4xl max-h-[92vh] md:max-h-[90vh] overflow-auto rounded-lg shadow-xl relative z-10">
    <div class="bg-base-100 border-b border-base-300 p-4 flex justify-between items-center">
      <h2 class="text-2xl font-bold">
        Edit <span class="text-info">{editSection}</span>
      </h2>
      <button class="btn btn-square btn-ghost btn-sm" on:click={handleCancel} aria-label="Close modal">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>

    <div class="p-2 md:p-6 space-y-4">

      {#if  editSection === 'All'}
        <div class="form-control">
          <label class="floating-label" for="title">
            <span class="label-text font-semibold">Title <span class="label-text-alt text-info italic">: required</span></span>
            <input id="title" placeholder="Title" type="text" class="input input-bordered w-full" bind:value={title} required />
          </label>
        </div>

        <div class="form-control">
          <label class="floating-label" for="altTitles">
            <span>
              <span class="label-text">Alternative Titles</span>
              <span class="label-text-alt text-info italic">: Comma separated</span>
            </span>
            <input id="altTitles" placeholder="Alternative Titles [Ex: Title1, Title2]" type="text" class="input input-bordered w-full" bind:value={alternativeTitles} />
          </label>
        </div>

        <div class="form-control">
          <label class="floating-label" for="coverImage">
            <span class="label-text font-semibold">Cover Image URL</span>
            <input id="coverImage" placeholder="Cover Image URL" type="text" class="input input-bordered w-full" bind:value={coverImageUrl} />
          </label>
        </div>
        
        <div class="form-control">
          <label class="floating-label" for="badges">
            <span>
              <span class="label-text font-semibold">Badges</span>
              <span class="label-text-alt text-info italic">: Comma separated</span>
            </span>
            <textarea id="badges" placeholder="Badges [Ex: Completed, Ongoing, Author, Artist, Favorite]" class="textarea textarea-bordered w-full" bind:value={badges}></textarea>
          </label>
        </div>
        <div class="form-control">
          <label class="floating-label" for="tags">
            <span>  
              <span class="label-text font-semibold">Tags</span>
              <span class="label-text-alt text-info italic">: Comma separated</span>
            </span>
            <textarea id="tags" placeholder="Tags [Ex: Themes, Genres]" class="textarea textarea-bordered w-full" bind:value={tags}></textarea>
          </label>
        </div>
      {/if}

      {#if editSection === 'All' || editSection === 'category'}
        <div class="form-control">
          <label class="floating-label" for="category">
            <span class="label-text font-semibold">Category</span>
          </label>
          <select id="category" class="select select-bordered w-full" bind:value={category}>
            <option class='border border-base-content/20 hover:bg-base-200' value="All">All</option>
            {#each $categories.filter((c) => c !== 'All') as cat}
              <option class='border border-base-content/20 hover:bg-base-200' value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div class="form-control">
          <label for="rating" class="flex flex-wrap gap-2 justify-between">
            <span>
              <span class="label-text font-semibold">Rating <span class="text-info">(0–10)</span></span>
            </span>
            <div class="text-xs md:text-sm text-info">
              <span class="font-semibold">Value:</span> {rating} - {RatingLevel[rating]}
            </div>
          </label>

          <div class="w-full max-w-xs">
          <input id="rating" type="range" min="0" max="10" step="1" class="range range-xs range-info" bind:value={rating} />
          <div class="flex justify-between px-2.5 mt-1 text-xs">
            {#each Array.from({ length: 11 }, (_, i) => i) as n}
              <span class={n === rating ? 'text-info font-bold' : ''}>|</span>
            {/each}
          </div>
          <div class="flex justify-between px-2.5 mt-1 text-xs">
            {#each Array.from({ length: 11 }, (_, i) => i) as n}
              <span class={n === rating ? 'text-info font-bold' : ''}>{n}</span>
            {/each}
          </div>
          </div>
        </div>
      {/if}

      {#if editSection === 'All' || editSection === 'description'}
        <div class="form-control">
          <label class="floating-label" for="description">
            <span class="label-text font-semibold">description</span>
          </label>
          <textarea id="description" placeholder="description" class="textarea textarea-bordered w-full" bind:value={description}></textarea>
        </div>
      {/if}

      {#if editSection === 'All' ||  editSection === 'characters'}
        {#if editSection === 'All'}<div class="divider">characters</div>{/if}
        <div class="flex flex-col max-h-[440px] md:max-h-full">
        <!-- Scrollable list -->
        <div class="space-y-2 p-1 rounded-lg bg-base-300 overflow-y-auto pr-1">
          {#each sortedcharacters as character, i}
            <div class="flex gap-2 flex-wrap mb-2 p-2 rounded-lg border border-base-300 bg-base-200">
              <div class="flex gap-2 w-full">
                <label class="floating-label w-full" for="charName">
                  <span><span class="label-text">Name **</span></span>
                  <input type="text" id="charName" placeholder="Name *" class="input input-sm w-full" bind:value={character.name} />
                </label>
                <label class="floating-label w-full" for="charRole">
                  <span><span class="label-text">Role</span></span>
                  <input type="text" id="charRole" placeholder="role" class="input input-sm w-full" bind:value={character.role} />
                </label>
                <button class="btn btn-sm btn-square btn-error btn-outline" on:click={() => removeCharacter(i)}>✕</button>
              </div>
              <label class="floating-label w-full" for="charImgUrl">
                <span>
                  <span class="label-text">Image URL</span>
                </span>
                <input type="text" id="charImgUrl" placeholder="Img URL" class="input input-sm w-full" bind:value={character.image} />
              </label>
              <details class="w-full">
                <summary class="cursor-pointer text-sm font-medium text-primary my-1 text-center">Extra Details</summary>
                <div class="space-y-2 mt-2">
                  <label class="floating-label w-full" for="charAltNames">
                    <span>
                      <span class="label-text">alternativeNames</span>
                      <span class="label-text-alt text-info italic">: Comma separated</span>
                    </span>
                    <input id="charAltNames" placeholder="Alternative Names [Ex: Name01, name-01]" class="input input-sm w-full" bind:value={character._alternativeNamesString} />
                  </label>
                  <label class="floating-label w-full" for="charTags">
                    <span>
                      <span class="label-text">char-Tags</span>
                      <span class="label-text-alt text-info italic">: Comma separated</span>
                    </span>
                    <input id="charTags" placeholder="Tags [Ex: Hero, Villain]" class="input input-sm w-full" bind:value={character._tagsString} />
                  </label>
                  <label class="floating-label w-full" for="chardescription">
                    <span class="label-text">description</span>
                    <textarea id="chardescription" placeholder="description" class="textarea textarea-bordered w-full" bind:value={character.description} ></textarea>
                  </label>
                </div>
              </details>
            </div>
          {/each}
        </div>
        </div>
      {/if}

      {#if editSection === 'All' || editSection === 'chapters'}
        {#if editSection === 'All'}<div class="divider">Chapters</div>{/if}
        <div class="flex flex-col max-h-[440px] md:max-h-full">
        <!-- Scrollable list -->
        <div class="space-y-2 p-1 rounded-lg bg-base-300 overflow-y-auto pr-1">
          {#each sortedRows as row, i}
            <div class="card border border-base-300 bg-base-200 p-1.5 md:p-4">
              <div class="flex gap-2 mb-2">
                <label class="floating-label w-full"><span>Chapter **</span>
                <input type="text" placeholder="Chapter (e.g., 1-5)" class="input input-bordered w-full input-sm flex-1" bind:value={row.chapterSE}/>
                </label>
                <button class="btn btn-square btn-error btn-outline btn-sm" on:click={() => removeChapter(i)}>✕</button>
              </div>

              <label class="floating-label w-full"><span>Description</span>
              <textarea placeholder="description" class="textarea textarea-bordered w-full textarea-sm mb-2" 
                bind:value={row.description}></textarea>
              </label>
              <label class="floating-label w-full"><span>Tags (comma separated)</span>
              <input type="text" placeholder="Tags (comma separated)" class="input input-bordered w-full input-sm mb-2"
                bind:value={row._tagsText}/>
              </label>
              <label class="floating-label w-full"><span>Characters</span>
              <input type="text" placeholder="characters" class="input input-bordered w-full input-sm"
                bind:value={row.characters} 
                on:focus={() => activeRowIndex = i}/>
              </label>
              {#if activeRowIndex === i}
                <div class="mt-2 p-2 bg-base-300 rounded-xl space-y-2">
                <div class="flex gap-2 overflow-x-auto whitespace-nowrap md:flex-wrap md:overflow-visible md:whitespace-normal">
                  {#each characters as char}
                    <button type="button" 
                      class={`btn rounded-md btn-xs flex-shrink-0 ${row.characters?.split(',').map(s => s.trim()).includes(char.name)? 'btn-info': 'btn-outline'}`}
                      on:click={() => toggleCharacterForRow(i, char.name)}>
                      {char.name}
                    </button>
                  {/each}
                </div>
                <div class="flex gap-2 mt-1 justify-between">
                  <button type="button" class="btn rounded-xl btn-xs btn-outline btn-error" on:click={() => clearCharacters(i)}>🧹 Clear Text</button>
                  <button type="button" class="btn rounded-xl btn-xs bg-error text-base-300 btn-outline" on:click={closePicker}>❌ Close</button>
                </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        </div>
      {/if}
    </div>

    <!-- Buttons -->
    <div class="sticky bottom-0 bg-base-100 border-t border-base-300 p-4 flex gap-2 justify-between z-10">
      <!-- Left side add buttons -->
      <div class="flex gap-2">
        {#if editSection === 'All' || editSection === 'characters'}
          <button class="btn btn-outline btn-sm" on:click={addCharacter}>+ Character </button>
        {/if}

        {#if editSection === 'All' || editSection === 'chapters'}
          <button class="btn btn-outline btn-sm" on:click={addChapter}>+ Chapter </button>
        {/if}
      </div>
      <!-- Right side actions -->
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm text-error" on:click={handleCancel}>Cancel</button>
        <button class="btn btn-primary btn-sm" on:click={handleSave} disabled={editSection === 'All' && (!title || !category)}>Save </button>
      </div>
    </div>
  </div>
</div>