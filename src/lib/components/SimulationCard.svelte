<script lang="ts">
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

  $: model = models.find((m) => m.id === sim.modelId);
  $: hpc = hpcId ? hpcs.find((h) => h.id === hpcId) : undefined;
  $: periods = hpc?.periods ?? [];

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
    </div>

    {#if hpcId}
      <div class="flex flex-shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          class="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          on:click={() => (showSplitEditor = !showSplitEditor)}
          data-testid="edit-split"
        >
          {showSplitEditor ? 'Close' : 'Edit split'}
        </button>
        {#if !sim.locked}
          <button
            type="button"
            class="rounded border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
            on:click={() => onUnassign?.()}
            data-testid="unassign"
          >
            Unassign
          </button>
          <div class="relative">
            <button
              type="button"
              class="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
              on:click={() => (showAssignMenu = !showAssignMenu)}
              data-testid="move-to"
              aria-haspopup="menu"
              aria-expanded={showAssignMenu}
              aria-label={`Move ${sim.name || 'simulation'} to another HPC`}
            >
              Move to ▾
            </button>
            {#if showAssignMenu}
              <ul
                class="absolute right-0 z-10 mt-1 w-44 rounded border border-slate-300 bg-white p-1 shadow-lg"
                data-testid="move-menu"
                role="menu"
              >
                {#each hpcs as h (h.id)}
                  {#if h.id !== hpcId}
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class="block w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                        on:click={() => {
                          showAssignMenu = false;
                          onAssign?.(h.id);
                        }}
                        data-testid="move-to-option"
                        data-target-hpc-id={h.id}
                      >
                        {h.name || h.id}
                      </button>
                    </li>
                  {/if}
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
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
