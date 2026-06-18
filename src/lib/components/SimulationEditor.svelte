<script lang="ts">
  import { simulationCost } from '$lib/calc/cost';
  import type { Hpc, Model, Simulation } from '$lib/types';

  export let sim: Simulation;
  export let models: Model[];
  export let hpcs: Hpc[];
  export let dataPortfolios: string[];
  export let resolutions: string[];
  export let onChange: (next: Simulation) => void;
  export let onDelete: () => void;

  function emit(patch: Partial<Simulation>) {
    onChange({ ...sim, ...patch });
  }

  function deleteSim() {
    if (!window.confirm(`Delete simulation "${sim.name || 'untitled'}"?`)) return;
    onDelete();
  }

  // The currently-selected model (if any).
  $: model = models.find((m) => m.id === sim.modelId);

  // Pull the resolution dropdown options from the model's defined cost cells
  // when available; fall back to the shared vocabulary if the model has no
  // entries yet so the user can still make a reasonable selection.
  $: modelResolutions = model ? Object.keys(model.costs) : [];
  $: resolutionOptions =
    modelResolutions.length > 0 ? modelResolutions : resolutions;

  // Validation: locked sims require a pinned HPC.
  $: lockedWithoutPin = sim.locked && !sim.pinnedHpcId;

  // Missing-cost warnings: list each HPC that has no cost cell defined for
  // the current (modelId, resolution).
  $: missingCostHpcs = (() => {
    if (!model || !sim.resolution) return [] as string[];
    const missing: string[] = [];
    for (const hpc of hpcs) {
      const c = simulationCost(sim, model, hpc.id);
      if (c.missingCost) missing.push(hpc.name || hpc.id);
    }
    return missing;
  })();

  function onLockedChange(e: Event) {
    const checked = (e.currentTarget as HTMLInputElement).checked;
    if (checked) {
      // Pre-fill pinnedHpcId with the first HPC if available.
      const pinned = sim.pinnedHpcId ?? hpcs[0]?.id;
      onChange({ ...sim, locked: true, pinnedHpcId: pinned });
    } else {
      // Clear pinnedHpcId when unlocking.
      const next: Simulation = { ...sim, locked: false };
      delete next.pinnedHpcId;
      onChange(next);
    }
  }

  function onZeroComputeChange(e: Event) {
    const checked = (e.currentTarget as HTMLInputElement).checked;
    if (checked) {
      emit({ zeroCompute: true });
    } else {
      const next = { ...sim };
      delete next.zeroCompute;
      onChange(next);
    }
  }

  function onPackageLabelChange(e: Event) {
    const value = (e.currentTarget as HTMLInputElement).value;
    if (value === '') {
      const next = { ...sim };
      delete next.packageLabel;
      onChange(next);
    } else {
      emit({ packageLabel: value });
    }
  }
</script>

<section
  class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
  data-testid="simulation-editor"
>
  <div class="flex flex-wrap items-end gap-3">
    <label class="flex flex-col text-xs font-medium text-slate-600">
      Name
      <input
        type="text"
        class="mt-1 w-56 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.name}
        on:input={(e) => emit({ name: e.currentTarget.value })}
        data-testid="sim-name"
      />
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Model
      <select
        class="mt-1 w-44 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
        value={sim.modelId}
        on:change={(e) => emit({ modelId: e.currentTarget.value })}
        disabled={models.length === 0}
        data-testid="sim-model"
      >
        <option value="">— pick a model —</option>
        {#each models as m (m.id)}
          <option value={m.id}>{m.name || '(unnamed)'}</option>
        {/each}
      </select>
      {#if models.length === 0}
        <span class="mt-1 text-[10px] italic text-slate-500">
          no models — define one in Models tab
        </span>
      {/if}
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Resolution
      <select
        class="mt-1 w-32 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.resolution}
        on:change={(e) => emit({ resolution: e.currentTarget.value })}
        data-testid="sim-resolution"
      >
        <option value="">— pick —</option>
        {#each resolutionOptions as r (r)}
          <option value={r}>{r}</option>
        {/each}
      </select>
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Length (years)
      <input
        type="number"
        min="0.01"
        step="0.01"
        class="mt-1 w-28 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.lengthYears}
        on:input={(e) => emit({ lengthYears: Number(e.currentTarget.value) || 0 })}
        data-testid="sim-length"
      />
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Ensembles
      <input
        type="number"
        min="1"
        step="1"
        class="mt-1 w-24 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.ensembles}
        on:input={(e) => emit({ ensembles: Number(e.currentTarget.value) || 0 })}
        data-testid="sim-ensembles"
      />
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Data portfolio
      <select
        class="mt-1 w-36 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.dataPortfolio}
        on:change={(e) => emit({ dataPortfolio: e.currentTarget.value })}
        data-testid="sim-portfolio"
      >
        <option value="">— pick —</option>
        {#each dataPortfolios as p (p)}
          <option value={p}>{p}</option>
        {/each}
      </select>
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Overhead ×
      <input
        type="number"
        min="1"
        step="0.01"
        class="mt-1 w-24 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.overheadMultiplier}
        on:input={(e) =>
          emit({ overheadMultiplier: Number(e.currentTarget.value) || 0 })}
        data-testid="sim-overhead"
      />
    </label>

    <label class="flex flex-col text-xs font-medium text-slate-600">
      Package label
      <input
        type="text"
        class="mt-1 w-40 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={sim.packageLabel ?? ''}
        on:input={onPackageLabelChange}
        placeholder="(optional)"
        data-testid="sim-package"
      />
    </label>

    <div class="ml-auto">
      <button
        type="button"
        class="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        on:click={deleteSim}
        data-testid="delete-sim"
      >
        Delete
      </button>
    </div>
  </div>

  <div class="mt-3 flex flex-wrap items-end gap-4">
    <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
      <input
        type="checkbox"
        checked={sim.locked}
        on:change={onLockedChange}
        data-testid="sim-locked"
      />
      Locked (pin to a specific HPC)
    </label>

    {#if sim.locked}
      <label class="flex flex-col text-xs font-medium text-slate-600">
        Pinned HPC
        <select
          class="mt-1 w-44 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
          value={sim.pinnedHpcId ?? ''}
          on:change={(e) => emit({ pinnedHpcId: e.currentTarget.value })}
          data-testid="sim-pinned"
        >
          <option value="">— pick HPC —</option>
          {#each hpcs as h (h.id)}
            <option value={h.id}>{h.name || h.id}</option>
          {/each}
        </select>
      </label>
    {/if}

    <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
      <input
        type="checkbox"
        checked={sim.zeroCompute === true}
        on:change={onZeroComputeChange}
        data-testid="sim-zero-compute"
      />
      Zero compute (historical / already-done data)
    </label>
  </div>

  {#if lockedWithoutPin}
    <p class="mt-2 text-xs text-red-600" data-testid="warn-locked-no-pin">
      Locked simulations must pin an HPC.
    </p>
  {/if}

  {#if missingCostHpcs.length > 0 && sim.resolution}
    <p class="mt-2 text-xs text-red-600" data-testid="warn-missing-cost">
      No cost defined for {sim.resolution} resolution on
      {missingCostHpcs.join(', ')}.
    </p>
  {/if}
</section>
