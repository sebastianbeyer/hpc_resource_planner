<script lang="ts">
  import { simulationCost } from '$lib/calc/cost';
  import type { Assignment, Hpc, Model, Simulation } from '$lib/types';
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

  let showSplitEditor = false;
  let showAssignMenu = false;
  let showActionMenu = false;

  $: model = models.find((m) => m.id === sim.modelId);
  $: hpc = hpcId ? hpcs.find((h) => h.id === hpcId) : undefined;
  $: periods = hpc?.periods ?? [];
  $: moveTargets = hpcId ? hpcs.filter((h) => h.id !== hpcId) : [];
  $: hasPlanActions = hpcId !== undefined && (assignment !== undefined || !sim.locked);

  const percentFmt = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  });

  type BudgetShare = {
    compute: string;
    storage: string;
    missingCompute: boolean;
  };

  function compactSplit(split: Record<string, number> | undefined): string {
    if (!split || periods.length === 0) return '—';
    const parts: string[] = [];
    for (const p of periods) {
      const f = split[p.id];
      if (f === undefined || f === 0) continue;
      parts.push(`${p.label || p.id} ${Math.round(f * 100)}%`);
    }
    return parts.length === 0 ? '—' : parts.join(' / ');
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

  $: budgetShare = (() => {
    if (!hpcId || !hpc || !model) return undefined as BudgetShare | undefined;

    const cost = simulationCost(sim, model, hpcId);
    const computeFraction = computeAppliedFraction(assignment, hpc);
    const cpuBudget = hpc.periods.reduce((acc, p) => acc + p.cpuHoursBudget, 0);
    const gpuBudget = hpc.periods.reduce((acc, p) => acc + p.gpuHoursBudget, 0);
    const cpuShare = formatPercent(cost.cpuHours * computeFraction, cpuBudget);
    const gpuShare = formatPercent(cost.gpuHours * computeFraction, gpuBudget);

    return {
      compute: cost.missingCost ? '—' : `CPU ${cpuShare} / GPU ${gpuShare}`,
      storage: formatPercent(cost.storageTb, hpc.storageBudgetTb),
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
</script>

<article
  class="rounded border border-slate-200 bg-white p-3 shadow-sm"
  class:cursor-grab={!sim.locked && !hpcId}
  data-testid="simulation-card"
  data-sim-id={sim.id}
  data-locked={sim.locked ? 'true' : 'false'}
>
  <header class="flex flex-wrap items-start justify-between gap-2">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="truncate text-sm font-semibold text-slate-900">
          {sim.name || '(unnamed)'}
        </span>
        {#if sim.locked}
          <span
            class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
            data-testid="lock-icon"
            title="Locked simulation"
          >
            🔒 LOCKED
          </span>
        {/if}
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
        {model?.name ?? '(no model)'} · {sim.resolution || '(no resolution)'} ·
        {sim.lengthYears}y × {sim.ensembles}
      </p>
      {#if hpcId && assignment}
        <p class="mt-1 text-[11px] font-mono text-slate-700" data-testid="card-split">
          {compactSplit(assignment.periodSplit)}
        </p>
      {/if}
      {#if hpcId && budgetShare}
        <p
          class="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-600"
          data-testid="card-budget-share"
        >
          <span data-testid="card-compute-share" data-missing={budgetShare.missingCompute}>
            Compute {budgetShare.compute}
          </span>
          <span data-testid="card-storage-share">Storage {budgetShare.storage}</span>
        </p>
      {/if}
    </div>

    {#if hpcId && hasPlanActions}
      <div class="relative flex-shrink-0">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold leading-none text-slate-700 hover:bg-slate-100"
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
            {#if !sim.locked}
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
            {/if}
          </ul>
        {/if}
      </div>
    {:else if !hpcId}
      <div class="relative flex-shrink-0">
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
  </header>

  {#if hpcId && assignment && showSplitEditor}
    <div class="mt-3">
      <PeriodSplitEditor
        {assignment}
        {periods}
        onChange={handleSplitChange}
      />
    </div>
  {/if}
</article>
