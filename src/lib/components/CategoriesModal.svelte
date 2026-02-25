/*! 🌼 daisyUI 5.5.18 */
<!-- src\lib\components\CategoriesModal.svelte -->
<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { dbService } from '$lib/services/db.service';
	import { dndzone } from 'svelte-dnd-action';
	import { categories } from '$lib/stores/categories.store';
	import Alert from './Alert.svelte';
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

		// Rename category in DB + store
		await categories.rename(oldCat, value);
		// Update selectedCategory if needed
		dispatch('rename', { old: oldCat, new: value });

		editingCategory = null;
		showTemporaryAlert(`Category renamed to "${value}"`);
	}

	async function loadCategories() {
		// No longer load from entries, just ensure store is up to date from localStorage
		// (handled by store itself)
	}

	async function addCategory() {
		const value = newCategory.trim();
		if (!value || value === 'All') return;
		await categories.add(value);
		newCategory = '';
	}

	let alertMessage = '';
	let showAlert = false;
	function showTemporaryAlert(msg: string, duration = 2000) {
		alertMessage = msg;
		showAlert = true;
		setTimeout(() => {
			showAlert = false;
		}, duration);
	}

	async function deleteCategory(cat: string) {
		if (cat === 'All') return;

		// Move entries to 'All'
		await dbService.moveCategoryToAll(cat);
		// Remove category from persistent store
		await categories.remove(cat);

		showTemporaryAlert(`Category "${cat}" deleted. Entries moved to 'All'.`);
	}

	onMount(() => {
		categories.load();
	});

	// Define the interface for DnD items
	interface CategoryItem {
		id: string;
		name: string;
	}
	// 1. Initialize with type safety
	let items: CategoryItem[] = [];

	// 2. Sync local items whenever the store changes (initial load or external change)
	$: {
		items = $categories.filter((c) => c !== 'All').map((c) => ({ id: c, name: c }));
	}
	async function handleDnd(event: CustomEvent<{ items: CategoryItem[] }>) {
		// Update local state IMMEDIATELY for smooth animation
		items = event.detail.items;
		// When the drag is finished, persist to DB and update the global store
		if (event.type === 'finalize') {
			const reorderedNames = items.map((i) => i.id);
			// Update the database
			await dbService.reorderCategories(reorderedNames);
			// IMPORTANT: Tell the store to reload so the Tabs update
			await categories.load();
		}
	}
</script>
<style>
	*:focus {
  outline: none !important;
  box-shadow: none !important;
}
</style>
<!-- on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') dispatch('close');}}> -->
{#if show}
	<div
		class="fixed inset-0 z-150 flex bg-black/50"
		role="button"
		tabindex="0"
		aria-label="Close categories modal"
		on:click={() => dispatch('close')}
	>
		<div
			class="flex h-full w-96 flex-col bg-base-100 p-6 shadow-xl"
			on:click|stopPropagation
			role="document"
		>
			<h2 class="mb-6 text-2xl font-bold">Categories</h2>
			<div class="flex-1 overflow-y-auto rounded-md border border-base-content/30 p-1 px-2 pr-1">
				<!-- 'All' is outside DnD zone -->
				<ul class="mb-4">
					<li class="rounded-lg p-1">All</li>
				</ul>

				<!-- DnD zone for other categories -->
				<ul
					use:dndzone={{ items: items, flipDurationMs: 150 }}
					on:consider={handleDnd}
					on:finalize={handleDnd}
					class="border border-none outline-none focus:outline-none focus:ring-0">
					{#each items as item (item.id)}
						<li
							class="mb-2 flex cursor-grab items-center justify-between rounded-lg p-1 transition-all duration-150 hover:bg-base-200"
						>
							{#if editingCategory === item.id}
								<input
									class="input-bordered input input-sm mr-2 flex-1"
									bind:value={editValue}
									on:keydown={(e) => e.key === 'Enter' && saveEdit(item.id)}
									on:blur={() => saveEdit(item.id)}
									autofocus
								/>
							{:else}
								<span class="cursor-pointer truncate" on:dblclick={() => startEdit(item.id)}>
									{item.name}
								</span>
							{/if}

							<div class="flex gap-2">
								{#if editingCategory === item.id}
									<button
										class="btn btn-sm btn-success"
										on:click|stopPropagation={() => saveEdit(cat)}
									>
										Save</button
									>
								{:else}
									<button
										class="btn btn-xs btn-info"
										on:click|stopPropagation={() => startEdit(cat)}
									>
										Edit</button
									>
									<button
										class="btn btn-xs btn-error"
										on:click|stopPropagation={() => deleteCategory(cat)}
									>
										Delete</button
									>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-3 flex gap-2">
				<input
					class="input-bordered input flex-1"
					placeholder="New category"
					bind:value={newCategory}
				/>
				<button aria-label="Add new category" class="btn btn-primary" on:click={addCategory}
					>Add</button
				>
			</div>
			<button class="btn mt-2 w-full btn-soft" on:click={() => dispatch('close')}>Close</button>

			<div
				class="mt-1 justify-center px-1 text-xs text-success"
				style="min-height: 1.55rem; max-height: 1.55rem; visibility: {showAlert
					? 'visible'
					: 'hidden'}"
			>
				<span>{alertMessage}</span>
			</div>
			<div class="alert-default my-2 alert alert-soft">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="h-6 w-6 shrink-0 stroke-current"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<span
					>When a category is <b>deleted</b>, all entries in that category are
					<b>moved to the 'All'</b> category</span
				>
			</div>
		</div>
	</div>
{/if}