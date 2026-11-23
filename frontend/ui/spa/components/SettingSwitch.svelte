<script>
  import { Switch } from 'bits-ui';
  import Icon from './Icon.svelte';

  let {
    id,
    label,
    description = '',
    icon = '',
    checked = false,
    disabled = false,
    onChange = () => {},
  } = $props();
</script>

<div class="setting-switch-row" class:disabled>
  {#if icon}<Icon name={icon} size={18} />{/if}
  <div class="setting-switch-text">
    <label class="setting-switch-label" for={id}>{label}</label>
    {#if description}<span class="setting-switch-description">{description}</span>{/if}
  </div>
  <Switch.Root
    {id}
    {checked}
    {disabled}
    onCheckedChange={(value) => onChange(value)}
    class="setting-switch"
    aria-label={label}
  >
    <Switch.Thumb class="setting-switch-thumb" />
  </Switch.Root>
</div>
