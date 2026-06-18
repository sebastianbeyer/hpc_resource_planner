# HPC Resource Planner

## Overview
A single-page, client-only web tool that lets you plan a campaign of climate
simulations across multiple HPCs and per-period compute budgets, while keeping
a running total of consumed CPU hours, GPU hours, and storage. State lives in
the browser; the entire configuration is serialisable to JSON for out-of-band
sharing and reload.

The problem it solves: today, fitting a year's worth of simulations into the
available CPU/GPU hours on each HPC (plus the storage available on the
associated databridge) is done in spreadsheets and by hand. This tool gives a
single live view of what fits where, what's left, and where you're over
budget — including the resources already burned by historical runs.

Integration: standalone. The output is JSON config files that can be exchanged
by email or checked into a repo. No backend, no auth, no shared state.

## Context (from discovery)
- Working dir `/Users/sebeye001/climateDT/resource_planner` exists but is
  empty — full greenfield scaffold.
- Surrounding `climateDT/` parent is mostly Python/notebook tooling; no shared
  frontend conventions to inherit.
- All modelling decisions (period spanning, storage accounting, locked sims,
  packages, overhead) settled in the pre-plan Q&A — captured below.

## Development Approach
- **testing approach**: Regular (code-first, then tests)
- complete each task fully before moving to the next
- make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in
  that task
  - tests are not optional - they are a required part of the checklist
  - write unit tests for new functions/methods
  - write unit tests for modified functions/methods
  - add new test cases for new code paths
  - update existing test cases if behavior changes
  - tests cover both success and error scenarios
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- run tests after each change
- maintain backward compatibility (within the JSON schema — bump
  `schemaVersion` on breaking changes and write a small migration)

## Testing Strategy
- **unit tests** (Vitest): required for every task. Focus on the pure
  calculation layer (`src/lib/calc/*`) — the resource math, period allocation,
  budget rollup, and JSON (de)serialisation. UI components get smoke tests
  only (renders, reacts to a store change).
- **e2e tests** (Playwright): one happy-path per tab, added in the same task
  as the tab itself. Stored under `e2e/`. Must pass before next task.
  - HPC tab: add an HPC + a period, see it persist after reload.
  - Model tab: define costs for a model × resolution × HPC cell.
  - Simulations tab: create a simulation, see its computed totals update.
  - Plan tab: drag a sim onto an HPC, see budget rollup change; assert a
    visual "over budget" warning when budget is exceeded.

## Progress Tracking
- mark completed items with `[x]` immediately when done
- add newly discovered tasks with ➕ prefix
- document issues/blockers with ⚠️ prefix
- update plan if implementation deviates from original scope
- keep plan in sync with actual work done

## Solution Overview

A SvelteKit project built as a static SPA (`@sveltejs/adapter-static`,
`prerender = true`, no server endpoints). One top-level `+layout.svelte`
renders a tab bar; each tab is a route under `src/routes/`. Application state
is held in a small set of Svelte writable stores, hydrated from `localStorage`
on mount and re-persisted on every change.

The hard part is **not** the UI but the calculation layer. All math lives in
pure functions in `src/lib/calc/` so it can be unit-tested without a DOM:

- `cost.ts` — given a `Simulation`, a `Model`, and an `Hpc`, returns
  `{ cpuHours, gpuHours, storageTb }` totals (applying the overhead multiplier
  to compute but NOT to storage).
- `allocate.ts` — given an `Assignment` (with its `periodSplit`), returns a
  per-period breakdown of compute consumption.
- `rollup.ts` — given the full state, returns for each HPC: the per-period
  used-vs-budget for CPU/GPU and the per-HPC used-vs-budget for storage. This
  is what the Plan tab reads to render live dials and over-budget warnings.

Components subscribe to derived stores so the rollup recomputes automatically
when any assignment, sim definition, or budget changes.

## Technical Details

### Data structures (`src/lib/types.ts`)

