<!-- src\lib\components\EditModal.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { dbService } from '$lib/services/db.service';
  import type { LData, Character, ChapterRow } from '$lib/types/ldata';
  import { categories } from '$lib/stores/categories.store';
  import { RatingLevel, type Rating } from '$lib/index';

  export let entryId: number | null = null;

  const dispatch = createEventDispatcher();

  let title = '';
  let alternativeTitles = '';
  let coverImageUrl = '';
  let description = '';
  let badges = '';
  let rating= 0;
  let tags = '';
  let category = 'All';

  type EditableCharacter = Character & { _alternativeNamesString: string, _tagsString:string };
  let characters: EditableCharacter[] = [];

  type EditableRow = {
    chapterSE: string;
    description: string;
    characters: string;
    _tagsText: string;
  };
  let rows: EditableRow[] = [];

  onMount(async () => {
    if (entryId !== null) {
      const entry = await dbService.getEntryById(entryId);
      if (entry) {
        title = entry.title;
        alternativeTitles = entry.alternativeTitles.join(', ');
        coverImageUrl = entry.coverImageUrl || '';
        description = entry.description;
        badges = entry.badges.join(', ');
        rating = Number(entry.rating);
        tags = entry.tags.join(', ');
        category = entry.category;
        // Characters
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
      }
    }
  });

  function addCharacter() {
    characters = [
      ...characters,
      { Name: '', Image: '', role: '', alternativeNames: [], tags: [], description: '', _alternativeNamesString: '', _tagsString: '' }
    ];
  }
  function removeCharacter(index: number) {
    characters = characters.filter((_, i) => i !== index);
  }

  function addChapter() {
    rows = [...rows, { chapterSE: '', description: '', characters: '',  _tagsText: '' }];
  }
  function removeChapter(index: number) {
    rows = rows.filter((_, i) => i !== index);
  }

  async function handleSave() {
    const entry: Omit<LData, 'id'> = {
      title,
      alternativeTitles: alternativeTitles.split(',').map((t) => t.trim()).filter(Boolean),
      coverImageUrl: coverImageUrl || null,
      description,
      badges: badges.split(',').map((b) => b.trim()).filter(Boolean),
      rating: Number(rating),
      createdAt: null,
      openedAt: null,
      editedAt: null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      category: category || 'All', 
      dataType: 'Lib',
      characters: characters
        .filter(c => c.name)
        .map(c => ({
          name: c.name,
          image: c.image,
          role: c.role,
          description: c.description,
          alternativeNames: (c._alternativeNamesString ?? '').split(',').map(s => s.trim()).filter(Boolean),
          tags: (c._tagsString ?? '').split(',').map(s => s.trim()).filter(Boolean)
        })),
      rows: rows
        .filter(r => r.chapterSE)
        .map(r => ({
          chapterSE: r.chapterSE,
          description: r.description,
          characters: r.characters,
          tags: r._tagsText.split(',').map(t => t.trim()).filter(Boolean)
        }))
    };

    if (entryId !== null) {
      await dbService.updateEntry(entryId, entry);
    } else {
      await dbService.addEntry(entry);
    }
    dispatch('save');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="fixed inset-0 bg-black/50 z-150 flex items-center justify-center p-4" on:click={handleCancel}>
  <div class="bg-base-100 w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg shadow-xl"
    on:click|stopPropagation>
    <div class="bg-base-100 border-b border-base-300 p-4 flex justify-between items-center">
      <h2 class="text-2xl font-bold">{entryId !== null ? 'Edit Entry' : 'New Entry'}</h2>
      <button class="btn btn-square btn-ghost btn-sm" on:click={handleCancel}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="p-6 space-y-4">
      <div class="form-control">
        <label for="newtitle" class="floating-label">
          <span>Title <span class="label-text-alt text-info italic">: required</span></span>
          <input id="newtitle" type="text" placeholder="Title" class="input input-bordered w-full" bind:value={title} required />
        </label>
      </div>

      <div class="form-control">
        <label for="newAltTitles" class="floating-label">
          <span>
            <span class="label-text">Alternative Titles</span>
            <span class="label-text-alt text-info italic">: Comma separated</span>
          </span>
          <input id="newAltTitles" type="text" placeholder="Alternative Titles [Ex: Title1, Title2]" class="input input-bordered w-full" bind:value={alternativeTitles} />
        </label>
      </div>  

      <div class="form-control">
        <label for="newCoverImg" class="floating-label">
          <span class="label-text">Cover Image URL</span>
          <input id="newCoverImg" type="text" placeholder="Cover Image URL: Web Img Link" class="input input-bordered w-full" bind:value={coverImageUrl} />
        </label>
      </div>

      <div class="form-control">
        <label class="floating-label">
          <span class="label-text">Description</span>
          <textarea placeholder="Description" class="textarea textarea-bordered w-full h-24" bind:value={description} />
        </label>
      </div>

      <div class="form-control">
        <label for="newBadges" class="floating-label">
          <span>
            <span class="label-text">Badges</span>
            <span class="label-text-alt text-info italic">: Comma separated</span>
          </span>
          <textarea id="newBadges" placeholder="Badges [Ex: Completed, Ongoing, Author, Artist, Favorite]" class="textarea textarea-bordered w-full" bind:value={badges}></textarea>
        </label>
      </div>

      <div class="form-control">
        <label for="newTags" class="floating-label">
          <span>
            <span class="label-text">Tags</span>
            <span class="label-text-alt text-info italic">: Comma separated</span>
          </span>
          <textarea id="newTags" placeholder="Tags [Ex: Themes, Genres]" class="textarea textarea-bordered w-full" bind:value={tags}></textarea>

        </label>
      </div>

      <div class="form-control">
        <label class="floating-label">
          <span class="label-text font-semibold">Category</span>
        </label>
          <select class="select select-bordered w-full" bind:value={category}>
            <option class="border border-base-content/20 hover:bg-base-200" value="All">All</option>
            {#each $categories.filter((c) => c !== 'All') as cat}
              <option class="border border-base-200" value={cat}>{cat}</option>
            {/each}
          </select>
      </div>

      <div class="form-control">
        <label class="flex flex-wrap gap-2 justify-between">
          <span>
            <span class="label-text font-semibold">Rating <span class="text-info">(0–10)</span></span>
          </span>
          <div class="text-xs md:text-sm text-info">
            <span class="font-semibold">Value:</span> {rating} - {RatingLevel[rating]}
          </div>
        </label>

          <div class="w-full max-w-xs">
          <input type="range" min="0" max="10" step="1" class="range range-xs range-info" bind:value={rating} />
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
      
      <div class="divider">Characters</div>

      <div class="space-y-2">
        {#each characters as character, i}
          <div class="flex gap-2 flex-wrap mb-2 p-2 rounded-lg bg-base-200 border border-base-300">
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
            <details class="w-full mt-2">
              <summary class="cursor-pointer text-sm font-medium text-primary text-center">Extra Details</summary>

              <div class="space-y-2 mt-2">
              <label class="floating-label w-full" for="charAltNames">
                <span>
                  <span class="label-text">alternativeNames</span>
                  <span class="label-text-alt text-info italic">: Comma separated</span>
                </span>
                <input id="charAltNames" placeholder="Alternative Names [Ex: Name01, name-01]" class="input input-sm w-full" bind:value={character._alternativeNamesString}/>
              </label>
              <label class="floating-label w-full" for="charTags">
                <span>
                  <span class="label-text">char-Tags</span>
                  <span class="label-text-alt text-info italic">: Comma separated</span>
                </span>
                <input id="charTags" placeholder="Tags [Ex: Hero, Villain]" class="input input-sm w-full" bind:value={character._tagsString}/>
              </label>
              <label class="floating-label w-full" for="charDescription">
                <span>
                  <span class="label-text">Description</span>
                </span>
                <textarea id="charDescription" placeholder="Description" class="textarea textarea-bordered w-full" bind:value={character.description}></textarea>
              </label>
              </div>
              
            </details>
          </div>
        {/each}
        <button class="btn btn-outline btn-sm" on:click={addCharacter}>+ Add Character</button>
      </div>

      <div class="divider">Chapters</div>

      <div class="space-y-2">
        {#each rows as row, i}
          <div class="card bg-base-200 border border-base-300 p-4">
            <div class="flex gap-2 mb-2">
              <label class="floating-label w-full">
              <span>Chapter *</span>
              <input type="text" placeholder="Chapter (e.g., 1-5)" class="input input-bordered w-full input-sm flex-1" bind:value={row.chapterSE} />
              </label>
              <button class="btn btn-square btn-error btn-outline btn-sm" on:click={() => removeChapter(i)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current" >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <label class="floating-label w-full">
              <span>Description</span>
              <textarea placeholder="Description" class="textarea textarea-bordered w-full textarea-sm mb-2"
                bind:value={row.description}></textarea>
            </label>
            <label class="floating-label w-full">
              <span>Tags (comma separated)</span>
              <input
                type="text"
                placeholder="Tags (comma separated)"
                class="input input-bordered w-full input-sm mb-2"
                bind:value={row._tagsText}
              />
            </label>
            <label class="floating-label w-full">
              <span>Characters</span>
              <input
                type="text"
                placeholder="Characters"
                class="input input-bordered w-full input-sm"
                bind:value={row.characters}
              />
            </label>
          </div>
        {/each}
        <button class="btn btn-outline btn-sm" on:click={addChapter}>+ Add Chapter</button>
      </div>
    </div>

    <div class="sticky bottom-0 bg-base-100 border-t border-base-300 p-4 flex gap-2 justify-end">
      <button class="btn btn-outline" on:click={handleCancel}>Cancel</button>
      <button class="btn btn-primary" on:click={handleSave} disabled={!title || !category}>Save</button>
    </div>
  </div>
</div>
