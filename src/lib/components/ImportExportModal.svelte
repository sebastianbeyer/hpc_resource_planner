<script lang="ts">
  import { appState } from '$lib/stores/state';
  import { downloadStateAsFile, importState } from '$lib/io/json';
  import { buildShareUrl, URL_LENGTH_SOFT_CAP } from '$lib/io/url';
  import { CURRENT_SCHEMA_VERSION } from '$lib/schema';
  import { pushToast } from '$lib/stores/toast';

  export let open: boolean;
  export let onClose: () => void;

  let fileInput: HTMLInputElement | null = null;
  let selectedFile: File | null = null;
  let errorMessage = '';

  let shareUrl = '';
  let shareUrlComputing = false;
  let shareUrlReqId = 0;

  $: if (open && typeof window !== 'undefined') {
    const my = ++shareUrlReqId;
    shareUrlComputing = true;
    void buildShareUrl($appState, window.location.href).then((url) => {
      if (my === shareUrlReqId) {
        shareUrl = url;
        shareUrlComputing = false;
      }
    });
  } else if (!open) {
    shareUrlReqId++;
    shareUrl = '';
    shareUrlComputing = false;
  }

  $: shareUrlTooLong = shareUrl.length > URL_LENGTH_SOFT_CAP;

  async function handleCopyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      pushToast({ kind: 'success', message: 'Share URL copied to clipboard.', ttlMs: 3000 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushToast({ kind: 'error', message: `Could not copy: ${msg}`, ttlMs: 5000 });
    }
  }

  // Reset transient UI state whenever the modal is reopened.
  $: if (open) {
    errorMessage = '';
    selectedFile = null;
    if (fileInput) fileInput.value = '';
  }

  function handleBackdropClick(event: MouseEvent) {
    // Only close when the actual backdrop (not the panel) is clicked.
    if (event.target === event.currentTarget) onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }

  function handleExport() {
    downloadStateAsFile($appState);
  }

  function handleFileChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    selectedFile = target.files && target.files.length > 0 ? target.files[0] : null;
    errorMessage = '';
  }

  async function handleImport() {
    if (!selectedFile) {
      errorMessage = 'Please choose a JSON file first.';
      return;
    }
    errorMessage = '';

    let text: string;
    try {
      text = await selectedFile.text();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      return;
    }

    try {
      // Detect prior schemaVersion before migration so we can flag an upgrade.
      let priorVersion: number | undefined;
      try {
        const parsedPeek = JSON.parse(text);
        if (
          parsedPeek &&
          typeof parsedPeek === 'object' &&
          typeof parsedPeek.schemaVersion === 'number'
        ) {
          priorVersion = parsedPeek.schemaVersion;
        }
      } catch {
        // Let importState produce the canonical parse error below.
      }

      const migrated = importState(text);
      appState.set(migrated);

      const summary =
        `${migrated.hpcs.length} HPC${migrated.hpcs.length === 1 ? '' : 's'}, ` +
        `${migrated.models.length} model${migrated.models.length === 1 ? '' : 's'}, ` +
        `${migrated.simulations.length} sim${migrated.simulations.length === 1 ? '' : 's'}`;
      let msg = `State imported (${summary}).`;
      if (priorVersion !== undefined && priorVersion !== migrated.schemaVersion) {
        msg += ` Upgraded from v${priorVersion}.`;
      }
      pushToast({ kind: 'success', message: msg, ttlMs: 5000 });
      onClose();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      // Also surface a transient toast so dismissing the modal still leaves
      // feedback visible (the inline error stays put while the modal is open).
      pushToast({ kind: 'error', message: `Import failed: ${errorMessage}`, ttlMs: 6000 });
    }
  }

  $: state = $appState;
  $: hpcCount = state.hpcs.length;
  $: modelCount = state.models.length;
  $: simCount = state.simulations.length;
  $: assignmentCount = state.assignments.length;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    data-testid="import-export-modal"
    role="presentation"
    on:click={handleBackdropClick}
  >
    <div
      class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="io-modal-title"
    >
      <div class="mb-4 flex items-start justify-between">
        <h2 id="io-modal-title" class="text-xl font-bold text-slate-900">
          Import / Export
        </h2>
        <button
          type="button"
          class="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          on:click={onClose}
          data-testid="io-close"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div class="mb-6 rounded border border-slate-200 bg-slate-50 p-4" data-testid="io-share">
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Share via URL
        </h3>
        <p class="mb-3 text-sm text-slate-700">
          Encodes the entire state into the page URL. Anyone who opens the link is asked
          whether to replace their local state.
        </p>
        <div class="flex gap-2">
          <input
            type="text"
            readonly
            value={shareUrl}
            placeholder={shareUrlComputing ? 'Encoding…' : ''}
            class="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-800"
            data-testid="io-share-url"
            aria-label="Shareable URL"
          />
          <button
            type="button"
            class="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            on:click={handleCopyShareUrl}
            disabled={!shareUrl}
            data-testid="io-share-copy"
          >
            Copy
          </button>
        </div>
        <p class="mt-2 text-xs text-slate-600" data-testid="io-share-length">
          {#if shareUrl}
            URL length: {shareUrl.length} characters (compressed).
          {:else}
            Encoding…
          {/if}
          {#if shareUrlTooLong}
            <span class="font-semibold text-amber-700">
              Warning: longer than {URL_LENGTH_SOFT_CAP} chars — may get truncated by some
              clients. Consider exporting JSON instead.
            </span>
          {/if}
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Export -->
        <section
          class="rounded border border-slate-200 bg-slate-50 p-4"
          data-testid="io-export"
        >
          <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Export
          </h3>
          <p class="mb-3 text-sm text-slate-700">
            Current state: <strong>{hpcCount}</strong> HPCs,
            <strong>{modelCount}</strong> models,
            <strong>{simCount}</strong> sims,
            <strong>{assignmentCount}</strong> assignments
            (schema v{state.schemaVersion ?? CURRENT_SCHEMA_VERSION}).
          </p>
          <button
            type="button"
            class="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            on:click={handleExport}
            data-testid="io-download"
          >
            Download JSON
          </button>
        </section>

        <!-- Import -->
        <section
          class="rounded border border-slate-200 bg-slate-50 p-4"
          data-testid="io-import"
        >
          <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Import
          </h3>
          <p class="mb-3 text-sm text-slate-700">
            Choose a previously exported JSON file. This will <strong>replace</strong>
            all current state.
          </p>
          <input
            type="file"
            accept="application/json"
            bind:this={fileInput}
            on:change={handleFileChange}
            class="mb-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
            data-testid="io-file"
          />
          <button
            type="button"
            class="w-full rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            on:click={handleImport}
            disabled={!selectedFile}
            data-testid="io-replace"
          >
            Replace state
          </button>
          {#if errorMessage}
            <p
              class="mt-3 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700"
              data-testid="io-error"
            >
              {errorMessage}
            </p>
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}
