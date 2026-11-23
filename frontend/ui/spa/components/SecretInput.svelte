<script>
  /** @type {'off' | 'on' | 'new-password' | 'current-password'} */
  let defaultAutocomplete = 'off';
  /** @type {'text' | 'numeric'} */
  let defaultInputmode = 'text';

  let {
    id,
    label,
    value = '',
    onChange,
    autocomplete = defaultAutocomplete,
    inputmode = defaultInputmode,
    maxlength = undefined,
    placeholder = '',
    inputClass = 'form-input',
    labelClass = 'form-label',
    normalize = (input) => input,
  } = $props();

  let visible = $state(false);
</script>

<div class="form-group">
  <label class={labelClass} for={id}>{label}</label>
  <div class="secret-input-wrap">
    <input
      {id}
      class={inputClass}
      type={visible ? 'text' : 'password'}
      {autocomplete}
      {inputmode}
      {placeholder}
      {value}
      oninput={(event) => {
        let next = normalize(event.currentTarget.value);
        if (maxlength != null) next = next.slice(0, maxlength);
        if (next !== event.currentTarget.value) event.currentTarget.value = next;
        onChange(next);
      }}
    />
    <button
      type="button"
      class="secret-input-toggle"
      aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={visible}
      onclick={() => (visible = !visible)}
    >
      {visible ? 'Hide' : 'Show'}
    </button>
  </div>
</div>
