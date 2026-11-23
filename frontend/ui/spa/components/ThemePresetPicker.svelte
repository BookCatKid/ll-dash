<script>
  import { themePresets } from '../lib/theme.js';

  let { accent, accent2, bg, onSelect } = $props();
</script>

<div class="theme-preset-grid" role="group" aria-label="Theme presets">
  {#each themePresets as preset (preset.name)}
    <button
      type="button"
      class="theme-preset-option"
      class:selected={preset.accent === accent && preset.accent2 === accent2 && preset.bg === bg}
      aria-label={`${preset.name} theme`}
      aria-pressed={preset.accent === accent && preset.accent2 === accent2 && preset.bg === bg}
      onclick={() => onSelect(preset)}
    >
      <span class="theme-preset-preview" style:background={preset.bg}>
        <span style:background={preset.accent}></span>
        <span style:background={preset.accent2}></span>
        <span class="theme-preset-preview-line" style:background={preset.accent}></span>
      </span>
      <span class="theme-preset-label">{preset.name}</span>
    </button>
  {/each}
</div>
