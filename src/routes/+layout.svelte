<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { appState } from '$lib/stores/state';
  import { attachAutosave, loadFromLocalStorage } from '$lib/stores/persistence';

  onMount(() => {
    const loaded = loadFromLocalStorage();
    if (loaded) appState.set(loaded);
    const unsub = attachAutosave(appState);
    return () => unsub();
  });
</script>

<slot />
