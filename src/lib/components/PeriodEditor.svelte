<script lang="ts">
  import type { Period } from '$lib/types';

  export let period: Period;
  export let onChange: (next: Period) => void;

  // Local mirrors of the input values. `bind:value` with `type="number"`
  // already returns a number, but we keep typed locals for clarity and to
  // avoid surprising the parent with NaN on a transient empty input.
  $: label = period.label;
  $: cpuHoursBudget = period.cpuHoursBudget;
  $: gpuHoursBudget = period.gpuHoursBudget;

  function emit(patch: Partial<Period>) {
    onChange({ ...period, ...patch });
  }
</script>

<div
  class="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-slate-50 p-3"
  data-testid="period-editor"
>
  <label class="flex flex-col text-xs font-medium text-slate-600">
    Label
    <input
      type="text"
      class="mt-1 w-32 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
      value={label}
      on:input={(e) => emit({ label: e.currentTarget.value })}
      data-testid="period-label"
    />
  </label>
  <label class="flex flex-col text-xs font-medium text-slate-600">
    CPU hours budget
    <input
      type="number"
      min="0"
      class="mt-1 w-40 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
      value={cpuHoursBudget}
      on:input={(e) => emit({ cpuHoursBudget: Number(e.currentTarget.value) || 0 })}
      data-testid="period-cpu"
    />
  </label>
  <label class="flex flex-col text-xs font-medium text-slate-600">
    GPU hours budget
    <input
      type="number"
      min="0"
      class="mt-1 w-40 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
      value={gpuHoursBudget}
      on:input={(e) => emit({ gpuHoursBudget: Number(e.currentTarget.value) || 0 })}
      data-testid="period-gpu"
    />
  </label>
</div>
