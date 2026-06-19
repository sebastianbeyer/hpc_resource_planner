<script lang="ts">
  // Drag-and-drop uses the native HTML5 DnD API (Svelte 5 has no settled
  // svelte-dnd-action story yet). The action menus on each card remain the
  // accessible fallback for assign / unassign / move / split-edit.
  import EmptyState from '$lib/components/EmptyState.svelte';
  import HpcLane from '$lib/components/HpcLane.svelte';
  import UnassignedTray from '$lib/components/UnassignedTray.svelte';
  import {
    appState,
    assignmentsStore,
    hpcsStore,
    modelsStore,
    simulationsStore
  } from '$lib/stores/state';
  import {
    assignedByHpc,
    rollupStore,
    unassigned
  } from '$lib/stores/derived-plan';

  function assign(simId: string, hpcId: string) {
    appState.update((s) => {
      const sim = s.simulations.find((x) => x.id === simId);
      // Locked sims can only land on their pinned HPC (drag onto any other
      // lane is a no-op so the user isn't surprised).
      if (sim?.locked && sim.pinnedHpcId && sim.pinnedHpcId !== hpcId) return s;

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
    appState.update((s) => {
      const sim = s.simulations.find((x) => x.id === simId);
      if (sim?.locked) return s;
      return {
        ...s,
        assignments: s.assignments.filter((a) => a.simulationId !== simId)
      };
    });
  }

  function setSplit(simId: string, split: Record<string, number>) {
    appState.update((s) => ({
      ...s,
      assignments: s.assignments.map((a) =>
        a.simulationId === simId ? { ...a, periodSplit: split } : a
      )
    }));
  }

  function setCompleted(simId: string, completed: boolean) {
    appState.update((s) => ({
      ...s,
      simulations: s.simulations.map((sim) =>
        sim.id === simId ? { ...sim, completed } : sim
      )
    }));
  }
</script>

<div class="space-y-4">
  <header>
    <h1 class="text-2xl font-bold">Plan</h1>
    <p class="text-sm text-slate-600">
      Assign simulations to HPCs and split each assignment across periods. Drag
      cards between lanes or use each card's action menu. The budget meters
      update live.
    </p>
  </header>

  {#if $hpcsStore.length === 0}
    <div data-testid="plan-empty">
      <EmptyState
        title="No HPCs yet"
        message="Define at least one HPC in the HPC Resources tab to start planning."
      />
    </div>
  {:else if $simulationsStore.length === 0}
    <div data-testid="plan-empty-sims">
      <EmptyState
        title="No simulations yet"
        message="Add simulations in the Simulations tab to assign them to HPCs and see budgets fill up."
      />
    </div>
  {:else}
    <div class="flex gap-4 overflow-x-auto pb-4" data-testid="plan-board">
      <UnassignedTray
        sims={$unassigned}
        models={$modelsStore}
        hpcs={$hpcsStore}
        onAssign={assign}
        onUnassign={unassign}
        onCompletedChange={setCompleted}
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
          onCompletedChange={setCompleted}
        />
      {/each}
    </div>
  {/if}
</div>
