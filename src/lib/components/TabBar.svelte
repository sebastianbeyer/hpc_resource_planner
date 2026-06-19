<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import ImportExportModal from './ImportExportModal.svelte';

  type TabHref = '/hpcs' | '/models' | '/simulations' | '/plan';
  type Tab = { href: TabHref; label: string };

  const tabs: Tab[] = [
    { href: '/hpcs', label: 'HPC Resources' },
    { href: '/models', label: 'Models' },
    { href: '/simulations', label: 'Simulations' },
    { href: '/plan', label: 'Plan' }
  ];

  $: routeId = $page.route.id ?? '/';

  function isActive(href: TabHref): boolean {
    return routeId === href || routeId.startsWith(`${href}/`);
  }

  function isTabHref(value: string): value is TabHref {
    return tabs.some((tab) => tab.href === value);
  }

  // Match the active tab href for the mobile <select>; falls back to /hpcs.
  $: currentTabHref = tabs.find((t) => isActive(t.href))?.href ?? '/hpcs';

  function handleMobileChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    if (isTabHref(target.value) && target.value !== routeId) {
      void goto(resolve(target.value));
    }
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
  <!-- Desktop: full tab list -->
  <ul class="hidden items-center gap-1 sm:flex" data-testid="tab-bar-desktop">
    {#each tabs as tab}
      <li>
        <a
          href={resolve(tab.href)}
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

  <!-- Mobile: collapsed <select> -->
  <label class="block sm:hidden" data-testid="tab-bar-mobile">
    <span class="sr-only">Navigate</span>
    <select
      class="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800"
      value={currentTabHref}
      on:change={handleMobileChange}
      data-testid="tab-bar-mobile-select"
    >
      {#each tabs as tab}
        <option value={tab.href}>{tab.label}</option>
      {/each}
    </select>
  </label>

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
