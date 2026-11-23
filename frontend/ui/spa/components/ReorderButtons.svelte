<script>
  import Icon from './Icon.svelte';

  let { label, index, total, onMove } = $props();
</script>

<div class="cfg-reorder-buttons">
  <button
    type="button"
    class="icon-btn cfg-mini"
    aria-label={`Move ${label} up`}
    title={`Move ${label} up`}
    disabled={index === 0}
    onclick={() => onMove(-1)}
  >
    <Icon name="arrow-up" size={17} />
  </button>
  <button
    type="button"
    class="icon-btn cfg-mini"
    aria-label={`Move ${label} down`}
    title={`Move ${label} down`}
    disabled={index === total - 1}
    onclick={() => onMove(1)}
  >
    <Icon name="arrow-down" size={17} />
  </button>
</div>
