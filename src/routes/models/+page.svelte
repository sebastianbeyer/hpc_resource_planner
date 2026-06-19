<script lang="ts">
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ModelEditor from '$lib/components/ModelEditor.svelte';
  import VocabEditor from '$lib/components/VocabEditor.svelte';
  import { cascadeDeleteModel, describeModelDelete } from '$lib/cascade';
  import {
    appState,
    dataPortfoliosStore,
    hpcsStore,
    modelsStore,
    resolutionsStore
  } from '$lib/stores/state';
  import { pushToast } from '$lib/stores/toast';
  import type { AppState, Model } from '$lib/types';
  import { newId } from '$lib/util/id';

  function addModel() {
    const model: Model = {
      id: newId(),
      name: 'New Model',
      costs: {},
      storageTbPerSimMonthByResolution: {}
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
    let modelName = 'untitled';
    let impact = { simulationCount: 0, simulationNames: [] as string[] };
    appState.update((s) => {
      const found = s.models.find((m) => m.id === id);
      if (found) modelName = found.name || 'untitled';
      impact = describeModelDelete(s, id);
      return s;
    });

    let prompt: string;
    if (impact.simulationCount === 0) {
      prompt = `Delete model "${modelName}"?`;
    } else {
      const namesPreview = impact.simulationNames.slice(0, 5).join(', ');
      const more =
        impact.simulationCount > 5
          ? ` (+${impact.simulationCount - 5} more)`
          : '';
      prompt = `"${modelName}" is referenced by ${impact.simulationCount} simulation${impact.simulationCount === 1 ? '' : 's'} (${namesPreview}${more}). Their model link will be cleared. Delete anyway?`;
    }

    if (!window.confirm(prompt)) return;
    appState.update((s) => cascadeDeleteModel(s, id));
    pushToast({
      kind: 'success',
      message: `Deleted model "${modelName}".`
    });
  }

  function resolutionReferenced(s: AppState, resolution: string): boolean {
    if (s.simulations.some((sim) => sim.resolution === resolution)) return true;
    for (const m of s.models) {
      if (m.costs[resolution]) return true;
      if (m.storageTbPerSimMonthByResolution[resolution]) return true;
    }
    return false;
  }

  function portfolioReferenced(s: AppState, portfolio: string): boolean {
    if (s.simulations.some((sim) => sim.dataPortfolio === portfolio)) return true;
    for (const m of s.models) {
      for (const byPortfolio of Object.values(m.storageTbPerSimMonthByResolution)) {
        if (portfolio in byPortfolio) return true;
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
        const storageTbPerSimMonthByResolution = {
          ...m.storageTbPerSimMonthByResolution
        };
        for (const r of removed) delete costs[r];
        for (const r of removed) delete storageTbPerSimMonthByResolution[r];
        return { ...m, costs, storageTbPerSimMonthByResolution };
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
        const storageTbPerSimMonthByResolution: Model['storageTbPerSimMonthByResolution'] =
          {};
        for (const [res, byPortfolio] of Object.entries(
          m.storageTbPerSimMonthByResolution
        )) {
          const nextByPortfolio = { ...byPortfolio };
          for (const p of removed) delete nextByPortfolio[p];
          storageTbPerSimMonthByResolution[res] = nextByPortfolio;
        }
        return { ...m, storageTbPerSimMonthByResolution };
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
        Define each model's per-HPC compute costs and shared storage rates.
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
    <EmptyState
      title="No models yet"
      message="Add a model to define its CPU/GPU compute costs per HPC and storage rates per resolution."
      actionLabel="+ Add Model"
      onAction={addModel}
    />
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
