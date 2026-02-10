<script lang="ts">
  import Alert from './Alert.svelte';
  import {
    enableAutoBackup,
    disableAutoBackup
  } from '$lib/services/autoBackup.service';

  let enabled = localStorage.getItem('autoBackupEnabled') === 'true';
  let folderName = localStorage.getItem('autoBackupFolderName');
  let showAlert = false;
  let message = '';

  async function toggle() {
    try {
      if (!enabled) {
        await enableAutoBackup();
        enabled = true;
        folderName = localStorage.getItem('autoBackupFolderName');
        message = 'Auto backup enabled (every night 12:00)';
      } else {
        disableAutoBackup();
        enabled = false;
        folderName = null;
        message = 'Auto backup disabled';
      }
    } catch {
			enabled = false; // force OFF if failed
      message = 'Backup permission denied';
    }

    showAlert = true;
    setTimeout(() => (showAlert = false), 1500);
  }
</script>

<button class="btn btn-md btn-ghost rounded-full flex justify-between py-3 px-0" on:click={toggle}>
  <span>🕛 Auto Backup</span>
  <input type="checkbox" class="toggle toggle-primary" checked={enabled} />
</button>

{#if enabled && folderName}
  <div class="text-xs text-gray-500 mt-1 pl-1">
    📁 {folderName}/lib-autobackup.json<br />⏰ Every night at 12:00 AM
  </div>
{/if}

<Alert {showAlert} message={message} />
