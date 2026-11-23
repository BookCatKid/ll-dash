<script>
  import Icon from './Icon.svelte';
  import ReorderButtons from './ReorderButtons.svelte';

  let { label, index, total, onMove, onRemove, children, secondary = null } = $props();
</script>

<div class="cfg-row" role="group" aria-label={label}>
  {@render children()}
  <div class="cfg-row-actions">
    {#if secondary}
      <div class="cfg-row-secondary">{@render secondary()}</div>
    {/if}
    <div class="cfg-row-buttons">
      <ReorderButtons {label} {index} {total} {onMove} />
      <button
        type="button"
        class="icon-btn cfg-mini cfg-del"
        aria-label={`Remove ${label}`}
        title={`Remove ${label}`}
        onclick={onRemove}
      >
        <Icon name="trash-2" size={17} />
      </button>
    </div>
  </div>
</div>
