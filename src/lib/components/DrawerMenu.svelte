<!-- src\lib\components\DrawerMenu.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Alert from './Alert.svelte';
  import jsonStruct from '$lib/assets/jsonStruct.md?raw';
  import { marked } from 'marked';

  export let show = false;

  let alertMessage = '';
  let showAlert = false;

  const dispatch = createEventDispatcher();

  let fileInput: HTMLInputElement;

  function handleImportClick() {
    fileInput.click();
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const data = Array.isArray(json) ? json : [json];
        dispatch('import', data);
      } catch (error) {
        alertMessage = 'Invalid JSON file';
        showAlert = true;
        setTimeout(() => {
          showAlert = false;
        }, 2000); // hide after 2s
      }
    };
    reader.readAsText(file);
  }

  function handleExport() {
    dispatch('export');
  }

  let htmlContent = marked.parse(jsonStruct); // Rendered HTML

  let JSONmodal: HTMLDialogElement;
  function openJSONModal() { JSONmodal.showModal();}
  function closeJSONModal() { JSONmodal.close(); }
</script>

<Alert {showAlert} message={alertMessage} />

{#if show}
  <div class="fixed inset-0 bg-black/50 z-150 flex" role="presentation" on:click={() => (show = false)} on:keydown={(e) => e.key === 'Escape' && (show = false)}>
    <div class="bg-base-100 w-80 h-full shadow-xl p-6 flex flex-col justify-between" on:click|stopPropagation on:keydown|stopPropagation role="dialog" tabindex="-1">
      <!-- Top menu buttons -->
      <div>
        <h2 class="text-2xl font-bold mb-6">Menu
        <button class="float-right cursor-pointer" on:click={() => (show = false)} aria-label="Close menu" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        </h2>
        <ul class="menu bg-base-200 rounded-box gap-1 md:gap-3">
          <li >
            <button on:click={handleImportClick} aria-label="Import JSON" class="btn btn-md btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg> Import JSON
            </button>
          </li>
          <li>
            <button on:click={handleExport} aria-label="Export data" class="btn btn-md btn-ghost">
              <svg
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current" >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg> Export JSON
            </button>
          </li>
          <li>
            <button on:click={() => dispatch('showCategories')} aria-label="Open categories" class="btn btn-md btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                class="inline-block w-5 h-5 stroke-current" >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 7h18M3 12h18M3 17h18" />
              </svg> Categories
            </button>
          </li>
          <li>
            <button on:click={openJSONModal} class="btn btn-md btn-ghost">JSON Format</button>
          </li>
        </ul>
      </div>

      <!-- Modal -->
      <dialog bind:this={JSONmodal} class="modal"
          on:click={(e) => {
            if (e.target === JSONmodal) closeJSONModal();
          }}>
        <div class="modal-box max-w-3xl w-85 md:w-full h-auto max-h-[65vh]">
          <form method="dialog">
            <button type="button" aria-label="CloseJSONmodal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-lg p-5" on:click={closeJSONModal}><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button>
          </form>
          <h3 class="font-bold mb-2">Import JSON Structure</h3>
          <div class="prose max-w-full overflow-auto text-sm">{@html htmlContent}</div>
        </div>
      </dialog>

      <div class="text-sm text-gray-500">
        <p class="font-semibold">🤖 ChatGPT × <a href="https://github.com/avinash-027/" target="_blank" class="link link-primary no-underline">User-A027</a> 👨‍💻</p>
      </div>
    </div>
  </div>
{/if}

<input type="file" accept=".json" class="hidden"
  bind:this={fileInput}
  on:change={handleFileChange}/>
