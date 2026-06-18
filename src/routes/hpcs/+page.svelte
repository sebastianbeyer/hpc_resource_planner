<script lang="ts">
  import HpcEditor from '$lib/components/HpcEditor.svelte';
  import { appState, hpcsStore } from '$lib/stores/state';
  import type { Hpc } from '$lib/types';
  import { newId } from '$lib/util/id';

  function addHpc() {
    const hpc: Hpc = {
      id: newId(),
      name: 'New HPC',
      storageBudgetTb: 0,
      periods: []
    };
    appState.update((s) => ({ ...s, hpcs: [...s.hpcs, hpc] }));
  }

  function updateHpc(next: Hpc) {
    appState.update((s) => ({
      ...s,
      hpcs: s.hpcs.map((h) => (h.id === next.id ? next : h))
    }));
  }

  function deleteHpc(id: string) {
    appState.update((s) => ({ ...s, hpcs: s.hpcs.filter((h) => h.id !== id) }));
  }
</script>

<div class="space-y-4">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">HPC Resources</h1>
      <p class="text-sm text-slate-600">
        Define each HPC, its storage budget, and the periods (e.g. years) over
        which compute is allocated.
      </p>
    </div>
    <button
      type="button"
      class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      on:click={addHpc}
      data-testid="add-hpc"
    >
      + Add HPC
    </button>
  </header>

  {#if $hpcsStore.length === 0}
    <p class="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      No HPCs yet. Add one to get started.
    </p>
  {:else}
    <div class="space-y-4">
      {#each $hpcsStore as hpc (hpc.id)}
        <HpcEditor {hpc} onChange={updateHpc} onDelete={() => deleteHpc(hpc.id)} />
      {/each}
    </div>
  {/if}
</div>
