<script lang="ts">
  import type { Hpc, Model } from '$lib/types';
  import ModelCostMatrix from './ModelCostMatrix.svelte';

  export let model: Model;
  export let hpcs: Hpc[];
  export let resolutions: string[];
  export let dataPortfolios: string[];
  export let onChange: (next: Model) => void;
  export let onDelete: () => void;

  function emit(patch: Partial<Model>) {
    onChange({ ...model, ...patch });
  }

  function deleteModel() {
    // Confirm + cascade handling lives in the page (see /models/+page.svelte).
    onDelete();
  }
</script>

<section
  class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
  data-testid="model-editor"
>
  <div class="flex flex-wrap items-end gap-3">
    <label class="flex flex-col text-xs font-medium text-slate-600">
      Model name
      <input
        type="text"
        class="mt-1 w-56 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={model.name}
        on:input={(e) => emit({ name: e.currentTarget.value })}
        data-testid="model-name"
      />
    </label>
    <div class="ml-auto">
      <button
        type="button"
        class="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        on:click={deleteModel}
        data-testid="delete-model"
      >
        Delete Model
      </button>
    </div>
  </div>

  <div class="mt-4">
    <h3 class="mb-2 text-sm font-semibold text-slate-700">Cost matrix</h3>
    <ModelCostMatrix
      {model}
      {hpcs}
      {resolutions}
      {dataPortfolios}
      {onChange}
    />
  </div>
</section>
