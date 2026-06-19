<script lang="ts">
  import type { AppState } from '$lib/types';

  export let open: boolean;
  export let incoming: AppState | null;
  export let current: AppState | null;
  export let onAccept: () => void;
  export let onDismiss: () => void;

  function counts(s: AppState | null) {
    if (!s) return { hpcs: 0, models: 0, sims: 0, assignments: 0 };
    return {
      hpcs: s.hpcs.length,
      models: s.models.length,
      sims: s.simulations.length,
      assignments: s.assignments.length
    };
  }

  $: incomingCounts = counts(incoming);
  $: currentCounts = counts(current);
  $: currentIsEmpty =
    currentCounts.hpcs === 0 &&
    currentCounts.models === 0 &&
    currentCounts.sims === 0 &&
    currentCounts.assignments === 0;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onDismiss();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onDismiss();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open && incoming}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    data-testid="shared-config-prompt"
    role="presentation"
    on:click={handleBackdropClick}
  >
    <div
      class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-config-title"
    >
      <h2 id="shared-config-title" class="mb-2 text-lg font-bold text-slate-900">
        Open shared configuration?
      </h2>
      <p class="mb-4 text-sm text-slate-700">
        This link contains a shared configuration. Accepting will
        <strong>replace</strong> your current local state.
      </p>

      <div class="mb-4 grid grid-cols-2 gap-3 text-sm">
        <section
          class="rounded border border-slate-200 bg-slate-50 p-3"
          data-testid="shared-config-incoming"
        >
          <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Shared link
          </h3>
          <ul class="space-y-0.5 text-slate-800">
            <li>{incomingCounts.hpcs} HPC{incomingCounts.hpcs === 1 ? '' : 's'}</li>
            <li>{incomingCounts.models} model{incomingCounts.models === 1 ? '' : 's'}</li>
            <li>{incomingCounts.sims} sim{incomingCounts.sims === 1 ? '' : 's'}</li>
            <li>
              {incomingCounts.assignments} assignment{incomingCounts.assignments === 1
                ? ''
                : 's'}
            </li>
          </ul>
        </section>
        <section
          class="rounded border border-slate-200 bg-slate-50 p-3"
          data-testid="shared-config-current"
        >
          <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Your local state
          </h3>
          {#if currentIsEmpty}
            <p class="text-slate-600">Empty — nothing will be lost.</p>
          {:else}
            <ul class="space-y-0.5 text-slate-800">
              <li>{currentCounts.hpcs} HPC{currentCounts.hpcs === 1 ? '' : 's'}</li>
              <li>{currentCounts.models} model{currentCounts.models === 1 ? '' : 's'}</li>
              <li>{currentCounts.sims} sim{currentCounts.sims === 1 ? '' : 's'}</li>
              <li>
                {currentCounts.assignments} assignment{currentCounts.assignments === 1
                  ? ''
                  : 's'}
              </li>
            </ul>
          {/if}
        </section>
      </div>

      {#if !currentIsEmpty}
        <p
          class="mb-4 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"
          data-testid="shared-config-warning"
        >
          Tip: export your current state first if you want to keep a copy.
        </p>
      {/if}

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          on:click={onDismiss}
          data-testid="shared-config-dismiss"
        >
          Keep current state
        </button>
        <button
          type="button"
          class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          on:click={onAccept}
          data-testid="shared-config-accept"
        >
          Replace with shared config
        </button>
      </div>
    </div>
  </div>
{/if}