```ts
type Hpc = {
  id: string;
  name: string;
  storageBudgetTb: number;        // single accumulating bucket per HPC
  periods: Period[];
};

type Period = {
  id: string;
  label: string;                  // e.g. "2026"
  cpuHoursBudget: number;
  gpuHoursBudget: number;
};

type ModelCost = {
  cpuHoursPerSimMonth: number;
  gpuHoursPerSimMonth: number;
  storageTbPerSimMonthByPortfolio: Record<string, number>;
};

type Model = {
  id: string;
  name: string;
  // costs[resolution][hpcId] = ModelCost
  costs: Record<string, Record<string, ModelCost>>;
};

type Simulation = {
  id: string;
  name: string;
  modelId: string;
  resolution: string;
  lengthYears: number;
  ensembles: number;
  dataPortfolio: string;          // key into Model.costs storage table
  packageLabel?: string;          // visual grouping only
  overheadMultiplier: number;     // e.g. 1.15 = +15% for reruns
  locked: boolean;
  pinnedHpcId?: string;           // required when locked
  zeroCompute?: boolean;          // for historical/already-done data
};

type Assignment = {
  simulationId: string;
  hpcId: string;
  // map periodId → fraction in [0,1]; values must sum to 1
  periodSplit: Record<string, number>;
};

type AppState = {
  schemaVersion: number;          // start at 1
  hpcs: Hpc[];
  models: Model[];
  simulations: Simulation[];
  assignments: Assignment[];
  dataPortfolios: string[];       // shared vocabulary
  resolutions: string[];          // shared vocabulary
};
```

### Calculation rules

- Total simulated months for a sim: `lengthYears * 12 * ensembles`.
- Compute totals: `costPerMonth * totalMonths * overheadMultiplier`.
- Storage totals: `storagePerMonth(byPortfolio) * totalMonths` — overhead is
  NOT applied (overhead represents rerun compute, not extra data).
- `zeroCompute` sims contribute storage only.
- Period allocation: `assignment.periodSplit[p] * totalCompute`. Storage is
  not period-scoped — it lands wholesale on the HPC's storage bucket.
- A locked sim's assignment is auto-generated from `pinnedHpcId` and
  defaults to `{ [firstPeriodId]: 1 }` unless the user has edited it.

### Persistence

- localStorage key: `hpc-resource-planner:state:v1` (raw JSON).
- On load: parse, run `migrate(state)` to bring to current schemaVersion.
- On change: debounce 250ms then write.
- JSON import: replace state after schema validation; show a diff summary if
  schemaVersion differs.
- JSON export: pretty-printed download with filename
  `resource-planner-YYYY-MM-DD.json`.

### Tab routes

- `/` → redirect to `/hpcs`
- `/hpcs` → HPC Resources tab
- `/models` → Model Config tab
- `/simulations` → Simulations & Packages tab
- `/plan` → Plan / Assignment tab
- `/io` → Import/Export tab (or a header button — decide in Task 8)

## What Goes Where
- **Implementation Steps** (`[ ]` checkboxes): all code, tests, and config
  living in this repo.
- **Post-Completion** (no checkboxes): hosting decisions and any future
  shared-state work.

## Implementation Steps

### Task 1: Project scaffold (SvelteKit + Tailwind + Vitest + Playwright)

**Files:**
- Create: `package.json`
- Create: `svelte.config.js`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/app.css`
- Create: `src/app.html`
- Create: `src/routes/+layout.svelte` (minimal)
- Create: `src/routes/+page.svelte` (placeholder)
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `README.md` (one-paragraph: what + how to run)

- [x] `npm create svelte@latest .` equivalent — scaffold SvelteKit with
      TypeScript, ESLint, Prettier, Vitest, Playwright (non-interactive: hand-wrote
      config files; ESLint skipped per task instructions)
- [x] install and wire Tailwind (`tailwindcss`, `postcss`, `autoprefixer`)
      and import `app.css` from `+layout.svelte`
- [x] swap default adapter for `@sveltejs/adapter-static` and set
      `prerender = true` in `+layout.ts`
- [x] add npm scripts: `dev`, `build`, `preview`, `test`, `test:e2e`,
      `check`, `lint`, `format` (lint script omitted — no ESLint config yet)
- [x] write a placeholder Vitest test in `src/lib/__smoke__.test.ts` (`expect
      (1+1).toBe(2)`)
- [x] write a placeholder Playwright test in `e2e/smoke.spec.ts` that loads
      `/` and asserts the page title
- [x] run `npm run test` and `npm run test:e2e` — must pass before Task 2
- [x] `git init`, initial commit (repo already initialized on branch
      hpc-resource-planner)

### Task 2: Data model types & schema migration scaffolding

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/schema.ts` (runtime validator + `migrate(state)`)
- Create: `src/lib/schema.test.ts`

- [x] define all types from Technical Details in `types.ts`
- [x] add `defaultState(): AppState` returning an empty-but-valid state with
      `schemaVersion: 1` and seeded default `dataPortfolios` and `resolutions`
      (e.g. `["minimal", "standard", "extended"]`, `["tco79", "tco399",
      "tco1279", "tco2559"]`) — these are starter defaults, user-editable
- [x] add `validateState(unknown): AppState` that throws on shape mismatch
      (hand-rolled checks; avoid a runtime-validation lib for v1)
