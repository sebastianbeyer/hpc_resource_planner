<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { appState } from '$lib/stores/state';
  import { attachAutosave, loadFromLocalStorage } from '$lib/stores/persistence';
  import { attachUiPrefsAutosave, loadUiPrefs } from '$lib/stores/ui-prefs';
  import { decodeStateFromParam, readConfigParam, stripConfigParam } from '$lib/io/url';
  import { pushToast } from '$lib/stores/toast';
  import TabBar from '$lib/components/TabBar.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import SharedConfigPrompt from '$lib/components/SharedConfigPrompt.svelte';
  import type { AppState } from '$lib/types';

  let pendingShared: AppState | null = null;
  let currentSnapshot: AppState | null = null;
  let showSharedPrompt = false;

  function clearConfigFromUrl() {
    if (typeof window === 'undefined') return;
    const next = stripConfigParam(window.location.href);
    window.history.replaceState(window.history.state, '', next);
  }

  function acceptShared() {
    if (pendingShared) appState.set(pendingShared);
    pendingShared = null;
    currentSnapshot = null;
    showSharedPrompt = false;
    clearConfigFromUrl();
    pushToast({ kind: 'success', message: 'Shared configuration loaded.', ttlMs: 4000 });
  }

  function dismissShared() {
    pendingShared = null;
    currentSnapshot = null;
    showSharedPrompt = false;
    clearConfigFromUrl();
  }

  onMount(() => {
    const loaded = loadFromLocalStorage();
    if (loaded) appState.set(loaded);

    const token = readConfigParam(window.location.search);
    if (token) {
      decodeStateFromParam(token).then(
        (decoded) => {
          pendingShared = decoded;
          currentSnapshot = loaded;
          showSharedPrompt = true;
        },
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          pushToast({ kind: 'error', message: `Shared link rejected: ${msg}`, ttlMs: 6000 });
          clearConfigFromUrl();
        }
      );
    }

    loadUiPrefs();
    const unsub = attachAutosave(appState);
    const unsubUi = attachUiPrefsAutosave();
    return () => {
      unsub();
      unsubUi();
    };
  });
</script>

<div class="min-h-screen bg-slate-50 text-slate-900">
  <TabBar />
  <main class="mx-auto max-w-6xl px-4 py-6">
    <slot />
  </main>
  <Toast />
  <SharedConfigPrompt
    open={showSharedPrompt}
    incoming={pendingShared}
    current={currentSnapshot}
    onAccept={acceptShared}
    onDismiss={dismissShared}
  />
</div>
