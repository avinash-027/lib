<script>
  import { onMount } from 'svelte';
  export let showInstallBtn = false;
  
  let deferredPrompt = null;
  
  onMount(() => {
    // Check global deferredPrompt set by app.html
    deferredPrompt = window.deferredPrompt;
    if (deferredPrompt) {
      showInstallBtn = true;
      console.log('Install button enabled!');
    }
  });
  
  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);
    showInstallBtn = false;
    deferredPrompt = null;
    window.deferredPrompt = null;
  }
</script>

{#if showInstallBtn}
  <button on:click={installApp} class="fixed bottom-4 right-4 btn btn-primary z-50">
    Install App
  </button>
{/if}
