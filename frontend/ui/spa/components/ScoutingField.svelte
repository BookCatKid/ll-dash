<script>
  import RatingInput from './RatingInput.svelte';

  let { field, value = null, onChange } = $props();
  const id = $derived(`scouting-field-${field.key}`);
  const label = $derived(field.label || field.key);
  const required = $derived(Boolean(field.required));
</script>

<div class="form-group scouting-field">
  {#if field.type === 'stars'}
    <RatingInput {id} {label} {value} {required} {onChange} />
  {:else}
    <label class="form-label" for={id}>
      {label}{#if required}
        <span class="required-marker" aria-label="required">*</span>{/if}
    </label>
    {#if field.type === 'textarea'}
      <textarea
        {id}
        class="form-textarea"
        placeholder={field.placeholder || ''}
        {required}
        value={value ?? ''}
        oninput={(event) => onChange(event.currentTarget.value)}></textarea>
    {:else if field.type === 'number'}
      <input
        {id}
        class="form-input"
        type="number"
        placeholder={field.placeholder || '0'}
        {required}
        value={value ?? ''}
        oninput={(event) =>
          onChange(event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber)}
      />
    {:else if field.type === 'select'}
      <select
        {id}
        class="form-select"
        {required}
        value={value ?? ''}
        onchange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Select an option</option>
        {#each field.options || [] as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
    {:else}
      <input
        {id}
        class="form-input"
        placeholder={field.placeholder || ''}
        {required}
        value={value ?? ''}
        oninput={(event) => onChange(event.currentTarget.value)}
      />
    {/if}
  {/if}
</div>
