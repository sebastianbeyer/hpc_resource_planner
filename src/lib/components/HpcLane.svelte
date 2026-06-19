<script lang="ts">
  import type { Assignment, Hpc, Model, Simulation } from '$lib/types';
  import type { HpcRollup, MeterSegment } from '$lib/calc/rollup';
  import { formatHours, formatStorageTb } from '$lib/util/format';
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
  export let onCompletedChange: (simId: string, completed: boolean) => void;

  let dragOver = false;
  let showDone = true;

  function findAssignment(simId: string): Assignment | undefined {
    return assignments.find((a) => a.simulationId === simId);
  }

  // Done segments first, then planning; sort by model name within each group.
  // Mirrors the Plan tab's done-then-planning convention so the bar layout
  // matches the assigned-sim list below.
  function sortSegments(segs: MeterSegment[]): MeterSegment[] {
    return [...segs].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      return a.modelName.localeCompare(b.modelName);
    });
  }

  $: pendingSims = sims.filter((s) => !s.completed);
  $: doneSims = sims.filter((s) => s.completed);

  function readSimId(e: DragEvent): string | undefined {
    const id =
      e.dataTransfer?.getData('application/x-sim-id') ||
      e.dataTransfer?.getData('text/plain');
    return id || undefined;
  }

  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOver = true;
  }

  function onDragLeave(e: DragEvent) {
    // Only clear when leaving the lane element itself, not entering a child.
    if (e.currentTarget === e.target) dragOver = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const simId = readSimId(e);
    if (simId) onAssign(simId, hpc.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
  class="flex w-80 flex-shrink-0 flex-col rounded-lg border bg-white p-3 shadow-sm"
  class:border-slate-300={!dragOver}
  class:border-sky-500={dragOver}
  class:ring-2={dragOver}
  class:ring-sky-200={dragOver}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  aria-label={`HPC lane: ${hpc.name || 'unnamed HPC'}`}
  data-testid="hpc-lane"
  data-hpc-id={hpc.id}
  data-drag-over={dragOver ? 'true' : 'false'}
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
          segments={sortSegments(pr?.cpuSegments ?? [])}
          unit="CPU h"
          label="CPU"
          formatValue={formatHours}
        />
        <BudgetMeter
          used={pr?.gpuUsed ?? 0}
          completed={pr?.gpuCompleted ?? 0}
          budget={pr?.gpuBudget ?? 0}
          segments={sortSegments(pr?.gpuSegments ?? [])}
          unit="GPU h"
          label="GPU"
          formatValue={formatHours}
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
      segments={sortSegments(rollup.storageSegments)}
      unit="TB"
      label="Storage (cumulative)"
      formatValue={formatStorageTb}
    />
  </div>

  <!-- Assigned sims -->
  <div class="space-y-2" data-testid="lane-sims">
    {#if sims.length === 0}
      <p
        class="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-[11px] italic text-slate-500"
        data-testid="lane-empty"
      >
        No sims assigned. Drop a card here to assign.
      </p>
    {:else}
      {#each pendingSims as sim (sim.id)}
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
          onCompletedChange={(completed) => onCompletedChange(sim.id, completed)}
        />
      {/each}

      {#if doneSims.length > 0}
        <div class="mt-3 border-t border-slate-200 pt-2">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            on:click={() => (showDone = !showDone)}
            data-testid="lane-toggle-done"
            aria-expanded={showDone}
          >
            <span>{showDone ? '▼' : '▶'} Done</span>
            <span class="text-slate-500">{doneSims.length}</span>
          </button>
          {#if showDone}
            <div class="mt-2 space-y-2" data-testid="lane-done-section">
              {#each doneSims as sim (sim.id)}
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
                  onCompletedChange={(completed) => onCompletedChange(sim.id, completed)}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</section>
