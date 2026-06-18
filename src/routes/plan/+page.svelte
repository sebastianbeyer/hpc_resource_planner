<script lang="ts">
  // NOTE: The plan in docs/plans/20260618-hpc-resource-planner.md originally
  // called for drag-and-drop via `svelte-dnd-action`. That library only
  // documents Svelte 3/4 support and the wider ecosystem hasn't settled on a
  // Svelte 5 story for it yet, so per the task's explicit fallback we use a
  // click-driven "Assign to ▾" / "Move to ▾" menu instead. Functionality —
  // assigning, unassigning, moving, period split editing — is preserved.
  import HpcLane from '$lib/components/HpcLane.svelte';
  import UnassignedTray from '$lib/components/UnassignedTray.svelte';
  import {
    appState,
    assignmentsStore,
    hpcsStore,
    modelsStore
  } from '$lib/stores/state';
  import {
    assignedByHpc,
    rollupStore,
    unassigned
  } from '$lib/stores/derived-plan';

  function assign(simId: string, hpcId: string) {
    appState.update((s) => {
      const without = s.assignments.filter((a) => a.simulationId !== simId);
      const hpc = s.hpcs.find((h) => h.id === hpcId);
      const firstPeriod = hpc?.periods[0]?.id;
      const periodSplit: Record<string, number> = firstPeriod
        ? { [firstPeriod]: 1 }
        : {};
      return {
        ...s,
        assignments: [...without, { simulationId: simId, hpcId, periodSplit }]
      };
    });
  }

  function unassign(simId: string) {
    appState.update((s) => ({
      ...s,
      assignments: s.assignments.filter((a) => a.simulationId !== simId)
    }));
  }

  function setSplit(simId: string, split: Record<string, number>) {
    appState.update((s) => ({
      ...s,
      assignments: s.assignments.map((a) =>
        a.simulationId === simId ? { ...a, periodSplit: split } : a
      )
    }));
  }
</script>

<div class="space-y-4">
  <header>
    <h1 class="text-2xl font-bold">Plan</h1>
    <p class="text-sm text-slate-600">
      Assign simulations to HPCs and split each assignment across periods. The
      budget meters update live.
    </p>
  </header>

  {#if $hpcsStore.length === 0}
    <p
      class="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
      data-testid="plan-empty"
    >
      No HPCs yet — define one in the HPC Resources tab to start planning.
    </p>
  {:else}
    <div class="flex gap-4 overflow-x-auto pb-4" data-testid="plan-board">
      <UnassignedTray
        sims={$unassigned}
        models={$modelsStore}
        hpcs={$hpcsStore}
        onAssign={assign}
      />
      {#each $hpcsStore as hpc (hpc.id)}
        <HpcLane
          {hpc}
          sims={$assignedByHpc[hpc.id] ?? []}
          models={$modelsStore}
          hpcs={$hpcsStore}
          assignments={$assignmentsStore}
          rollup={$rollupStore[hpc.id]}
          onAssign={assign}
          onUnassign={unassign}
          onSplitChange={setSplit}
        />
      {/each}
    </div>
  {/if}
</div>
