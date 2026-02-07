<!-- src\lib\components\CategoriesModal.svelte -->
<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { dbService } from '$lib/services/db.service';
	import { categories } from '$lib/stores/categories.store';

	export let show = false;

	const dispatch = createEventDispatcher();
	let newCategory = '';

	// State for editing
	let editingCategory: string | null = null;
	let editValue = '';

	// State for editing
	function startEdit(cat: string) {
		editingCategory = cat;
		editValue = cat;
	}
	// Save edit
	async function saveEdit(oldCat: string) {
	const value = editValue.trim();
	if (!value || value === 'All' || value === oldCat) {
		editingCategory = null;
		return;
	}

	// Update DB entries
	await dbService.renameCategory(oldCat, value);

	// Update categories store
	categories.update((cats) =>
		cats.map((c) => (c === oldCat ? value : c))
	);

	// Update selectedCategory if needed
	dispatch('rename', { old: oldCat, new: value });

	editingCategory = null;
	}

	async function loadCategories() {
		// No longer load from entries, just ensure store is up to date from localStorage
		// (handled by store itself)
	}

	async function addCategory() {
		const value = newCategory.trim();
		if (!value || value === 'All') return;
		categories.update((cats) => {
			if (cats.includes(value)) return cats;
			const updated = [...cats, value];
			return updated;
		});
		newCategory = '';
	}

	async function deleteCategory(cat: string) {
	if (cat === 'All') return;

	// Move entries to 'All'
	await dbService.moveCategoryToAll(cat);
	
	// Remove category from persistent store
	categories.update(cats => cats.filter(c => c !== cat));
	
	dispatch('delete', cat);
	}

	onMount(loadCategories);
</script>

{#if show}
	<div
		class="fixed inset-0 z-150 flex bg-black/50" role="button" tabindex="0" aria-label="Close categories modal"
		on:click={() => dispatch('close')}
		on:keydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') dispatch('close');
		}}>
		<div class="h-full w-96 bg-base-100 p-6 shadow-xl flex flex-col" on:click|stopPropagation role="document">
			<h2 class="mb-6 text-2xl font-bold">Categories</h2>
			<div class="flex-1 overflow-y-auto pr-1 border border-base-content/30 rounded-xl p-1 px-2">
			<ul class="mb-4">
				{#each ['All', ...$categories.filter((c) => c !== 'All')] as cat}
					<li class="mb-2 flex items-center justify-between">
						{#if editingCategory === cat}
						<input
							class="input input-sm input-bordered flex-1 mr-2"
							bind:value={editValue}
							on:keydown={(e) => e.key === 'Enter' && saveEdit(cat)}
							on:blur={() => saveEdit(cat)}
							autofocus
						/>
						{:else}
						<span class="truncate cursor-pointer" on:dblclick={() => startEdit(cat)}>
							{cat}
						</span>
						{/if}
						{#if cat !== 'All'}
						<div class="flex gap-2">
							{#if editingCategory === cat}
								<button class="btn btn-sm btn-success" on:click={() => saveEdit(cat)} > Save</button>
							{:else}
								<button class="btn btn-xs btn-info" on:click={() => startEdit(cat)} > Edit</button>
								<button class="btn btn-xs btn-error" on:click={() => deleteCategory(cat)} > Delete</button>
							{/if}
						</div>
						{/if}
					</li>
				{/each}
			</ul>
			</div>

			<div class="flex gap-2 mt-3">
				<input class="input-bordered input flex-1" placeholder="New category"
					bind:value={newCategory}/>
				<button aria-label="Add new category" class="btn btn-primary" on:click={addCategory}>Add</button>
			</div>
			<button class="btn btn-outline btn-primary mt-2 w-full" on:click={() => dispatch('close')}>Close</button>
			
			<div role="alert" class="mt-2 alert alert-default alert-soft font-semibold">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<span>Categories without any entries are lost after refreshing or closing the app</span>
			</div>
			<div role="alert" class="mt-2 alert alert-default alert-soft font-semibold">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<span>When a category is deleted, all entries in that category are moved to the 'All' category</span>
			</div>
		</div>
	</div>
{/if}
