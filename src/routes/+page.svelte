<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto(resolve('/hpcs'), { replaceState: true });
  });
</script>

<p class="text-sm text-slate-600">Loading…</p>
