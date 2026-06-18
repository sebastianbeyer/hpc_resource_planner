<script lang="ts">
  import { page } from '$app/stores';
  import ImportExportModal from './ImportExportModal.svelte';

  type Tab = { href: string; label: string };

  const tabs: Tab[] = [
    { href: '/hpcs', label: 'HPC Resources' },
    { href: '/models', label: 'Models' },
    { href: '/simulations', label: 'Simulations' },
    { href: '/plan', label: 'Plan' }
  ];

  $: pathname = $page.url.pathname;

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  let showIO = false;

  function openIO() {
    showIO = true;
  }

  function closeIO() {
    showIO = false;
  }
</script>

<nav
  class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2"
  data-testid="tab-bar"
>
  <ul class="flex items-center gap-1">
    {#each tabs as tab}
      <li>
        <a
          href={tab.href}
          class="inline-block rounded px-3 py-2 text-sm font-medium transition-colors"
          class:bg-slate-900={isActive(tab.href)}
          class:text-white={isActive(tab.href)}
          class:text-slate-700={!isActive(tab.href)}
          class:hover:bg-slate-100={!isActive(tab.href)}
          aria-current={isActive(tab.href) ? 'page' : undefined}
        >
          {tab.label}
        </a>
      </li>
    {/each}
  </ul>
  <button
    type="button"
    data-testid="import-export-button"
    class="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
    on:click={openIO}
  >
    Import / Export
  </button>
</nav>

<ImportExportModal bind:open={showIO} onClose={closeIO} />
