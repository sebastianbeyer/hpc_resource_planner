<script lang="ts">
  import { simulationCost } from '$lib/calc/cost';
  import type { Assignment, Hpc, Model, Simulation } from '$lib/types';
  import { formatHours, formatStorageTb } from '$lib/util/format';
  import PeriodSplitEditor from './PeriodSplitEditor.svelte';

  export let sim: Simulation;
  export let models: Model[];
  export let hpcs: Hpc[];
  /** If provided, this card is rendered inside an HPC lane and shows
   *  assignment-related controls (period split, unassign, etc.). */
  export let hpcId: string | undefined = undefined;
  export let assignment: Assignment | undefined = undefined;
  export let onAssign: ((hpcId: string) => void) | undefined = undefined;
  export let onUnassign: (() => void) | undefined = undefined;
  export let onSplitChange: ((split: Record<string, number>) => void) | undefined = undefined;
  export let onCompletedChange: ((completed: boolean) => void) | undefined = undefined;

  let showSplitEditor = false;
  let showAssignMenu = false;
  let showActionMenu = false;

  $: model = models.find((m) => m.id === sim.modelId);
  $: hpc = hpcId ? hpcs.find((h) => h.id === hpcId) : undefined;
  $: periods = hpc?.periods ?? [];
  $: moveTargets = hpcId ? hpcs.filter((h) => h.id !== hpcId) : [];
  $: hasPlanActions = hpcId !== undefined && assignment !== undefined;
  $: draggable = !sim.completed;

  const percentFmt = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  });

  type ResourceShare = {
    cpuHours: number;
    gpuHours: number;
    storageTb: number;
    cpuPercent: string;
    gpuPercent: string;
    storagePercent: string;
    missingCompute: boolean;
  };

  function compactSplit(split: Record<string, number> | undefined): string {
    if (!split || periods.length === 0) return '';
    const parts: string[] = [];
    for (const p of periods) {
      const f = split[p.id];
      if (f === undefined || f === 0) continue;
      parts.push(`${p.label || p.id} ${Math.round(f * 100)}%`);
    }
    return parts.join(' / ');
  }

  function handleSplitChange(split: Record<string, number>) {
    onSplitChange?.(split);
  }

  function formatPercent(used: number, budget: number): string {
    if (budget <= 0) return used === 0 ? '0%' : 'n/a';
    return `${percentFmt.format((used / budget) * 100)}%`;
  }

  function computeAppliedFraction(a: Assignment | undefined, targetHpc: Hpc): number {
    if (!a) return targetHpc.periods.length > 0 ? 1 : 0;
    const periodIds = new Set(targetHpc.periods.map((p) => p.id));
    let sum = 0;
    for (const [periodId, fraction] of Object.entries(a.periodSplit)) {
      if (periodIds.has(periodId)) sum += fraction || 0;
    }
    return sum;
  }

  $: resourceShare = (() => {
    if (!hpcId || !hpc || !model) return undefined as ResourceShare | undefined;

    const cost = simulationCost(sim, model, hpcId);
    const computeFraction = computeAppliedFraction(assignment, hpc);
    const cpuBudget = hpc.periods.reduce((acc, p) => acc + p.cpuHoursBudget, 0);
    const gpuBudget = hpc.periods.reduce((acc, p) => acc + p.gpuHoursBudget, 0);
    const cpuHours = cost.cpuHours * computeFraction;
    const gpuHours = cost.gpuHours * computeFraction;

    return {
      cpuHours,
      gpuHours,
      storageTb: cost.storageTb,
      cpuPercent: formatPercent(cpuHours, cpuBudget),
      gpuPercent: formatPercent(gpuHours, gpuBudget),
      storagePercent: formatPercent(cost.storageTb, hpc.storageBudgetTb),
      missingCompute: cost.missingCost === true
    };
  })();

  function toggleSplitEditor() {
    showSplitEditor = !showSplitEditor;
    showActionMenu = false;
  }

  function unassignFromMenu() {
    showActionMenu = false;
    onUnassign?.();
  }

  function moveFromMenu(targetHpcId: string) {
    showActionMenu = false;
    onAssign?.(targetHpcId);
  }

  function onDragStart(e: DragEvent) {
    if (!draggable || !e.dataTransfer) return;
    e.dataTransfer.setData('application/x-sim-id', sim.id);
    e.dataTransfer.setData('text/plain', sim.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onCompletedToggle(e: Event) {
    onCompletedChange?.((e.currentTarget as HTMLInputElement).checked);
  }
</script>

<article
  class="rounded border border-slate-200 bg-white p-2 shadow-sm"
  class:cursor-grab={draggable}
  class:opacity-75={sim.completed}
  {draggable}
  on:dragstart={onDragStart}
  data-testid="simulation-card"
  data-sim-id={sim.id}
>
  <header class="flex items-start justify-between gap-2">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span class="truncate text-sm font-semibold text-slate-900">
          {sim.name || '(unnamed)'}
        </span>
        {#if sim.packageLabel}
          <span
            class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
            data-testid="package-badge"
          >
            {sim.packageLabel}
          </span>
        {/if}
      </div>
      <p class="mt-0.5 text-[11px] text-slate-600">
        <span>{model?.name ?? '(no model)'}</span>
        <span> · {sim.resolution || '(no resolution)'}</span>
        <span> · {sim.lengthYears}y × {sim.ensembles}</span>
        {#if hpcId && assignment}
          {@const split = compactSplit(assignment.periodSplit)}
          {#if split}
            <span class="font-mono text-slate-700" data-testid="card-split">
              · {split}
            </span>
          {/if}
        {/if}
      </p>
      {#if hpcId && resourceShare}
        {@const r = resourceShare}
        {@const showCpu = !r.missingCompute && r.cpuHours > 0}
        {@const showGpu = !r.missingCompute && r.gpuHours > 0}
        <p
          class="mt-1 text-[11px] text-slate-600"
          data-testid="card-resources"
        >
          {#if r.missingCompute}
            <span data-testid="card-compute-share" data-missing="true">
              Compute —
            </span>
          {:else if showCpu || showGpu}
            <span data-testid="card-compute-share" data-missing="false">
              Compute
              {#if showCpu}
                <span data-testid="card-cpu-share">
                  CPU: {formatHours(r.cpuHours)} ({r.cpuPercent})
                </span>
              {/if}
              {#if showGpu}
                <span data-testid="card-gpu-share">
                  GPU: {formatHours(r.gpuHours)} ({r.gpuPercent})
                </span>
              {/if}
            </span>
          {/if}
          <span data-testid="card-storage-share">
            {#if (showCpu || showGpu || r.missingCompute)}·{/if}
            Storage: {formatStorageTb(r.storageTb)} ({r.storagePercent})
          </span>
        </p>
      {/if}
    </div>

    <div class="flex flex-shrink-0 items-center gap-1.5">
      <label
        class="flex items-center gap-1 text-[10px] font-medium text-slate-600"
        title="Mark this simulation as completed"
      >
        <input
          type="checkbox"
          class="h-3 w-3"
          checked={sim.completed}
          on:change={onCompletedToggle}
          disabled={onCompletedChange === undefined}
          data-testid="card-completed"
          aria-label={`Completed: ${sim.name || 'simulation'}`}
        />
        Done
      </label>

      {#if hpcId && hasPlanActions}
        <div class="relative">
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold leading-none text-slate-700 hover:bg-slate-100"
            on:click={() => (showActionMenu = !showActionMenu)}
            data-testid="card-actions"
            aria-haspopup="menu"
            aria-expanded={showActionMenu}
            aria-label={`Actions for ${sim.name || 'simulation'}`}
          >
            ...
          </button>
          {#if showActionMenu}
            <ul
              class="absolute right-0 z-10 mt-1 w-48 rounded border border-slate-300 bg-white p-1 shadow-lg"
              data-testid="card-actions-menu"
              role="menu"
            >
              {#if assignment}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="block w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                    on:click={toggleSplitEditor}
                    data-testid="edit-split"
                  >
                    {showSplitEditor ? 'Close split editor' : 'Edit split'}
                  </button>
                </li>
              {/if}
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="block w-full rounded px-2 py-1 text-left text-[11px] text-red-700 hover:bg-red-50"
                  on:click={unassignFromMenu}
                  data-testid="unassign"
                >
                  Unassign
                </button>
              </li>
              {#if moveTargets.length > 0}
                <li
                  class="mt-1 border-t border-slate-200 px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                  role="none"
                >
                  Move to
                </li>
                {#each moveTargets as h (h.id)}
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      class="block w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                      on:click={() => moveFromMenu(h.id)}
                      data-testid="move-to-option"
                      data-target-hpc-id={h.id}
                    >
                      {h.name || h.id}
                    </button>
                  </li>
                {/each}
              {/if}
            </ul>
          {/if}
        </div>
      {:else if !hpcId}
        <div class="relative">
          <button
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            on:click={() => (showAssignMenu = !showAssignMenu)}
            data-testid="assign-to"
            disabled={hpcs.length === 0}
            aria-haspopup="menu"
            aria-expanded={showAssignMenu}
            aria-label={`Assign ${sim.name || 'simulation'} to an HPC`}
          >
            Assign to ▾
          </button>
          {#if showAssignMenu}
            <ul
              class="absolute right-0 z-10 mt-1 w-44 rounded border border-slate-300 bg-white p-1 shadow-lg"
              data-testid="assign-menu"
              role="menu"
            >
              {#each hpcs as h (h.id)}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    class="block w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                    on:click={() => {
                      showAssignMenu = false;
                      onAssign?.(h.id);
                    }}
                    data-testid="assign-option"
                    data-target-hpc-id={h.id}
                  >
                    {h.name || h.id}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  {#if hpcId && assignment && showSplitEditor}
    <div class="mt-2">
      <PeriodSplitEditor
        {assignment}
        {periods}
        onChange={handleSplitChange}
      />
    </div>
  {/if}
</article>
