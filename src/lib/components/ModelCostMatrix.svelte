<script lang="ts">
  import type { Hpc, Model, ModelCost } from '$lib/types';

  export let model: Model;
  export let hpcs: Hpc[];
  export let resolutions: string[];
  export let dataPortfolios: string[];
  export let onChange: (next: Model) => void;

  function getCell(resolution: string, hpcId: string): ModelCost {
    const byHpc = model.costs[resolution];
    if (byHpc && byHpc[hpcId]) return byHpc[hpcId];
    return {
      cpuHoursPerSimMonth: 0,
      gpuHoursPerSimMonth: 0
    };
  }

  function updateCell(resolution: string, hpcId: string, patch: Partial<ModelCost>) {
    const prev = getCell(resolution, hpcId);
    const nextCell: ModelCost = {
      cpuHoursPerSimMonth: patch.cpuHoursPerSimMonth ?? prev.cpuHoursPerSimMonth,
      gpuHoursPerSimMonth: patch.gpuHoursPerSimMonth ?? prev.gpuHoursPerSimMonth
    };
    const nextCosts: Model['costs'] = { ...model.costs };
    const row = { ...(nextCosts[resolution] ?? {}) };
    row[hpcId] = nextCell;
    nextCosts[resolution] = row;
    onChange({ ...model, costs: nextCosts });
  }

  function getStorageRates(resolution: string): Record<string, number> {
    return model.storageTbPerSimMonthByResolution[resolution] ?? {};
  }

  function updateStorage(resolution: string, portfolio: string, value: number) {
    const nextRates = {
      ...getStorageRates(resolution),
      [portfolio]: value
    };
    onChange({
      ...model,
      storageTbPerSimMonthByResolution: {
        ...model.storageTbPerSimMonthByResolution,
        [resolution]: nextRates
      }
    });
  }
</script>

{#if resolutions.length === 0}
  <p class="text-xs italic text-slate-500" data-testid="cost-matrix-empty">
    Add a resolution to fill in costs.
  </p>
{:else}
  <div class="space-y-4" data-testid="model-cost-matrix">
    {#each resolutions as resolution (resolution)}
      <div class="rounded border border-slate-200 bg-slate-50 p-3">
        <h4 class="mb-2 text-sm font-semibold text-slate-700">
          Resolution: <span class="font-mono">{resolution}</span>
        </h4>

        {#if dataPortfolios.length > 0}
          {@const storageRates = getStorageRates(resolution)}
          <div
            class="mb-3 rounded border border-slate-200 bg-white p-3"
            data-testid="storage-rates"
            data-resolution={resolution}
          >
            <div class="mb-2 text-xs font-semibold text-slate-700">
              Storage rates
            </div>
            <table class="w-full text-xs sm:w-auto">
              <thead>
                <tr class="text-left text-slate-500">
                  <th class="py-1 pr-4 font-medium">Data portfolio</th>
                  <th class="py-1 font-medium">TB / sim-month</th>
                </tr>
              </thead>
              <tbody>
                {#each dataPortfolios as portfolio (portfolio)}
                  <tr>
                    <td class="py-0.5 pr-4 font-mono">{portfolio}</td>
                    <td class="py-0.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-24 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-900"
                        value={storageRates[portfolio] ?? 0}
                        on:input={(e) =>
                          updateStorage(
                            resolution,
                            portfolio,
                            Number(e.currentTarget.value) || 0
                          )}
                        data-testid="cell-storage"
                        data-resolution={resolution}
                        data-portfolio={portfolio}
                      />
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        {#if hpcs.length === 0}
          <p class="text-xs italic text-slate-500">
            Define an HPC to fill in CPU/GPU costs.
          </p>
        {:else}
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {#each hpcs as hpc (hpc.id)}
              {@const cell = getCell(resolution, hpc.id)}
              <div
                class="rounded border border-slate-200 bg-white p-3"
                data-testid="cost-cell"
                data-resolution={resolution}
                data-hpc-id={hpc.id}
              >
                <div class="mb-2 text-xs font-semibold text-slate-700">
                  {hpc.name || 'Unnamed HPC'}
                </div>
                <div class="flex flex-wrap gap-2">
                  <label class="flex flex-col text-xs font-medium text-slate-600">
                    CPU h / sim-month
                    <input
                      type="number"
                      min="0"
                      class="mt-1 w-28 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      value={cell.cpuHoursPerSimMonth}
                      on:input={(e) =>
                        updateCell(resolution, hpc.id, {
                          cpuHoursPerSimMonth: Number(e.currentTarget.value) || 0
                        })}
                      data-testid="cell-cpu"
                    />
                  </label>
                  <label class="flex flex-col text-xs font-medium text-slate-600">
                    GPU h / sim-month
                    <input
                      type="number"
                      min="0"
                      class="mt-1 w-28 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
                      value={cell.gpuHoursPerSimMonth}
                      on:input={(e) =>
                        updateCell(resolution, hpc.id, {
                          gpuHoursPerSimMonth: Number(e.currentTarget.value) || 0
                        })}
                      data-testid="cell-gpu"
                    />
                  </label>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
