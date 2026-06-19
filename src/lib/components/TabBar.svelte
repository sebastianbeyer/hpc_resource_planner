<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import ImportExportModal from './ImportExportModal.svelte';

  type ConfigHref = '/hpcs' | '/models' | '/simulations';
  type TabHref = '/plan' | ConfigHref;

  const planTab = { href: '/plan' as const, label: 'Plan Simulations' };
  const configTabs: { href: ConfigHref; label: string }[] = [
    { href: '/hpcs', label: 'HPC Resources' },
    { href: '/models', label: 'Models' },
    { href: '/simulations', label: 'Simulations' }
  ];
  const allTabs: { href: TabHref; label: string }[] = [planTab, ...configTabs];

  $: routeId = $page.route.id ?? '/';

  function isActive(href: TabHref): boolean {
    return routeId === href || routeId.startsWith(`${href}/`);
  }

  $: configActive = configTabs.some((t) => isActive(t.href));

  function isTabHref(value: string): value is TabHref {
    return allTabs.some((tab) => tab.href === value);
  }

  // Match the active tab href for the mobile <select>; falls back to /plan.
  $: currentTabHref = allTabs.find((t) => isActive(t.href))?.href ?? '/plan';

  function handleMobileChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    if (isTabHref(target.value) && target.value !== routeId) {
      void goto(resolve(target.value));
    }
  }

  let showConfigMenu = false;

  function toggleConfig() {
    showConfigMenu = !showConfigMenu;
  }

  function closeConfigMenu() {
    showConfigMenu = false;
  }

  // Close the dropdown when clicking outside its wrapper.
  function onWindowClick(e: MouseEvent) {
    if (!showConfigMenu) return;
    const target = e.target as Element | null;
    if (target && !target.closest('[data-testid="config-menu-wrapper"]')) {
      showConfigMenu = false;
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

<svelte:window on:click={onWindowClick} />

<nav
  class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2"
  data-testid="tab-bar"
>
  <!-- Desktop: Plan as primary item + Config dropdown -->
  <ul class="hidden items-center gap-2 sm:flex" data-testid="tab-bar-desktop">
    <li>
      <a
        href={resolve(planTab.href)}
        class="inline-block rounded px-4 py-2 text-base font-semibold transition-colors"
        class:bg-slate-900={isActive(planTab.href)}
        class:text-white={isActive(planTab.href)}
        class:text-slate-900={!isActive(planTab.href)}
        class:hover:bg-slate-100={!isActive(planTab.href)}
        aria-current={isActive(planTab.href) ? 'page' : undefined}
        data-testid="tab-plan"
      >
        {planTab.label}
      </a>
    </li>
    <li class="relative" data-testid="config-menu-wrapper">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-medium transition-colors"
        class:bg-slate-900={configActive}
        class:text-white={configActive}
        class:text-slate-700={!configActive}
        class:hover:bg-slate-100={!configActive}
        aria-haspopup="menu"
        aria-expanded={showConfigMenu}
        on:click={toggleConfig}
        data-testid="config-menu-button"
      >
        Config
        <span aria-hidden="true" class="text-xs">▾</span>
      </button>
      {#if showConfigMenu}
        <ul
          class="absolute left-0 z-10 mt-1 w-44 rounded border border-slate-300 bg-white p-1 shadow-lg"
          role="menu"
          data-testid="config-menu"
        >
          {#each configTabs as tab}
            <li role="none">
              <a
                href={resolve(tab.href)}
                role="menuitem"
                class="block rounded px-2 py-1.5 text-sm font-medium transition-colors"
                class:bg-slate-900={isActive(tab.href)}
                class:text-white={isActive(tab.href)}
                class:text-slate-700={!isActive(tab.href)}
                class:hover:bg-slate-100={!isActive(tab.href)}
                aria-current={isActive(tab.href) ? 'page' : undefined}
                on:click={closeConfigMenu}
              >
                {tab.label}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </li>
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
      <option value={planTab.href}>{planTab.label}</option>
      <optgroup label="Config">
        {#each configTabs as tab}
          <option value={tab.href}>{tab.label}</option>
        {/each}
      </optgroup>
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
