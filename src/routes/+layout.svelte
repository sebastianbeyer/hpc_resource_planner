<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { appState } from '$lib/stores/state';
  import { attachAutosave, loadFromLocalStorage } from '$lib/stores/persistence';
  import TabBar from '$lib/components/TabBar.svelte';
  import Toast from '$lib/components/Toast.svelte';

  onMount(() => {
    const loaded = loadFromLocalStorage();
    if (loaded) appState.set(loaded);
    const unsub = attachAutosave(appState);
    return () => unsub();
  });
</script>

<div class="min-h-screen bg-slate-50 text-slate-900">
  <TabBar />
  <main class="mx-auto max-w-6xl px-4 py-6">
    <slot />
  </main>
  <Toast />
</div>
