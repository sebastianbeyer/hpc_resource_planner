<script lang="ts">
  import { appState } from '$lib/stores/state';
  import { downloadStateAsFile, importState } from '$lib/io/json';
  import { CURRENT_SCHEMA_VERSION } from '$lib/schema';

  export let open: boolean;
  export let onClose: () => void;

  let fileInput: HTMLInputElement | null = null;
  let selectedFile: File | null = null;
  let errorMessage = '';

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

      let msg = 'State imported successfully.';
      if (priorVersion !== undefined && priorVersion !== migrated.schemaVersion) {
        msg += ` Upgraded from v${priorVersion}.`;
      }
      if (typeof window !== 'undefined') window.alert(msg);
      onClose();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
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
