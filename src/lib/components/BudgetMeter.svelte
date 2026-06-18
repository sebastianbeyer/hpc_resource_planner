<script lang="ts">
  export let used: number;
  export let budget: number;
  export let unit: string;
  /** Optional label printed above the bar, e.g. "CPU h · 2026". */
  export let label: string | undefined = undefined;

  $: hasBudget = budget > 0;
  $: percent = hasBudget ? (used / budget) * 100 : 0;
  $: overBudget = hasBudget && used > budget;
  $: barWidth = hasBudget ? Math.min(percent, 100) : 0;

  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const floatFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

  function fmt(n: number): string {
    return Math.abs(n) >= 100 ? intFmt.format(n) : floatFmt.format(n);
  }
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
  {:else}
    <div class="h-2 w-full overflow-hidden rounded bg-slate-200" data-testid="meter-bar">
      <div
        class="h-full transition-all"
        class:bg-red-600={overBudget}
        class:bg-emerald-500={!overBudget}
        style="width: {barWidth}%"
      ></div>
    </div>
    <div
      class="text-[11px] font-mono"
      class:text-red-700={overBudget}
      class:font-semibold={overBudget}
      class:text-slate-700={!overBudget}
      data-testid="meter-numeric"
    >
      {fmt(used)} / {fmt(budget)} {unit} ({percent.toFixed(0)}%)
      {#if overBudget}
        <span class="ml-1 rounded bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white" data-testid="over-budget-tag">
          OVER BUDGET
        </span>
      {/if}
    </div>
  {/if}
</div>
