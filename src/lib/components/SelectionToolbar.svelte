<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let selectedCount = 0;
	export let categoryList: string[] = [];
	export let showCategoryDropdown = false;

	const dispatch = createEventDispatcher();

	// -----------------------------
	// Drag logic (self-contained)
	// -----------------------------
	let dragging = false;
	let startX = 0;
	let startY = 0;
	let offsetX = 0;
	let offsetY = 0;

	function startDrag(e: PointerEvent) {
		dragging = true;
		startX = e.clientX - offsetX;
		startY = e.clientY - offsetY;

		window.addEventListener('pointermove', onDrag);
		window.addEventListener('pointerup', stopDrag);
	}

	function onDrag(e: PointerEvent) {
		if (!dragging) return;
		offsetX = e.clientX - startX;
		offsetY = e.clientY - startY;
	}

	function stopDrag() {
		dragging = false;
		window.removeEventListener('pointermove', onDrag);
		window.removeEventListener('pointerup', stopDrag);
	}
</script>

<div
	class="fixed top-16 left-1/2 z-50 flex items-center gap-4 rounded-lg border border-base-300 bg-base-100 p-2 shadow-md select-none"
	style="transform: translate(calc(-50% + {offsetX}px), {offsetY}px);">
	<!-- Drag handle -->
	<div role="button" tabindex="0" class="cursor-grab rounded-md bg-base-200 p-2 hidden md:inline-block" on:pointerdown={startDrag} aria-label="Drag toolbar">⠿</div>

	<!-- Delete -->
	<div class="md:tooltip" data-tip="Delete">
	<button class="btn relative btn-square btn-error" disabled={selectedCount === 0} on:click={() => dispatch('delete')} aria-label="Delete selected">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 stroke-current">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
		</svg>
		{#if selectedCount > 0}
			<span class="absolute -top-6 -left-2 flex h-5 w-20 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white p-1">{selectedCount}
			</span>
		{/if}
	</button>
	</div>

	<!-- Select all -->
	<div class="md:tooltip" data-tip="Select all">
	<button class="btn btn-square btn-ghost" on:click={() => dispatch('selectAll')} aria-label="Select all">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 stroke-current">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7M5 7l4 4L19 1"  />
		</svg>
	</button>
	</div>

	<!-- Deselect all -->
	<div class="md:tooltip" data-tip="Deselect all">
	<button class="btn btn-square opacity-50 btn-ghost" on:click={() => dispatch('deselectAll')} aria-label="Deselect all" >
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 stroke-current opacity-20" >
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7M5 7l4 4L19 1" />
		</svg>
	</button>
	</div>

	<!-- Move to category -->
	<div class="dropdown dropdown-end" class:dropdown-open={showCategoryDropdown}>
		<div class="md:tooltip" data-tip="Move to category">
		<button class="btn btn-square btn-ghost" disabled={selectedCount === 0} on:click={() => dispatch('toggleCategoryDropdown')} aria-label="Move to category" >
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 stroke-current" >
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v4H4V4zm0 8h16v4H4v-4zm0 8h16v4H4v-4z" />
			</svg>
		</button>
		</div>

		{#if showCategoryDropdown && categoryList.length > 0}
			<ul class="dropdown-content menu mt-3 w-52 rounded-box bg-base-100 p-2 shadow-md">
				{#each categoryList as cat}
					<li>
						<button class="w-full border border-base-300 text-left hover:bg-base-200"
							on:click={() => dispatch('moveCategory', cat)} >
							{cat}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Cancel -->
	<div class="md:tooltip" data-tip="Cancel">
	<button class="btn btn-square bg-red-700 text-white btn-ghost hover:bg-red-500" on:click={() => dispatch('cancel')} aria-label="Cancel selection" >
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 stroke-current" >
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>
	</div>

    <!-- Drag handle -->
	<div role="button" tabindex="0" class="drag-handle cursor-grab rounded-md bg-base-200 p-2" on:pointerdown={startDrag} aria-label="Drag toolbar">⠿</div>
</div>
