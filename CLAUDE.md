# Codebase orientation for Claude

## Project type

SvelteKit static SPA. Svelte 5, TypeScript, Tailwind. Built with `@sveltejs/adapter-static` and prerendered — no server endpoints, no runtime config.

## Entry points

- `src/routes/+layout.svelte` — mounts the tab shell, the toast outlet, and on `onMount` wires up `loadFromLocalStorage()` + `attachAutosave(appState)`.
- `src/routes/{hpcs,models,simulations,plan}/+page.svelte` — one route per tab.

## State model

- Single `appState` writable in `src/lib/stores/state.ts`. All mutations go through `appState.update(...)`.
- The shape is `AppState` in `src/lib/types.ts` — that file is the canonical reference for what data the app holds. Per-slice derived stores (`hpcsStore`, `modelsStore`, etc.) live alongside `appState` for convenience.

## Persistence

- `src/lib/stores/persistence.ts` — localStorage at key `hpc-resource-planner:state:v1` with 250 ms debounced autosave.
- All localStorage access is SSR-safe (`typeof window !== 'undefined'` guards) because prerender runs in Node.

## Calculation layer

- `src/lib/calc/cost.ts`, `allocate.ts`, `rollup.ts` — pure functions, no DOM, no stores. This is the trickiest logic in the app and is fully unit-tested. If you change the resource math, update the tests in the same files (`*.test.ts`).
- Rule of thumb: overhead multiplier applies to compute only; storage rates are model/resolution/data-portfolio values, not HPC-specific, and storage accumulates per HPC across all periods. Completed simulations still count as used resources, but rollups track their completed portion separately so meters can render it grey.

## Cascade-delete

- `src/lib/cascade.ts` — pure helpers used by the HPC and Model pages when deleting an entity that other entities reference (HPC referenced by assignments; model referenced by simulations; vocab items referenced by models/sims). Pure so they're easy to test.

## IO

- `src/lib/io/json.ts` — `exportState` / `importState` (the latter runs `validateState` + `migrate`). The `ImportExportModal` component wraps the UI.

## Components convention

- Callback props (`onChange`, `onDelete`) instead of dispatched events. Simpler typing under Svelte 5 runes, and component boundaries stay obvious.

## Testing

- Vitest: any `src/**/*.test.ts`. Component smoke tests use `@testing-library/svelte` against jsdom. There is a `src/test-setup.ts` bridging jsdom's localStorage to Node 26's stub globals — leave it alone unless tests break.
- Playwright: `e2e/*.spec.ts`. One happy-path per tab; tests wait for client hydration before clicking (the first paint is SSR snapshot and swallows early clicks).

## Adding a new tab

1. Create `src/routes/<tab>/+page.svelte`.
2. Add a link in `src/lib/components/TabBar.svelte` (both the desktop nav and the mobile `<select>`).
3. In the page, read from the derived stores and mutate via `appState.update(...)`. Autosave handles persistence.

## Plan tab specifics

Uses click-driven assignment menus, not `svelte-dnd-action` (Svelte 5 compatibility — see the header comment in `src/routes/plan/+page.svelte`). Locked sims don't expose the assign/unassign/move controls but still expose "Edit split".

## Schema migrations

`src/lib/schema.ts` holds the migration ladder. When changing the `AppState` shape:

1. Bump `CURRENT_SCHEMA_VERSION`.
2. Add a migration step that maps the previous shape to the new one.
3. Update `defaultState()` if needed.
4. Add a test for the migration in `src/lib/schema.test.ts`.

Exported JSON files always carry `schemaVersion`; older files are upgraded on import.
