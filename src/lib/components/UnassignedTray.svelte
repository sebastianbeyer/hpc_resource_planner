<script lang="ts">
  import type { Hpc, Model, Simulation } from '$lib/types';
  import { setTrayDoneOpen, uiPrefs } from '$lib/stores/ui-prefs';
  import EmptyState from './EmptyState.svelte';
  import SimulationCard from './SimulationCard.svelte';

  export let sims: Simulation[];
  export let models: Model[];
  export let hpcs: Hpc[];
  export let onAssignToPeriod: (simId: string, hpcId: string, periodId: string) => void;
  export let onUnassign: (simId: string) => void;
  export let onCompletedChange: (simId: string, completed: boolean) => void;

  let dragOver = false;
  let showPlanned = true;
  $: showDone = $uiPrefs.trayDoneOpen;

  $: pendingSims = sims.filter((s) => !s.completed);
  $: doneSims = sims.filter((s) => s.completed);

  function readSimId(e: DragEvent): string | undefined {
    const id =
      e.dataTransfer?.getData('application/x-sim-id') ||
      e.dataTransfer?.getData('text/plain');
    return id || undefined;
  }

  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOver = true;
  }

  function onDragLeave(e: DragEvent) {
    if (e.currentTarget === e.target) dragOver = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const simId = readSimId(e);
    if (simId) onUnassign(simId);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<aside
  class="flex w-full flex-col rounded-lg border bg-slate-100 p-3"
  class:border-slate-300={!dragOver}
  class:border-sky-500={dragOver}
  class:ring-2={dragOver}
  class:ring-sky-200={dragOver}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  aria-label="Unassigned simulations"
  data-testid="unassigned-tray"
  data-drag-over={dragOver ? 'true' : 'false'}
>
  <header class="mb-2 flex items-baseline justify-between">
    <h2 class="text-sm font-semibold text-slate-800">Unassigned</h2>
    <span class="text-[11px] text-slate-500">{sims.length}</span>
  </header>

  {#if sims.length === 0}
    <div data-testid="tray-empty">
      <EmptyState title="All sims assigned" message="Drop a card here to unassign it." />
    </div>
  {:else}
    {#if pendingSims.length > 0}
      <button
        type="button"
        class="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
        on:click={() => (showPlanned = !showPlanned)}
        data-testid="tray-toggle-planned"
        aria-expanded={showPlanned}
      >
        <span>{showPlanned ? '▼' : '▶'} Planned</span>
        <span class="text-slate-500">{pendingSims.length}</span>
      </button>
      {#if showPlanned}
        <div
          class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          data-testid="tray-planned-section"
        >
          {#each pendingSims as sim (sim.id)}
            <SimulationCard
              {sim}
              {models}
              {hpcs}
              onAssignToPeriod={(hpcId, periodId) => onAssignToPeriod(sim.id, hpcId, periodId)}
              onCompletedChange={(completed) => onCompletedChange(sim.id, completed)}
            />
          {/each}
        </div>
      {/if}
    {/if}

    {#if doneSims.length > 0}
      <div class="mt-3 border-t border-slate-300 pt-2">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
          on:click={() => setTrayDoneOpen(!showDone)}
          data-testid="tray-toggle-done"
          aria-expanded={showDone}
        >
          <span>{showDone ? '▼' : '▶'} Done</span>
          <span class="text-slate-500">{doneSims.length}</span>
        </button>
        {#if showDone}
          <div
            class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            data-testid="tray-done-section"
          >
            {#each doneSims as sim (sim.id)}
              <SimulationCard
                {sim}
                {models}
                {hpcs}
                onAssignToPeriod={(hpcId, periodId) => onAssignToPeriod(sim.id, hpcId, periodId)}
                onCompletedChange={(completed) => onCompletedChange(sim.id, completed)}
              />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</aside>
