<script lang="ts">
  import { autoSpread, normaliseSplit } from '$lib/calc/allocate';
  import type { Assignment, Period } from '$lib/types';

  export let assignment: Assignment;
  export let periods: Period[];
  export let onChange: (split: Record<string, number>) => void;

  let split: Record<string, number> = { ...assignment.periodSplit };
  let spreadN = Math.max(1, Math.min(periods.length, 1));

  // Track input strings so we keep the user's typed digit visible while they
  // type (otherwise an in-flight "0." round-trips through `Number()` back to
  // "0" and disrupts editing).
  let inputStrings: Record<string, string> = {};
  for (const p of periods) {
    inputStrings[p.id] = (split[p.id] ?? 0).toString();
  }

  // Reset local state if the assignment is swapped out (e.g. a different sim
  // is selected from the same editor instance).
  $: if (assignment) {
    split = { ...assignment.periodSplit };
    inputStrings = {};
    for (const p of periods) {
      inputStrings[p.id] = (split[p.id] ?? 0).toString();
    }
  }

  $: validity = normaliseSplit(split);
  $: rawSum = Object.values(split).reduce((acc, v) => acc + (v || 0), 0);

  function handleInput(periodId: string, raw: string) {
    inputStrings[periodId] = raw;
    const n = Number(raw);
    split = { ...split, [periodId]: Number.isFinite(n) ? n : 0 };
    onChange(split);
  }

  function applySpread() {
    const ids = periods.map((p) => p.id);
    const next = autoSpread(ids, spreadN);
    // Fill missing period ids with 0 to make the editor row show explicit 0s.
    const full: Record<string, number> = {};
    for (const p of periods) full[p.id] = next[p.id] ?? 0;
    split = full;
    inputStrings = {};
    for (const p of periods) {
      inputStrings[p.id] = (full[p.id] ?? 0).toString();
    }
    onChange(split);
  }
</script>

<div
  class="rounded border border-slate-200 bg-slate-50 p-3 text-xs"
  data-testid="period-split-editor"
>
  <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
    Period split
  </div>
  {#if periods.length === 0}
    <p class="italic text-slate-500">This HPC has no periods defined.</p>
  {:else}
    <div class="space-y-1">
      {#each periods as p (p.id)}
        <label class="flex items-center gap-2">
          <span class="w-20 text-slate-700">{p.label || p.id}</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            class="w-24 rounded border border-slate-300 px-2 py-1 font-mono text-slate-900"
            value={inputStrings[p.id] ?? '0'}
            on:input={(e) => handleInput(p.id, e.currentTarget.value)}
            data-testid="split-input"
            data-period-id={p.id}
          />
        </label>
      {/each}
    </div>

    <div class="mt-3 flex items-center gap-2 border-t border-slate-200 pt-2">
      <span class="text-slate-600">Auto-spread across</span>
      <input
        type="number"
        min="1"
        max={periods.length}
        step="1"
        bind:value={spreadN}
        class="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-slate-900"
        data-testid="spread-n"
      />
      <button
        type="button"
        class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        on:click={applySpread}
        data-testid="spread-apply"
      >
        Apply
      </button>
    </div>

    <div class="mt-2 text-[11px]">
      {#if validity.valid}
        <span class="font-semibold text-emerald-700" data-testid="split-validity">
          ✓ Valid (sums to 1.0)
        </span>
      {:else}
        <span class="font-semibold text-amber-700" data-testid="split-validity">
          ⚠ Sum: {rawSum.toFixed(2)}
        </span>
      {/if}
    </div>
  {/if}
</div>