- [x] add `migrate(state: unknown): AppState` — for v1 it just validates;
      future-proofed for v2+
- [x] write tests: defaultState passes validation; mangled inputs throw;
      migrate of current-version round-trips
- [x] run tests — must pass before Task 3

### Task 3: Persisted Svelte stores

**Files:**
- Create: `src/lib/stores/state.ts` (the one big writable store)
- Create: `src/lib/stores/persistence.ts` (localStorage adapter)
- Create: `src/lib/stores/persistence.test.ts`

- [x] create `appState` writable store initialised from `defaultState()`
- [x] in `persistence.ts`, expose `loadFromLocalStorage()` and
      `attachAutosave(store)` (debounce 250ms)
- [x] guard with `typeof window !== 'undefined'` so SSR/prerender doesn't
      blow up
- [x] add derived helpers: `hpcsStore`, `modelsStore`, `simulationsStore`,
      `assignmentsStore` (each just `derived(appState, s => s.x)`) — also
      added `dataPortfoliosStore` and `resolutionsStore` for symmetry
- [x] in `+layout.svelte` `onMount`, call `loadFromLocalStorage()` then
      `attachAutosave(appState)`
- [x] write tests using a mocked `localStorage` (jsdom): round-trip a state,
      verify debounced write, verify load+migrate path (also required a
      `src/test-setup.ts` to bridge jsdom's `localStorage` past Node 26's
      stub global — see file header for the gory details)
- [x] run tests — must pass before Task 4

### Task 4: Calculation layer (the heart of the app)

**Files:**
- Create: `src/lib/calc/cost.ts`
- Create: `src/lib/calc/cost.test.ts`
- Create: `src/lib/calc/allocate.ts`
- Create: `src/lib/calc/allocate.test.ts`
- Create: `src/lib/calc/rollup.ts`
- Create: `src/lib/calc/rollup.test.ts`

- [x] `cost.ts`: implement `simulationCost(sim, model, hpcId)` →
      `{ cpuHours, gpuHours, storageTb }`; honour `overheadMultiplier`
      (compute only) and `zeroCompute`
- [x] `cost.ts`: implement `packageCost(sims, models, hpcId)` for visual
      group totals
- [x] `allocate.ts`: implement `allocateAcrossPeriods(totalCompute,
      periodSplit)` → `Record<periodId, {cpuHours, gpuHours}>`
- [x] `allocate.ts`: implement `normaliseSplit(periodSplit)` (clamp to [0,1],
      renormalise to sum 1, return a `valid: boolean` flag for UI warning)
- [x] `allocate.ts`: implement `autoSpread(periodIds, n)` →
      `{ [periodId]: 1/n }` helper for the "spread across N" button
- [x] `rollup.ts`: implement `rollup(state)` returning
      `Record<hpcId, { storageUsedTb, storageBudgetTb, periods:
      Record<periodId, { cpuUsed, cpuBudget, gpuUsed, gpuBudget }> }>`
- [x] `rollup.ts`: derive an `overBudget` boolean per metric for easy UI use
      (per-axis `*OverBudget` flags + helper `isOverBudget(rollup)`)
- [x] write tests covering: basic single-period sim; multi-period split;
      overhead applied to compute but not storage; zeroCompute historical
      sim; locked sim included; missing model cost → 0 + flagged in
      result; periodSplit summing to 0.9 → warning + scaled accordingly
- [x] run tests — must pass before Task 5

### Task 5: Tab shell + HPC Resources tab

**Files:**
- Create: `src/routes/+layout.svelte` (replace minimal version with tab bar)
- Create: `src/lib/components/TabBar.svelte`
- Create: `src/routes/hpcs/+page.svelte`
- Create: `src/lib/components/HpcEditor.svelte`
- Create: `src/lib/components/PeriodEditor.svelte`
- Create: `src/lib/util/id.ts` (tiny `newId()` helper)
- Create: `e2e/hpcs.spec.ts`

- [x] `TabBar.svelte`: nav with links to `/hpcs`, `/models`, `/simulations`,
      `/plan`, plus an "Import/Export" button (opens a modal in Task 8) —
      no-op button with `data-testid="import-export-button"` for now
- [x] root `+layout.svelte`: render TabBar above `<slot />`, wire
      `onMount` persistence hookup (moved from Task 3 if not already)
- [x] `/hpcs/+page.svelte`: list HPCs, "Add HPC" button, per-HPC edit form
      (name, storage budget) with embedded period list (label, CPU h
      budget, GPU h budget); inline delete buttons with confirm
- [x] all edits mutate `appState` via `appState.update(...)` (autosave
      handles persistence)
