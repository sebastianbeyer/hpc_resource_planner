<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/hpcs', { replaceState: true });
  });
</script>

<p class="text-sm text-slate-600">Loading…</p>
