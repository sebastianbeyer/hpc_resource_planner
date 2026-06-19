<script lang="ts">
  import type { Hpc, Period } from '$lib/types';
  import { newId } from '$lib/util/id';
  import PeriodEditor from './PeriodEditor.svelte';

  export let hpc: Hpc;
  export let onChange: (next: Hpc) => void;
  export let onDelete: () => void;

  function emit(patch: Partial<Hpc>) {
    onChange({ ...hpc, ...patch });
  }

  function addPeriod() {
    const period: Period = {
      id: newId(),
      label: 'New Period',
      cpuHoursBudget: 0,
      gpuHoursBudget: 0
    };
    emit({ periods: [...hpc.periods, period] });
  }

  function updatePeriod(next: Period) {
    emit({
      periods: hpc.periods.map((p) => (p.id === next.id ? next : p))
    });
  }

  function deletePeriod(period: Period) {
    if (!window.confirm(`Delete period "${period.label || 'untitled'}"?`)) return;
    emit({ periods: hpc.periods.filter((p) => p.id !== period.id) });
  }

  function deleteHpc() {
    // Confirm + cascade handling lives in the page (see /hpcs/+page.svelte)
    // so it can describe references like assignments and compute-cost cells.
    onDelete();
  }
</script>

<section
  class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
  data-testid="hpc-editor"
>
  <div class="flex flex-wrap items-end gap-3">
    <label class="flex flex-col text-xs font-medium text-slate-600">
      HPC name
      <input
        type="text"
        class="mt-1 w-56 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={hpc.name}
        on:input={(e) => emit({ name: e.currentTarget.value })}
        data-testid="hpc-name"
      />
    </label>
    <label class="flex flex-col text-xs font-medium text-slate-600">
      Storage budget (TB)
      <input
        type="number"
        min="0"
        class="mt-1 w-40 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
        value={hpc.storageBudgetTb}
        on:input={(e) => emit({ storageBudgetTb: Number(e.currentTarget.value) || 0 })}
        data-testid="hpc-storage"
      />
    </label>
    <div class="ml-auto">
      <button
        type="button"
        class="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        on:click={deleteHpc}
        data-testid="delete-hpc"
      >
        Delete HPC
      </button>
    </div>
  </div>

  <div class="mt-4">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700">Periods</h3>
      <button
        type="button"
        class="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        on:click={addPeriod}
        data-testid="add-period"
      >
        + Add Period
      </button>
    </div>

    {#if hpc.periods.length === 0}
      <p class="text-xs italic text-slate-500">No periods yet.</p>
    {:else}
      <div class="space-y-2">
        {#each hpc.periods as period (period.id)}
          <div class="flex items-start gap-2">
            <div class="flex-1">
              <PeriodEditor {period} onChange={updatePeriod} />
            </div>
            <button
              type="button"
              class="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              on:click={() => deletePeriod(period)}
              data-testid="delete-period"
            >
              Delete
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
