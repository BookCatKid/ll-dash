<script>
  import { Dialog } from 'bits-ui';
  import Icon from './Icon.svelte';

  let { open, title, onClose, children, size = 'standard' } = $props();
</script>

<Dialog.Root
  {open}
  onOpenChange={(nextOpen) => {
    if (!nextOpen) onClose();
  }}
>
  <Dialog.Portal>
    <Dialog.Overlay class="svelte-dialog-overlay" />
    <Dialog.Content class="svelte-dialog {size}" aria-label={title}>
      <div class="modal-header">
        <Dialog.Title class="modal-title">{title}</Dialog.Title>
        <Dialog.Close class="modal-close" aria-label="Close" title="Close">
          <Icon name="x" size={18} />
        </Dialog.Close>
      </div>
      <div class="modal-body">
        {@render children()}
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
