<script lang="ts">
  import type { Hpc, Model, Simulation } from '$lib/types';
  import SimulationCard from './SimulationCard.svelte';

  export let sims: Simulation[];
  export let models: Model[];
  export let hpcs: Hpc[];
  export let onAssign: (simId: string, hpcId: string) => void;
</script>

<aside
  class="flex w-72 flex-shrink-0 flex-col rounded-lg border border-slate-300 bg-slate-100 p-3"
  data-testid="unassigned-tray"
>
  <header class="mb-2 flex items-baseline justify-between">
    <h2 class="text-sm font-semibold text-slate-800">Unassigned</h2>
    <span class="text-[11px] text-slate-500">{sims.length}</span>
  </header>

  {#if sims.length === 0}
    <p class="rounded border border-dashed border-slate-300 bg-white p-4 text-center text-xs italic text-slate-500" data-testid="tray-empty">
      All sims assigned.
    </p>
  {:else}
    <div class="space-y-2">
      {#each sims as sim (sim.id)}
        <SimulationCard
          {sim}
          {models}
          {hpcs}
          onAssign={(hpcId) => onAssign(sim.id, hpcId)}
        />
      {/each}
    </div>
  {/if}
</aside>
