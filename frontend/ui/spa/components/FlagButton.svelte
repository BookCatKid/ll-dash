<script>
  let { flag, selected = false, compact = false, onSelect } = $props();

  const accent = $derived(
    flag.color || (flag.key === 'neutral' ? 'var(--text2)' : 'var(--accent2)'),
  );
</script>

<button
  type="button"
  class="flag-btn"
  class:active={selected}
  class:compact
  style:--flag-color={accent}
  aria-label={compact ? flag.label : undefined}
  aria-pressed={selected}
  title={flag.label}
  onclick={onSelect}
>
  {#if flag.icon}
    <span class="flag-icon" aria-hidden="true">{flag.icon}</span>
  {/if}
  {#if !compact || !flag.icon}
    <span class="flag-text">{flag.label}</span>
  {/if}
</button>
