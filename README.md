# HPC Resource Planner

A client-only single-page web tool for planning campaigns of climate simulations across multiple HPCs, tracking CPU/GPU hours and storage budgets per period. Built as a static SPA using SvelteKit; all state lives in `localStorage` and can be exported/imported as JSON for sharing.

## Quickstart

```bash
npm install
npm run dev          # start dev server at http://localhost:5173
npm run build        # produce static build/ output
npm run preview      # serve the static build locally
npm run test         # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run check        # TypeScript / Svelte type check
```

The build output in `build/` is fully static and can be hosted on any static file host (GitHub Pages, Netlify, S3+CloudFront, etc.).
