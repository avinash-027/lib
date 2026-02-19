<!-- src\lib\components\DrawerMenu.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import jsonStruct from '$lib/assets/jsonStruct.md?raw';
  import { marked } from 'marked';
  import { Svg } from '$lib/index';

  import Alert from './Alert.svelte';
  import AutoBackupButton from './AutoBackupButton.svelte';

  export let show = false;

  let alertMessage = '';
  let showAlert = false;

  const dispatch = createEventDispatcher();

  let fileInput: HTMLInputElement;

  export let importing = false;

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
        setTimeout(() => { showAlert = false; }, 2000);
        // hide after 2s
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
        <button class="float-right cursor-pointer" on:click={() => (show = false)} aria-label="Close menu" type="button"> {@html Svg.circleClose}
        </button>
        </h2>
        <ul class="menu bg-base-200 rounded-box gap-1 md:gap-3">
          <li >
            <button on:click={handleImportClick} aria-label="Import JSON" class="btn btn-md btn-ghost">
              {@html Svg.import} Import JSON 
            </button>
          </li>
                <li>
                <button on:click={handleExport} aria-label="Export data" class="btn btn-md btn-ghost"> {@html Svg.export} Export JSON </button>
                </li>
                <li>
                <button class="btn btn-md btn-ghost" on:click={() => dispatch('exportMd')} aria-label="Export Markdown" > {@html Svg.export} Export Md </button>
                </li>
          <li>
            <button on:click={() => dispatch('showCategories')} aria-label="Open categories" class="btn btn-md btn-ghost">
              {@html Svg.category} Categories
            </button>
          </li>
          <li>
            <button on:click={openJSONModal} class="btn btn-md btn-ghost">JSON Format</button>
          </li>
        </ul>
        {#if importing}
        <div class="text-left p-4 gap-1"><span class="loading loading-bars loading-sm text-primary"></span>Importing<span class="loading loading-bars loading-sm text-primary"></span></div>
        {/if}
      </div>

      <!-- Modal -->
      <dialog bind:this={JSONmodal} class="modal"
          on:click={(e) => {
            if (e.target === JSONmodal) closeJSONModal();
          }}>
        <div class="modal-box max-w-3xl w-85 md:w-full h-auto max-h-[65vh]">
          <form method="dialog">
            <button type="button" aria-label="CloseJSONmodal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-lg p-5" on:click={closeJSONModal}>{@html Svg.circleClose}</button>
          </form>
          <h3 class="font-bold mb-2">Import JSON Structure</h3>
          <div class="prose max-w-full overflow-auto text-sm">{@html htmlContent}</div>
        </div>
      </dialog>

      <div class="text-sm text-gray-500 disable">

        <!-- <AutoBackupButton /> -->
        <div class="divider"></div>
        <p class="font-semibold my-4">🤖 AI × <a href="https://github.com/avinash-027/" target="_blank" class="link link-primary no-underline">User-A027</a> 👨‍💻</p>
      </div>
    </div>
  </div>
{/if}

<input type="file" accept=".json" class="hidden"
  bind:this={fileInput}
  on:change={handleFileChange}/>
