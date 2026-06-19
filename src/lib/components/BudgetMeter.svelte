<script lang="ts">
  import type { MeterSegment } from '$lib/calc/rollup';
  import { modelColor } from '$lib/util/colors';

  export let used: number;
  export let completed: number = 0;
  export let budget: number;
  export let unit: string;
  /** Optional label printed above the bar, e.g. "CPU h · 2026". */
  export let label: string | undefined = undefined;
  /**
   * Per-simulation breakdown. When present, the bar is drawn as a stack of
   * model-colored segments with native hover tooltips. When empty, the bar
   * falls back to the simple completed/active two-segment rendering.
   */
  export let segments: MeterSegment[] = [];
  /**
   * Optional formatter producing a complete display string (e.g. "1.2 MH").
   * When set, callers don't need to interpret `unit` — it's only used as a
   * fallback when no formatter is provided.
   */
  export let formatValue: ((n: number) => string) | undefined = undefined;

  $: hasBudget = budget > 0;
  $: percent = hasBudget ? (used / budget) * 100 : 0;
  $: overBudget = hasBudget && used > budget;
  $: barWidth = hasBudget ? Math.min(percent, 100) : 0;
  $: completedClamped = Math.max(0, Math.min(completed, used));
  $: completedPercent = hasBudget ? (completedClamped / budget) * 100 : 0;
  $: completedWidth = hasBudget
    ? Math.min((completedClamped / budget) * 100, barWidth)
    : 0;
  $: activeWidth = Math.max(0, barWidth - completedWidth);
  $: hasSegments = segments.length > 0;

  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const floatFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

  function defaultFmt(n: number): string {
    const s = Math.abs(n) >= 100 ? intFmt.format(n) : floatFmt.format(n);
    return `${s} ${unit}`;
  }

  $: fmtValue = formatValue ?? defaultFmt;
</script>

<div
  class="space-y-1"
  data-testid="budget-meter"
  data-over-budget={overBudget ? 'true' : 'false'}
  data-has-budget={hasBudget ? 'true' : 'false'}
>
  {#if label}
    <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      {label}
    </div>
  {/if}

  {#if !hasBudget}
    <div
      class="h-2 w-full rounded bg-slate-200"
      data-testid="meter-bar"
    ></div>
    <div class="text-[11px] italic text-slate-500" data-testid="meter-numeric">
      N/A — no budget set
    </div>
  {:else if hasSegments}
    <div
      class="flex h-2 w-full gap-px overflow-hidden rounded bg-slate-200 ring-1 ring-inset"
      class:ring-red-600={overBudget}
      class:ring-transparent={!overBudget}
      data-testid="meter-bar"
    >
      {#each segments as seg (seg.simulationId)}
        <div
          class="h-full {modelColor(seg.modelId, seg.completed)} transition-all"
          style="width: {(seg.value / budget) * 100}%"
          title={`${seg.simulationName} — ${fmtValue(seg.value)} (${seg.modelName})${seg.completed ? ' · completed' : ''}`}
          data-testid="meter-segment"
          data-sim-id={seg.simulationId}
          data-model-id={seg.modelId}
          data-completed={seg.completed ? 'true' : 'false'}
        ></div>
      {/each}
    </div>
    <div
      class="text-[11px] font-mono"
      class:text-red-700={overBudget}
      class:font-semibold={overBudget}
      class:text-slate-700={!overBudget}
      data-testid="meter-numeric"
    >
      {fmtValue(used)} / {fmtValue(budget)} ({percent.toFixed(0)}%)
      {#if completedClamped > 0}
        <span class="ml-1 text-slate-500" data-testid="completed-used">
          {fmtValue(completedClamped)} used ({completedPercent.toFixed(0)}%)
        </span>
      {/if}
      {#if overBudget}
        <span class="ml-1 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white" data-testid="over-budget-tag">
          OVER BUDGET
        </span>
      {/if}
    </div>
  {:else}
    <div class="flex h-2 w-full overflow-hidden rounded bg-slate-200" data-testid="meter-bar">
      <div
        class="h-full bg-slate-400 transition-all"
        style="width: {completedWidth}%"
        data-testid="meter-completed-segment"
      ></div>
      <div
        class="h-full transition-all"
        class:bg-red-600={overBudget}
        class:bg-emerald-500={!overBudget}
        style="width: {activeWidth}%"
        data-testid="meter-active-segment"
      ></div>
    </div>
    <div
      class="text-[11px] font-mono"
      class:text-red-700={overBudget}
      class:font-semibold={overBudget}
      class:text-slate-700={!overBudget}
      data-testid="meter-numeric"
    >
      {fmtValue(used)} / {fmtValue(budget)} ({percent.toFixed(0)}%)
      {#if completedClamped > 0}
        <span class="ml-1 text-slate-500" data-testid="completed-used">
          {fmtValue(completedClamped)} used ({completedPercent.toFixed(0)}%)
        </span>
      {/if}
      {#if overBudget}
        <span class="ml-1 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white" data-testid="over-budget-tag">
          OVER BUDGET
        </span>
      {/if}
    </div>
  {/if}
</div>
