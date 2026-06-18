<script lang="ts">
  import { dismissToast, toasts, type ToastKind } from '$lib/stores/toast';

  function kindClasses(kind: ToastKind): string {
    switch (kind) {
      case 'success':
        return 'border-emerald-300 bg-emerald-50 text-emerald-900';
      case 'error':
        return 'border-red-300 bg-red-50 text-red-900';
      case 'warning':
        return 'border-amber-300 bg-amber-50 text-amber-900';
      case 'info':
      default:
        return 'border-blue-300 bg-blue-50 text-blue-900';
    }
  }
</script>

{#if $toasts.length > 0}
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    data-testid="toast-stack"
    role="region"
    aria-label="Notifications"
  >
    {#each $toasts as toast (toast.id)}
      <div
        class="pointer-events-auto flex min-w-[16rem] max-w-md items-start justify-between gap-3 rounded border px-3 py-2 text-sm shadow-lg {kindClasses(
          toast.kind
        )}"
        data-testid="toast"
        data-kind={toast.kind}
        role={toast.kind === 'error' ? 'alert' : 'status'}
      >
        <span class="flex-1" data-testid="toast-message">{toast.message}</span>
        <button
          type="button"
          class="flex-shrink-0 rounded px-1 text-xs font-bold text-slate-600 hover:text-slate-900"
          on:click={() => dismissToast(toast.id)}
          data-testid="toast-dismiss"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}
