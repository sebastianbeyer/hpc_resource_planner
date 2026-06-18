import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    // jsdom blocks localStorage for opaque origins (the default `about:blank`
    // URL), so give it a real URL to enable Web Storage in tests.
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    },
    // Bridge jsdom's localStorage / sessionStorage onto the test global —
    // see src/test-setup.ts for why this is needed on Node 26+.
    setupFiles: ['./src/test-setup.ts']
  }
});
