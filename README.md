# HPC Resource Planner

A client-only single-page web tool for planning campaigns of climate simulations across multiple HPCs. It lets you define HPC compute/storage budgets per period, model costs per HPC × resolution, and a catalogue of simulations, then assign those simulations to HPCs and watch the rollup of CPU hours, GPU hours, and storage update live against budgets. Intended for the small group of people who currently juggle this in spreadsheets.

## Quickstart

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

## Workflow

The app has four tabs which feed into each other in order:

1. **HPCs** — define each HPC and its budget periods (CPU/GPU hours per period, one cumulative storage budget per HPC).
2. **Models** — define each model and, per (resolution × HPC) cell, its per-simulation-month costs (CPU, GPU, and storage per data portfolio).
3. **Simulations** — define each simulation: model, resolution, length (years), ensembles, data portfolio, overhead multiplier, optional package label, and `locked` / `zeroCompute` flags.
4. **Plan** — assign simulations to HPCs, edit the per-period split for each assignment, and read off live budget meters with over-budget warnings.

Import/Export of the whole state as JSON is available from a button in the tab bar; the JSON file is the single shareable artifact.

## JSON schema

The full `AppState` shape (HPCs, models, simulations, assignments, shared vocabularies) is defined in [`src/lib/types.ts`](src/lib/types.ts) — that is the canonical reference. Every exported file carries a `schemaVersion` field; the migration ladder in `src/lib/schema.ts` upgrades older files on import.

## Resource math

For a simulation, `totalMonths = lengthYears * 12 * ensembles`. Compute usage is `costPerMonth * totalMonths * overheadMultiplier` (the overhead multiplier represents rerun cost, applied to compute only). Storage is `storagePerMonth(byPortfolio) * totalMonths` — no overhead — and is accumulated per HPC across all assigned simulations (not split per period). `zeroCompute` simulations contribute storage only.

## Locked simulations

Mark historical / already-running work as `locked` with a pinned HPC so it is included in the rollups but can't be reassigned by accident. Combine with `zeroCompute` for runs whose compute is already spent but whose data still occupies storage.

## Hosting

The `build/` output is fully static; deploy to any static host — GitHub Pages, Netlify, Cloudflare Pages, an internal S3 bucket. No env vars, no secrets, no runtime config.

## Scripts

| script | what it does |
| --- | --- |
| `npm run dev` | start dev server with hot reload |
| `npm run build` | produce static `build/` output |
| `npm run preview` | serve the built `build/` locally |
| `npm run test` | unit tests (Vitest) |
| `npm run test:e2e` | end-to-end tests (Playwright) |
| `npm run check` | TypeScript / Svelte type check |

## Known deviations from the original plan

The Plan tab uses click-driven "Assign to ▾" / "Move to ▾" menus instead of `svelte-dnd-action` drag-and-drop. `svelte-dnd-action` did not have documented Svelte 5 support at the time of writing; the click-driven UI preserves the same assignment behaviour (and is keyboard-accessible by default).