- [x] `e2e/hpcs.spec.ts`: add HPC + period, reload page, assert it's still
      there (had to wait for client hydration before clicking — first
      paint is the SSR snapshot, so an early click is swallowed)
- [x] component smoke tests for `HpcEditor` and `PeriodEditor` (via
      `@testing-library/svelte` — also pulled in `vite-plugin-svelte@4` to
      get proper Svelte 5 support and the `svelteTesting()` Vite plugin)
- [x] run unit + e2e tests — must pass before Task 6

### Task 6: Model Config tab

**Files:**
- Create: `src/routes/models/+page.svelte`
- Create: `src/lib/components/ModelEditor.svelte`
- Create: `src/lib/components/ModelCostMatrix.svelte`
- Create: `src/lib/components/VocabEditor.svelte` (for dataPortfolios &
  resolutions)
- Create: `e2e/models.spec.ts`

- [x] list models with add/delete; each row expands to a `ModelEditor`
- [x] `ModelCostMatrix.svelte`: for the selected model, render a grid of
      resolution × HPC cells; each cell opens a small editor for CPU/GPU
      per-month and a per-portfolio storage row
- [x] `VocabEditor.svelte`: top-of-page small editor for adding/removing
      resolutions and data portfolios (these are shared vocab lists in
      `appState`)
- [x] when a resolution or portfolio is removed, prompt before deleting
      (since it may be referenced by sims/cost cells); on removal, also
      strip the value from all `model.costs` (resolution row and/or
      portfolio key)
- [x] `e2e/models.spec.ts`: add a model, define a cost cell, reload, assert
      cell value persists
- [x] component smoke tests
- [x] run unit + e2e tests — must pass before Task 7

### Task 7: Simulations & Packages tab

**Files:**
- Create: `src/routes/simulations/+page.svelte`
- Create: `src/lib/components/SimulationEditor.svelte`
- Create: `src/lib/components/SimulationTotals.svelte`
- Create: `e2e/simulations.spec.ts`

- [x] list simulations grouped by `packageLabel` (visual grouping only —
      ungrouped section for sims without a label); "Add Simulation" button
- [x] `SimulationEditor.svelte`: form with name, model dropdown (filtered to
      defined models), resolution dropdown (filtered to model's defined
      resolutions), length (years), ensembles, dataPortfolio dropdown,
      overheadMultiplier (default 1.15), packageLabel (free text),
      `locked` checkbox revealing `pinnedHpcId` dropdown,
      `zeroCompute` checkbox
- [x] `SimulationTotals.svelte`: displays the computed
      `{cpuHours, gpuHours, storageTb}` for the sim **per HPC** (since
      costs differ per HPC); uses `simulationCost` from Task 4
- [x] inline validation: locked → pinnedHpcId required; sim with no cost
      cell for its (model, resolution, hpc) shows "no cost defined" warning
- [x] `e2e/simulations.spec.ts`: create a model+cost+sim and assert the
      computed totals match expected values
- [x] component smoke tests
- [x] run unit + e2e tests — must pass before Task 8

### Task 8: Plan / Assignment tab (the big one)

**Files:**
- Create: `src/routes/plan/+page.svelte`
- Create: `src/lib/components/HpcLane.svelte` (drop target column per HPC)
- Create: `src/lib/components/SimulationCard.svelte` (draggable card)
- Create: `src/lib/components/UnassignedTray.svelte`
- Create: `src/lib/components/PeriodSplitEditor.svelte`
- Create: `src/lib/components/BudgetMeter.svelte`
- Create: `e2e/plan.spec.ts`
- Modify: `package.json` (add `svelte-dnd-action`)

- [ ] derived store `assignedByHpc` and `unassigned` driven from
      `assignments` and `simulations`
- [ ] derived store `rollupStore` calling `rollup(state)` from Task 4
- [ ] `UnassignedTray.svelte`: lists sims with no assignment as draggable
      cards
- [ ] `HpcLane.svelte`: shows HPC name, `BudgetMeter` per period for CPU/GPU
      and one for cumulative storage, and the list of assigned
      `SimulationCard`s
