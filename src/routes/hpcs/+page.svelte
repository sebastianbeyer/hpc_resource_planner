<script lang="ts">
  import EmptyState from '$lib/components/EmptyState.svelte';
  import HpcEditor from '$lib/components/HpcEditor.svelte';
  import { cascadeDeleteHpc, describeHpcDelete } from '$lib/cascade';
  import { appState, hpcsStore } from '$lib/stores/state';
  import { pushToast } from '$lib/stores/toast';
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
    // Look up the HPC and impact in a single update-as-read pass.
    let hpcName = 'untitled';
    let impact = {
      assignmentCount: 0,
      lockedSimCount: 0,
      computeCostColumnCount: 0
    };
    appState.update((s) => {
      const found = s.hpcs.find((h) => h.id === id);
      if (found) hpcName = found.name || 'untitled';
      impact = describeHpcDelete(s, id);
      return s;
    });

    const refParts: string[] = [];
    if (impact.assignmentCount > 0) {
      refParts.push(
        `${impact.assignmentCount} assignment${impact.assignmentCount === 1 ? '' : 's'}`
      );
    }
    if (impact.lockedSimCount > 0) {
      refParts.push(
        `${impact.lockedSimCount} locked simulation${impact.lockedSimCount === 1 ? '' : 's'}`
      );
    }
    if (impact.computeCostColumnCount > 0) {
      refParts.push(
        `${impact.computeCostColumnCount} compute cost entr${impact.computeCostColumnCount === 1 ? 'y' : 'ies'}`
      );
    }

    const prompt =
      refParts.length === 0
        ? `Delete HPC "${hpcName}"?`
        : `"${hpcName}" has ${refParts.join(', ')} referencing it. They will be unassigned/unpinned and the compute cost entries removed. Delete anyway?`;

    if (!window.confirm(prompt)) return;
    appState.update((s) => cascadeDeleteHpc(s, id));
    pushToast({
      kind: 'success',
      message: `Deleted HPC "${hpcName}".`
    });
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
    <EmptyState
      title="No HPCs yet"
      message="Add an HPC to start defining storage budgets and per-period compute allocations."
      actionLabel="+ Add HPC"
      onAction={addHpc}
    />
  {:else}
    <div class="space-y-4">
      {#each $hpcsStore as hpc (hpc.id)}
        <HpcEditor {hpc} onChange={updateHpc} onDelete={() => deleteHpc(hpc.id)} />
      {/each}
    </div>
  {/if}
</div>
