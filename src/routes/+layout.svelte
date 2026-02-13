<script lang="ts">
  import './layout.css';
	import { onMount } from 'svelte';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href="/lib/favicon.ico" />
</svelte:head>


{@render children()}