- [ ] drag-drop with `svelte-dnd-action`: dropping a card on an HPC lane
      creates/updates the corresponding `Assignment` with a default
      single-period split (= 1.0 on the HPC's first period)
- [ ] locked sims appear pre-assigned, rendered with a lock icon, and are
      `dragDisabled` (svelte-dnd-action supports per-item disable)
- [ ] clicking a card opens `PeriodSplitEditor` (per-period fractions with
      "auto-spread N" helper and live valid/invalid indicator from
      `normaliseSplit`)
- [ ] `BudgetMeter.svelte`: small bar + numeric (used / budget); applies
      `bg-red-*` Tailwind classes when `overBudget`
- [ ] "Unassign" button on each card removes its assignment
- [ ] `e2e/plan.spec.ts`: define HPC+period+model+cost+sim, drag sim onto
      HPC lane, assert budget meter updates; force over-budget by editing
      sim length, assert red warning appears
- [ ] component smoke tests
- [ ] run unit + e2e tests — must pass before Task 9

### Task 9: JSON import / export

**Files:**
- Create: `src/lib/io/json.ts`
- Create: `src/lib/io/json.test.ts`
- Create: `src/lib/components/ImportExportModal.svelte`
- Modify: `src/lib/components/TabBar.svelte` (wire the button from Task 5)

- [ ] `exportState(state)` → returns formatted JSON string with
      `schemaVersion`
- [ ] `importState(jsonString)` → runs `validateState` + `migrate`, returns
      `AppState` or throws with a human-readable error
- [ ] modal UI: "Export" button triggers a file download named
      `resource-planner-YYYY-MM-DD.json`; "Import" file picker reads the
      file, calls `importState`, and on success replaces `appState`
- [ ] on schemaVersion mismatch, show a short notice ("upgraded from v1") but
      proceed
- [ ] on validation failure, show the error message and do NOT touch state
- [ ] write tests: round-trip export → import yields identical state;
      malformed JSON rejected; missing required field rejected; older
      schemaVersion is migrated
- [ ] run unit tests + manually exercise the modal in `npm run dev`
- [ ] run e2e: export, clear localStorage, import the file, assert state
      restored
- [ ] tests — must pass before Task 10

### Task 10: Polish & cross-cutting validation

**Files:**
- Modify: any tab component as needed
- Create: `src/lib/components/EmptyState.svelte`
- Create: `src/lib/components/Toast.svelte`
- Create: `src/lib/stores/toast.ts`

- [ ] empty-state components on every tab ("No HPCs yet — add one to get
      started", etc.) so the app isn't a wall of blank tables on first run
- [ ] toast store + component for non-blocking notifications (import
      success, validation errors, autosave indicator)
- [ ] cross-cutting checks: deleting an HPC referenced by an assignment
      prompts confirm and cascades; same for deleting a model with
      simulations; same for vocabulary items
- [ ] keyboard-accessible drag fallback on the Plan tab (svelte-dnd-action
      supports this) — add a tiny "move to…" menu on each card
- [ ] add basic responsive breakpoints (tabs collapse to a dropdown under
      640px)
- [ ] write tests for cascade-delete logic and toast store
- [ ] run full test suite — must pass before Task 11

### Task 11: Verify acceptance criteria
- [ ] verify each of the four tabs implements the behaviour described in the
      Overview
- [ ] verify locked simulations cannot be dragged, but their period split
      can still be edited
- [ ] verify storage is per-HPC and accumulates across periods (not reset)
- [ ] verify overhead multiplier affects only compute, not storage
- [ ] verify import + export round-trips a non-trivial state losslessly
- [ ] verify over-budget cells render the warning style
- [ ] run full test suite: `npm run test && npm run test:e2e`
- [ ] verify a production build with `npm run build && npm run preview`
- [ ] check the built `build/` output is fully static (no server entrypoint)

### Task 12: [Final] Documentation & plan archival
- [ ] expand `README.md`: quickstart, JSON schema reference, hosting note
      ("any static host works: GitHub Pages, Netlify, S3+CloudFront")
- [ ] add `CLAUDE.md` capturing: project type (SvelteKit static SPA), where
      the calc layer lives (`src/lib/calc/`), state model (`src/lib/types
      .ts`), where to add new tabs
- [ ] move this plan to `docs/plans/completed/`

## Post-Completion

**Manual verification:**
- Load a realistic year of climate runs into the app and sanity-check the
  rollups against existing spreadsheets.
- Try the import/export round-trip with a colleague (the only "sharing"
  mechanism in v1).

**Future / stretch (NOT v1):**
- `?config=<base64>` URL sharing — encode/decode in `src/lib/io/url.ts`;
  trades collaboration ergonomics for very long URLs.
- Tiny shared-state backend (single SQLite file, single shared secret) for
  real collaboration without per-user auth.
- A "compare scenarios" view: keep two named snapshots and diff their
  rollups side by side.
- Wall-clock throughput modelling so the period split could be
  auto-suggested from a model's known throughput per HPC.

**Hosting:**
- The `build/` output is fully static; pick any of GitHub Pages, Netlify,
  Cloudflare Pages, or an internal S3 bucket. No environment variables, no
  secrets, no runtime config.
