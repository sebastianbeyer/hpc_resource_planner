<script lang="ts">
  export let title: string;
  export let message: string;
  export let actionLabel: string | undefined = undefined;
  export let onAction: (() => void) | undefined = undefined;
  /** Optional small glyph rendered above the title (just plain text). */
  export let icon: string = '•';
</script>

<div
  class="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-300 bg-white p-8 text-center"
  data-testid="empty-state"
>
  <div
    class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400"
    aria-hidden="true"
  >
    {icon}
  </div>
  <h3 class="text-sm font-semibold text-slate-800" data-testid="empty-state-title">
    {title}
  </h3>
  <p class="max-w-md text-sm text-slate-500" data-testid="empty-state-message">
    {message}
  </p>
  {#if actionLabel && onAction}
    <button
      type="button"
      class="mt-2 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      on:click={onAction}
      data-testid="empty-state-action"
    >
      {actionLabel}
    </button>
  {/if}
</div>
