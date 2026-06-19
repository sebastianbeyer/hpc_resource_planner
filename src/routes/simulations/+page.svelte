<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SimulationEditor from '$lib/components/SimulationEditor.svelte';
  import SimulationTotals from '$lib/components/SimulationTotals.svelte';
  import { packageCost } from '$lib/calc/cost';
  import {
    appState,
    dataPortfoliosStore,
    hpcsStore,
    modelsStore,
    resolutionsStore,
    simulationsStore,
  } from '$lib/stores/state';
  import type { Simulation } from '$lib/types';
  import { newId } from '$lib/util/id';

  const UNGROUPED = '__ungrouped__';
  // Start every existing sim collapsed on mount; sims added/duplicated later
  // stay expanded (addSimulation/duplicateSim explicitly exclude their new id).
  // The deferred timer lets the layout's onMount populate the store from
  // localStorage first — the layout's onMount fires after this page's, so a
  // synchronous read here would see the default empty state.
  let collapsedSimIds = new Set<string>();

  onMount(() => {
    const t = setTimeout(() => {
      collapsedSimIds = new Set($simulationsStore.map((s) => s.id));
    }, 0);
    return () => clearTimeout(t);
  });

  function addSimulation() {
    const sim: Simulation = {
      id: newId(),
      name: 'New Simulation',
      modelId: '',
      resolution: '',
      lengthYears: 1,
      ensembles: 1,
      dataPortfolio: '',
      overheadMultiplier: 1.15,
      completed: false,
    };
    appState.update((s) => ({ ...s, simulations: [...s.simulations, sim] }));

    collapsedSimIds = withoutCollapsedId(collapsedSimIds, sim.id);
  }

  function updateSim(next: Simulation) {
    appState.update((s) => ({
      ...s,
      simulations: s.simulations.map((sim) =>
        sim.id === next.id ? next : sim,
      ),
    }));
  }

  function deleteSim(id: string) {
    appState.update((s) => ({
      ...s,
      simulations: s.simulations.filter((sim) => sim.id !== id),
    }));

    collapsedSimIds = withoutCollapsedId(collapsedSimIds, id);
  }

  function duplicateSim(source: Simulation) {
    const copy: Simulation = {
      ...source,
      id: newId(),
      name: duplicatedName(source.name),
    };

    appState.update((s) => {
      const insertAfter = s.simulations.findIndex(
        (sim) => sim.id === source.id,
      );
      const simulations = [...s.simulations];
      simulations.splice(
        insertAfter >= 0 ? insertAfter + 1 : simulations.length,
        0,
        copy,
      );
      return { ...s, simulations };
    });

    collapsedSimIds = withoutCollapsedId(collapsedSimIds, copy.id);
  }

  function duplicatedName(name: string) {
    const base = name.trim() || 'Simulation';
    return `${base} copy`;
  }

  function toggleSim(id: string) {
    const next = new Set(collapsedSimIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    collapsedSimIds = next;
  }

  function withoutCollapsedId(ids: Set<string>, id: string) {
    if (!ids.has(id)) return ids;
    const next = new Set(ids);
    next.delete(id);
    return next;
  }

  function modelName(sim: Simulation) {
    return (
      $modelsStore.find((model) => model.id === sim.modelId)?.name || 'No model'
    );
  }

  function simSummary(sim: Simulation) {
    const resolution = sim.resolution || 'No resolution';
    const portfolio = sim.dataPortfolio || 'No portfolio';
    return `${modelName(sim)} · ${resolution} · ${floatFmt.format(sim.lengthYears)} years × ${intFmt.format(sim.ensembles)} ensembles · ${portfolio}`;
  }

  // Group simulations by packageLabel. Ungrouped first, then non-empty labels
  // sorted alphabetically.
  $: groups = (() => {
    const buckets = new Map<string, Simulation[]>();
    for (const sim of $simulationsStore) {
      const key =
        sim.packageLabel && sim.packageLabel.trim().length > 0
          ? sim.packageLabel
          : UNGROUPED;
      const arr = buckets.get(key) ?? [];
      arr.push(sim);
      buckets.set(key, arr);
    }
    const labelKeys = [...buckets.keys()]
      .filter((k) => k !== UNGROUPED)
      .sort((a, b) => a.localeCompare(b));
    const ordered: { key: string; label: string; sims: Simulation[] }[] = [];
    if (buckets.has(UNGROUPED)) {
      ordered.push({
        key: UNGROUPED,
        label: 'Ungrouped',
        sims: buckets.get(UNGROUPED)!,
      });
    }
    for (const k of labelKeys) {
      ordered.push({ key: k, label: k, sims: buckets.get(k)! });
    }
    return ordered;
  })();

  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const floatFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
</script>

<div class="space-y-4">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Simulations</h1>
      <p class="text-sm text-slate-600">
        Define each simulation and group it into a package (optional). Totals
        are computed live from the model cost definitions.
      </p>
    </div>
    <button
      type="button"
      class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      on:click={addSimulation}
      data-testid="add-simulation"
    >
      + Add Simulation
    </button>
  </header>

  {#if $simulationsStore.length === 0}
    <div data-testid="sims-empty">
      <EmptyState
        title="No simulations yet"
        message="Add a simulation to compute totals from your model cost definitions."
        actionLabel="+ Add Simulation"
        onAction={addSimulation}
      />
    </div>
  {:else}
    {#each groups as group (group.key)}
      <section
        class="space-y-3 rounded-lg border border-slate-200 bg-slate-100/60 p-3"
        data-testid="sim-group"
        data-group-label={group.key === '__ungrouped__' ? '' : group.label}
      >
        <header class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-slate-800">
            {group.label}
            <span class="ml-1 text-xs font-normal text-slate-500">
              ({group.sims.length})
            </span>
          </h2>
          {#if $hpcsStore.length > 0}
            <div
              class="flex flex-wrap gap-2 text-xs text-slate-700"
              data-testid="package-totals"
            >
              {#each $hpcsStore as hpc (hpc.id)}
                {@const total = packageCost(group.sims, $modelsStore, hpc.id)}
                <span
                  class="rounded border border-slate-300 bg-white px-2 py-1"
                  data-testid="package-total"
                  data-hpc-id={hpc.id}
                >
                  <span class="font-semibold">{hpc.name || hpc.id}:</span>
                  CPU {intFmt.format(total.cpuHours)} · GPU {intFmt.format(
                    total.gpuHours,
                  )} · Storage {floatFmt.format(total.storageTb)} TB
                  {#if total.missingCost}
                    <span
                      class="ml-1 text-amber-700"
                      title="Some sims have no cost defined">!</span
                    >
                  {/if}
                </span>
              {/each}
            </div>
          {/if}
        </header>

        <div class="space-y-3">
          {#each group.sims as sim (sim.id)}
            {@const expanded = !collapsedSimIds.has(sim.id)}
            <div
              class="rounded-lg border border-slate-200 bg-white shadow-sm"
              data-testid="sim-shell"
              data-sim-id={sim.id}
              data-expanded={expanded}
            >
              <div class="flex flex-wrap items-center gap-3 p-3">
                <button
                  type="button"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  on:click={() => toggleSim(sim.id)}
                  aria-expanded={expanded}
                  aria-label={expanded
                    ? 'Collapse simulation'
                    : 'Expand simulation'}
                  data-testid="toggle-sim"
                >
                  {expanded ? '-' : '+'}
                </button>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate text-sm font-semibold text-slate-900">
                      {sim.name || '(untitled simulation)'}
                    </h3>
                    {#if sim.completed}
                      <span
                        class="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        Completed
                      </span>
                    {/if}
                    {#if sim.zeroCompute}
                      <span
                        class="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                      >
                        Zero compute
                      </span>
                    {/if}
                  </div>
                  <p
                    class="mt-1 truncate text-xs text-slate-600"
                    data-testid="sim-summary"
                  >
                    {simSummary(sim)}
                  </p>
                </div>

                <button
                  type="button"
                  class="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  on:click={() => duplicateSim(sim)}
                  data-testid="duplicate-sim"
                >
                  Duplicate
                </button>
              </div>

              {#if expanded}
                <div class="space-y-2 border-t border-slate-200 p-3 pt-2">
                  <SimulationEditor
                    {sim}
                    models={$modelsStore}
                    hpcs={$hpcsStore}
                    dataPortfolios={$dataPortfoliosStore}
                    resolutions={$resolutionsStore}
                    onChange={updateSim}
                    onDelete={() => deleteSim(sim.id)}
                  />
                  <SimulationTotals
                    {sim}
                    models={$modelsStore}
                    hpcs={$hpcsStore}
                  />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>
