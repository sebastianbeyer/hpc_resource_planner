<script lang="ts">
  export let label: string;
  export let items: string[];
  export let onChange: (next: string[]) => void;
  export let isReferenced: (item: string) => boolean = () => false;

  let draft = '';

  function addItem() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    if (items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    draft = '';
  }

  function removeItem(item: string) {
    if (isReferenced(item)) {
      const ok = window.confirm(
        `'${item}' is still referenced by other entries; remove anyway?`
      );
      if (!ok) return;
    }
    onChange(items.filter((i) => i !== item));
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  }
</script>

<section
  class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
  data-testid="vocab-editor"
>
  <h3 class="mb-2 text-sm font-semibold text-slate-700">{label}</h3>
  <div class="flex items-center gap-2">
    <input
      type="text"
      class="w-40 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900"
      placeholder="Add new…"
      bind:value={draft}
      on:keydown={onKeydown}
      data-testid="vocab-input"
    />
    <button
      type="button"
      class="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
      on:click={addItem}
      data-testid="vocab-add"
    >
      Add
    </button>
  </div>
  {#if items.length === 0}
    <p class="mt-3 text-xs italic text-slate-500">No entries yet.</p>
  {:else}
    <ul class="mt-3 flex flex-wrap gap-2" data-testid="vocab-list">
      {#each items as item (item)}
        <li
          class="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-800"
          data-testid="vocab-pill"
        >
          <span>{item}</span>
          <button
            type="button"
            class="rounded-full text-slate-500 hover:text-red-600"
            aria-label={`Remove ${item}`}
            on:click={() => removeItem(item)}
            data-testid="vocab-remove"
          >
            ×
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
