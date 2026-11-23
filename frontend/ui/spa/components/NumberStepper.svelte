<script>
  let {
    label,
    value = null,
    min = 0,
    max = 6,
    onChange,
    variant = '',
    disabled = false,
  } = $props();

  const current = $derived(value == null ? null : Number(value));
  const canDecrease = $derived(!disabled && current != null && current > min);
  const canIncrease = $derived(!disabled && (current == null || current < max));

  function change(amount) {
    const previous = current ?? 0;
    onChange(Math.max(min, Math.min(max, previous + amount)));
  }
</script>

<div class="number-stepper {variant}" role="group" aria-label={label}>
  <span class="number-stepper-label" aria-hidden="true">
    {variant === 'red' ? 'Red' : variant === 'blue' ? 'Blue' : ''}
  </span>
  <button
    type="button"
    class="number-stepper-button"
    aria-label={`Decrease ${label}`}
    disabled={!canDecrease}
    onclick={() => change(-1)}
  >
    −
  </button>
  <output class="number-stepper-value" aria-label={label} aria-live="polite">
    {current ?? '–'}
  </output>
  <button
    type="button"
    class="number-stepper-button"
    aria-label={`Increase ${label}`}
    disabled={!canIncrease}
    onclick={() => change(1)}
  >
    +
  </button>
</div>
