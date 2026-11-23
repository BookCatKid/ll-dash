<script>
  let { id, label, value = null, required = false, onChange } = $props();

  const selected = $derived(Number(value || 0));
</script>

<fieldset class="rating-input" aria-label={label}>
  <legend class="form-label">
    {label}{#if required}
      <span class="required-marker" aria-label="required">*</span>{/if}
  </legend>
  <div class="rating-input-choices">
    {#each [1, 2, 3, 4, 5] as rating}
      <label class="rating-input-option" class:filled={selected >= rating}>
        <input
          type="radio"
          name={id}
          value={rating}
          checked={selected === rating}
          {required}
          onchange={() => onChange(rating)}
        />
        <span class="rating-input-star" aria-hidden="true">★</span>
        <span class="sr-only">{rating} of 5 stars</span>
      </label>
    {/each}
  </div>
</fieldset>
