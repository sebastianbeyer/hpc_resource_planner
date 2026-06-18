<script lang="ts">
  import { simulationCost } from '$lib/calc/cost';
  import type { Hpc, Model, Simulation } from '$lib/types';

  export let sim: Simulation;
  export let models: Model[];
  export let hpcs: Hpc[];

  $: model = models.find((m) => m.id === sim.modelId);

  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const floatFmt = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
</script>

<div
  class="rounded border border-slate-200 bg-slate-50 p-3"
  data-testid="simulation-totals"
>
  <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
    Per-HPC totals
  </h4>
  {#if !model}
    <p class="text-xs italic text-slate-500">
      Pick a model to see computed totals.
    </p>
  {:else if hpcs.length === 0}
    <p class="text-xs italic text-slate-500">
      Define an HPC first to see computed totals.
    </p>
  {:else}
    <table class="w-full text-xs">
      <thead>
        <tr class="text-left text-slate-500">
          <th class="py-1 pr-2 font-medium">HPC</th>
          <th class="py-1 pr-2 font-medium">CPU h</th>
          <th class="py-1 pr-2 font-medium">GPU h</th>
          <th class="py-1 pr-2 font-medium">Storage TB</th>
        </tr>
      </thead>
      <tbody>
        {#each hpcs as hpc (hpc.id)}
          {@const cost = simulationCost(sim, model, hpc.id)}
          <tr
            data-testid="totals-row"
            data-hpc-id={hpc.id}
            class="border-t border-slate-200"
          >
            <td class="py-1 pr-2 font-medium text-slate-700">
              {hpc.name || 'Unnamed HPC'}
            </td>
            {#if cost.missingCost}
              <td
                class="py-1 pr-2 text-amber-700"
                title="No cost defined for this HPC"
                data-testid="totals-cpu"
                data-missing="true"
              >
                —
              </td>
              <td
                class="py-1 pr-2 text-amber-700"
                title="No cost defined for this HPC"
                data-testid="totals-gpu"
                data-missing="true"
              >
                —
              </td>
              <td
                class="py-1 pr-2 text-amber-700"
                title="No cost defined for this HPC"
                data-testid="totals-storage"
                data-missing="true"
              >
                —
              </td>
            {:else}
              <td class="py-1 pr-2 font-mono text-slate-900" data-testid="totals-cpu">
                {intFmt.format(cost.cpuHours)}
              </td>
              <td class="py-1 pr-2 font-mono text-slate-900" data-testid="totals-gpu">
                {intFmt.format(cost.gpuHours)}
              </td>
              <td class="py-1 pr-2 font-mono text-slate-900" data-testid="totals-storage">
                {floatFmt.format(cost.storageTb)}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
