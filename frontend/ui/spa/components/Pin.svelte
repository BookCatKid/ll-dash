<script>
  import Icon from './Icon.svelte';
  import BrandMark from './BrandMark.svelte';
  import { api } from '../lib/api.js';
  let { settings, onAuthenticated } = $props();
  let digits = $state('');
  let error = $state('');
  let busy = $state(false);

  async function enter() {
    if (digits.length !== 4 || busy) return;
    busy = true;
    try {
      const response = await api.login(digits);
      if (response.success) onAuthenticated();
      else throw new Error('Wrong PIN');
    } catch {
      error = 'Wrong PIN';
      digits = '';
    } finally {
      busy = false;
    }
  }
  function onKey(event) {
    if (/^\d$/.test(event.key)) key(event.key);
    else if (event.key === 'Backspace') key('delete');
    else if (event.key === 'Enter') key('enter');
  }

  function key(value) {
    error = '';
    if (value === 'delete') digits = digits.slice(0, -1);
    else if (value === 'enter') {
      void enter();
      return;
    } else if (digits.length < 4) digits += value;
    if (digits.length === 4) void enter();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="pin-gate">
  <div class="pin-card">
    <BrandMark name={settings.dashboard_name || 'LL Dash'} />
    {#if settings.team_number}<div class="pin-sub">Team {settings.team_number}</div>{/if}
    <div class="pin-dots">
      {#each [0, 1, 2, 3] as i}<span class:filled={i < digits.length}></span>{/each}
    </div>
    <div class="pin-error" aria-live="polite">{error}</div>
    <div class="pin-keypad">
      {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0', 'enter'] as value}
        <button
          class="key"
          type="button"
          disabled={busy}
          aria-label={value === 'delete' ? 'Delete' : value === 'enter' ? 'Enter' : value}
          onclick={() => key(value)}
        >
          {#if value === 'delete'}<Icon name="delete" size={22} />
          {:else if value === 'enter'}<Icon name="arrow-right" size={22} />
          {:else}{value}{/if}
        </button>
      {/each}
    </div>
  </div>
</div>
