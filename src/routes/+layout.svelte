<script lang="ts">
  import './layout.css';
	import { onMount } from 'svelte';
  import { checkBackupReminder } from '$lib/services/autoBackup.service';

  onMount(() => {
    checkBackupReminder();
  });
  
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href="/lib/favicon.ico" />
</svelte:head>


{@render children()}
