<script lang="ts">
  import ModelEditor from '$lib/components/ModelEditor.svelte';
  import VocabEditor from '$lib/components/VocabEditor.svelte';
  import {
    appState,
    dataPortfoliosStore,
    hpcsStore,
    modelsStore,
    resolutionsStore
  } from '$lib/stores/state';
  import type { AppState, Model } from '$lib/types';
  import { newId } from '$lib/util/id';

  function addModel() {
    const model: Model = {
      id: newId(),
      name: 'New Model',
      costs: {}
    };
    appState.update((s) => ({ ...s, models: [...s.models, model] }));
  }

  function updateModel(next: Model) {
    appState.update((s) => ({
      ...s,
      models: s.models.map((m) => (m.id === next.id ? next : m))
    }));
  }

  function deleteModel(id: string) {
    appState.update((s) => ({ ...s, models: s.models.filter((m) => m.id !== id) }));
  }

  function resolutionReferenced(s: AppState, resolution: string): boolean {
    if (s.simulations.some((sim) => sim.resolution === resolution)) return true;
    for (const m of s.models) {
      if (m.costs[resolution]) return true;
    }
    return false;
  }

  function portfolioReferenced(s: AppState, portfolio: string): boolean {
    if (s.simulations.some((sim) => sim.dataPortfolio === portfolio)) return true;
    for (const m of s.models) {
      for (const byHpc of Object.values(m.costs)) {
        for (const cell of Object.values(byHpc)) {
          if (portfolio in cell.storageTbPerSimMonthByPortfolio) return true;
        }
      }
    }
    return false;
  }

  function isResolutionReferenced(resolution: string): boolean {
    let referenced = false;
    appState.update((s) => {
      referenced = resolutionReferenced(s, resolution);
      return s;
    });
    return referenced;
  }

  function isPortfolioReferenced(portfolio: string): boolean {
    let referenced = false;
    appState.update((s) => {
      referenced = portfolioReferenced(s, portfolio);
      return s;
    });
    return referenced;
  }

  function onResolutionsChange(next: string[]) {
    appState.update((s) => {
      const removed = s.resolutions.filter((r) => !next.includes(r));
      if (removed.length === 0) {
        return { ...s, resolutions: next };
      }
      const models = s.models.map((m) => {
        const costs = { ...m.costs };
        for (const r of removed) delete costs[r];
        return { ...m, costs };
      });
      return { ...s, resolutions: next, models };
    });
  }

  function onPortfoliosChange(next: string[]) {
    appState.update((s) => {
      const removed = s.dataPortfolios.filter((p) => !next.includes(p));
      if (removed.length === 0) {
        return { ...s, dataPortfolios: next };
      }
      const models = s.models.map((m) => {
        const costs: Model['costs'] = {};
        for (const [res, byHpc] of Object.entries(m.costs)) {
          const newByHpc: typeof byHpc = {};
          for (const [hpcId, cell] of Object.entries(byHpc)) {
            const newStorage = { ...cell.storageTbPerSimMonthByPortfolio };
            for (const p of removed) delete newStorage[p];
            newByHpc[hpcId] = {
              ...cell,
              storageTbPerSimMonthByPortfolio: newStorage
            };
          }
          costs[res] = newByHpc;
        }
        return { ...m, costs };
      });
      return { ...s, dataPortfolios: next, models };
    });
  }
</script>

<div class="space-y-4">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Models</h1>
      <p class="text-sm text-slate-600">
        Define each model and its per-HPC, per-resolution cost matrix.
      </p>
    </div>
    <button
      type="button"
      class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      on:click={addModel}
      data-testid="add-model"
    >
      + Add Model
    </button>
  </header>

  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <VocabEditor
      label="Resolutions"
      items={$resolutionsStore}
      isReferenced={isResolutionReferenced}
      onChange={onResolutionsChange}
    />
    <VocabEditor
      label="Data portfolios"
      items={$dataPortfoliosStore}
      isReferenced={isPortfolioReferenced}
      onChange={onPortfoliosChange}
    />
  </div>

  {#if $modelsStore.length === 0}
    <p
      class="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
    >
      No models yet. Add one to define costs.
    </p>
  {:else}
    <div class="space-y-4">
      {#each $modelsStore as model (model.id)}
        <ModelEditor
          {model}
          hpcs={$hpcsStore}
          resolutions={$resolutionsStore}
          dataPortfolios={$dataPortfoliosStore}
          onChange={updateModel}
          onDelete={() => deleteModel(model.id)}
        />
      {/each}
    </div>
  {/if}
</div>
