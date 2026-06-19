<script lang="ts">
  import type { Assignment, Hpc, Model, Simulation } from '$lib/types';
  import type { HpcRollup } from '$lib/calc/rollup';
  import BudgetMeter from './BudgetMeter.svelte';
  import SimulationCard from './SimulationCard.svelte';

  export let hpc: Hpc;
  export let sims: Simulation[];
  export let models: Model[];
  export let hpcs: Hpc[];
  export let assignments: Assignment[];
  export let rollup: HpcRollup;
  export let onAssign: (simId: string, hpcId: string) => void;
  export let onUnassign: (simId: string) => void;
  export let onSplitChange: (simId: string, split: Record<string, number>) => void;

  function findAssignment(simId: string): Assignment | undefined {
    return assignments.find((a) => a.simulationId === simId);
  }
</script>

<section
  class="flex w-80 flex-shrink-0 flex-col rounded-lg border border-slate-300 bg-white p-3 shadow-sm"
  data-testid="hpc-lane"
  data-hpc-id={hpc.id}
>
  <header class="mb-2">
    <h2 class="text-sm font-semibold text-slate-900">{hpc.name || '(unnamed HPC)'}</h2>
  </header>

  <!-- Per-period CPU/GPU meters -->
  <div class="space-y-3 border-b border-slate-200 pb-3">
    {#each hpc.periods as period (period.id)}
      {@const pr = rollup.periods[period.id]}
      <div class="space-y-2">
        <div class="text-[11px] font-semibold text-slate-700">{period.label || period.id}</div>
        <BudgetMeter
          used={pr?.cpuUsed ?? 0}
          completed={pr?.cpuCompleted ?? 0}
          budget={pr?.cpuBudget ?? 0}
          segments={pr?.cpuSegments ?? []}
          unit="CPU h"
          label="CPU"
        />
        <BudgetMeter
          used={pr?.gpuUsed ?? 0}
          completed={pr?.gpuCompleted ?? 0}
          budget={pr?.gpuBudget ?? 0}
          segments={pr?.gpuSegments ?? []}
          unit="GPU h"
          label="GPU"
        />
      </div>
    {/each}
    {#if hpc.periods.length === 0}
      <p class="text-[11px] italic text-slate-500">No periods defined for this HPC.</p>
    {/if}
  </div>

  <!-- Cumulative storage meter (per HPC, not per period) -->
  <div class="my-3" data-testid="storage-meter-wrapper">
    <BudgetMeter
      used={rollup.storageUsedTb}
      completed={rollup.storageCompletedTb}
      budget={rollup.storageBudgetTb}
      segments={rollup.storageSegments}
      unit="TB"
      label="Storage (cumulative)"
    />
  </div>

  <!-- Assigned sims -->
  <div class="space-y-2" data-testid="lane-sims">
    {#if sims.length === 0}
      <p
        class="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-[11px] italic text-slate-500"
        data-testid="lane-empty"
      >
        No sims assigned.
      </p>
    {:else}
      {#each sims as sim (sim.id)}
        {@const assignment = findAssignment(sim.id)}
        <SimulationCard
          {sim}
          {models}
          {hpcs}
          hpcId={hpc.id}
          {assignment}
          onAssign={(targetHpcId) => onAssign(sim.id, targetHpcId)}
          onUnassign={() => onUnassign(sim.id)}
          onSplitChange={(split) => onSplitChange(sim.id, split)}
        />
      {/each}
    {/if}
  </div>
</section>
