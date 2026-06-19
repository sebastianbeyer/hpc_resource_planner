<script lang="ts">
  import type { Assignment, Hpc, Model, Simulation } from '$lib/types';
  import type { HpcRollup, MeterSegment } from '$lib/calc/rollup';
  import { setPeriodDoneOpen, uiPrefs } from '$lib/stores/ui-prefs';
  import { formatHours, formatStorageTb } from '$lib/util/format';
  import BudgetMeter from './BudgetMeter.svelte';
  import SimulationCard from './SimulationCard.svelte';

  export let hpc: Hpc;
  export let sims: Simulation[];
  export let models: Model[];
  export let hpcs: Hpc[];
  export let assignments: Assignment[];
  export let rollup: HpcRollup;
  export let onAssignToPeriod: (simId: string, hpcId: string, periodId: string) => void;
  export let onUnassign: (simId: string) => void;
  export let onSplitChange: (simId: string, split: Record<string, number>) => void;
  export let onCompletedChange: (simId: string, completed: boolean) => void;

  let dragOverPeriod: string | null = null;
  let showPlanned: Record<string, boolean> = {};
  $: showDone = $uiPrefs.periodDoneOpen;

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

  function simsForPeriod(periodId: string): Simulation[] {
    return sims.filter((sim) => {
      const a = findAssignment(sim.id);
      const f = a?.periodSplit[periodId];
      return typeof f === 'number' && f > 0;
    });
  }

  function readSimId(e: DragEvent): string | undefined {
    const id =
      e.dataTransfer?.getData('application/x-sim-id') ||
      e.dataTransfer?.getData('text/plain');
    return id || undefined;
  }

  function onPeriodDragOver(e: DragEvent, periodId: string) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverPeriod = periodId;
  }

  function onPeriodDragLeave(e: DragEvent) {
    if (e.currentTarget === e.target) dragOverPeriod = null;
  }

  function onPeriodDrop(e: DragEvent, periodId: string) {
    e.preventDefault();
    dragOverPeriod = null;
    const simId = readSimId(e);
    if (simId) onAssignToPeriod(simId, hpc.id, periodId);
  }
</script>

<section
  class="flex min-w-[18rem] flex-1 basis-0 flex-col rounded-lg border border-slate-300 bg-white p-3 shadow-sm"
  aria-label={`HPC lane: ${hpc.name || 'unnamed HPC'}`}
  data-testid="hpc-lane"
  data-hpc-id={hpc.id}
>
  <header class="mb-2">
    <h2 class="text-sm font-semibold text-slate-900">{hpc.name || '(unnamed HPC)'}</h2>
  </header>

  <!-- Cumulative storage meter (per HPC, not per period) -->
  <div class="mb-3 border-b border-slate-200 pb-3" data-testid="storage-meter-wrapper">
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

  {#if hpc.periods.length === 0}
    <p class="text-[11px] italic text-slate-500">No periods defined for this HPC.</p>
  {:else}
    {#each hpc.periods as period, idx (period.id)}
      {@const pr = rollup.periods[period.id]}
      {@const periodSims = simsForPeriod(period.id)}
      {@const pending = periodSims.filter((s) => !s.completed)}
      {@const done = periodSims.filter((s) => s.completed)}
      {@const isDragOver = dragOverPeriod === period.id}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="rounded-md border p-2"
        class:border-transparent={!isDragOver}
        class:border-sky-500={isDragOver}
        class:bg-sky-50={isDragOver}
        class:ring-2={isDragOver}
        class:ring-sky-200={isDragOver}
        class:mt-3={idx > 0}
        class:border-t={idx > 0 && !isDragOver}
        class:border-t-slate-200={idx > 0 && !isDragOver}
        on:dragover={(e) => onPeriodDragOver(e, period.id)}
        on:dragleave={onPeriodDragLeave}
        on:drop={(e) => onPeriodDrop(e, period.id)}
        data-testid="period-section"
        data-period-id={period.id}
        data-drag-over={isDragOver ? 'true' : 'false'}
      >
        <div class="mb-2 text-[11px] font-semibold text-slate-700">
          {period.label || period.id}
        </div>
        <div class="space-y-2">
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

        <div class="mt-3 space-y-2" data-testid="period-sims">
          {#if periodSims.length === 0}
            <p
              class="rounded border border-dashed border-slate-300 bg-slate-50 p-2 text-center text-[11px] italic text-slate-500"
              data-testid="period-empty"
            >
              Drop a card here to assign to {period.label || period.id}.
            </p>
          {:else}
            {#if pending.length > 0}
              {@const plannedExpanded = showPlanned[period.id] ?? true}
              <button
                type="button"
                class="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                on:click={() => (showPlanned = { ...showPlanned, [period.id]: !plannedExpanded })}
                data-testid="period-toggle-planned"
                data-period-id={period.id}
                aria-expanded={plannedExpanded}
              >
                <span>{plannedExpanded ? '▼' : '▶'} Planned</span>
                <span class="text-slate-500">{pending.length}</span>
              </button>
              {#if plannedExpanded}
                <div
                  class="mt-2 space-y-2"
                  data-testid="period-planned-section"
                  data-period-id={period.id}
                >
                  {#each pending as sim (sim.id)}
                    {@const assignment = findAssignment(sim.id)}
                    <SimulationCard
                      {sim}
                      {models}
                      {hpcs}
                      hpcId={hpc.id}
                      periodId={period.id}
                      {assignment}
                      onAssignToPeriod={(targetHpcId, targetPeriodId) =>
                        onAssignToPeriod(sim.id, targetHpcId, targetPeriodId)}
                      onUnassign={() => onUnassign(sim.id)}
                      onSplitChange={(split) => onSplitChange(sim.id, split)}
                      onCompletedChange={(completed) => onCompletedChange(sim.id, completed)}
                    />
                  {/each}
                </div>
              {/if}
            {/if}

            {#if done.length > 0}
              {@const expanded = showDone[period.id] ?? false}
              <div class="mt-2 border-t border-slate-200 pt-2">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  on:click={() => setPeriodDoneOpen(period.id, !expanded)}
                  data-testid="period-toggle-done"
                  data-period-id={period.id}
                  aria-expanded={expanded}
                >
                  <span>{expanded ? '▼' : '▶'} Done</span>
                  <span class="text-slate-500">{done.length}</span>
                </button>
                {#if expanded}
                  <div
                    class="mt-2 space-y-2"
                    data-testid="period-done-section"
                    data-period-id={period.id}
                  >
                    {#each done as sim (sim.id)}
                      {@const assignment = findAssignment(sim.id)}
                      <SimulationCard
                        {sim}
                        {models}
                        {hpcs}
                        hpcId={hpc.id}
                        periodId={period.id}
                        {assignment}
                        onAssignToPeriod={(targetHpcId, targetPeriodId) =>
                          onAssignToPeriod(sim.id, targetHpcId, targetPeriodId)}
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
      </div>
    {/each}
  {/if}
</section>
