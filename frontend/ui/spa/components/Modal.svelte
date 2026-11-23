<script>
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  let { open, title, onClose, children, size = 'standard' } = $props();
  let dialog;
  let current = false;

  $effect(() => {
    if (!dialog) return;
    if (open && !current) {
      current = true;
      dialog.showModal();
    } else if (!open && current) {
      current = false;
      dialog.close();
    }
  });

  function cancel(event) {
    event.preventDefault();
    onClose();
  }

  function handleBackdrop(event) {
    if (event.target === dialog) onClose();
  }
</script>

<dialog
  bind:this={dialog}
  class="svelte-dialog {size}"
  oncancel={cancel}
  onclick={handleBackdrop}
  aria-label={title}
>
  <div class="modal-header">
    <span class="modal-title">{title}</span>
    <button class="modal-close" type="button" aria-label="Close" title="Close" onclick={onClose}>
      <Icon name="x" size={18} />
    </button>
  </div>
  <div class="modal-body">
    {@render children()}
  </div>
</dialog>
