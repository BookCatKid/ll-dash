<script>
  import { api } from '../lib/api.js';
  import { initialTheme } from '../lib/theme.js';
  let { onFinished } = $props();
  let step = $state(1);
  let username = $state('');
  let key = $state('');
  let team = $state('');
  let season = $state(2026);
  let maxSeason = $state(2026);
  let eventCode = $state('');
  let pin = $state('');
  let dashboardName = $state('LL Dash');
  let theme = $state({ ...initialTheme });
  let error = $state('');
  let busy = $state(false);

  async function validate() {
    if (!username.trim() || !key.trim()) {
      error = 'Enter username and key';
      return;
    }
    busy = true;
    error = '';
    try {
      const result = await api.setupValidate({ username: username.trim(), key: key.trim() });
      if (!result.valid) throw new Error(result.error || 'Invalid credentials');
      season = Number(result.currentSeason) || 2026;
      maxSeason = Number(result.maxSeason) || season;
      step = 2;
    } catch (e) {
      error = e.message;
    } finally {
      busy = false;
    }
  }
  function next() {
    if (!/^\d+$/.test(team)) {
      error = 'Enter a numeric team number';
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      error = 'PIN must contain four digits';
      return;
    }
    error = '';
    step = 3;
  }
  async function finish() {
    busy = true;
    error = '';
    try {
      await api.completeSetup({
        ftc_api_username: username,
        ftc_api_key: key,
        team_number: team,
        team_pin: pin,
        active_season: season,
        active_event_code: eventCode,
        dashboard_name: dashboardName.trim() || 'LL Dash',
        theme_accent: theme.accent,
        theme_accent2: theme.accent2,
        theme_bg: theme.bg,
      });
      onFinished();
    } catch (e) {
      error = e.message;
      busy = false;
    }
  }
</script>

<div class="setup-overlay">
  <div class="setup-card">
    <div class="setup-progress">
      <div class="setup-progress-fill" style:width="{(step / 3) * 100}%"></div>
    </div>
    {#if step === 1}
      <h1 class="setup-title">FTC Events API</h1>
      <div class="form-group">
        <label class="form-label" for="su-user">API username</label><input
          class="form-input"
          id="su-user"
          bind:value={username}
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="su-key">API key</label><input
          class="form-input"
          id="su-key"
          type="password"
          bind:value={key}
        />
      </div>
      <button class="btn btn-primary btn-block" disabled={busy} onclick={validate}>
        {busy ? 'Checking' : 'Validate and continue'}
      </button>
    {:else if step === 2}
      <h1 class="setup-title">Team</h1>
      <div class="form-row">
        <label class="form-group">
          Team number<input id="su-team" class="form-input" inputmode="numeric" bind:value={team} />
        </label>
        <label class="form-group">
          Season<select class="form-select" bind:value={season}>
            {#each Array.from({ length: Math.max(1, maxSeason - 2018) }, (_, i) => maxSeason - i) as option}<option
                value={option}
              >
                {option}–{String(option + 1).slice(-2)}
              </option>{/each}
          </select>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label" for="su-event">Event code</label><input
          id="su-event"
          class="form-input"
          bind:value={eventCode}
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="su-pin">4-digit PIN</label><input
          id="su-pin"
          class="form-input"
          inputmode="numeric"
          maxlength="4"
          bind:value={pin}
        />
      </div>
      <div style="display:flex;gap:.5rem">
        <button
          class="btn btn-secondary"
          onclick={() => {
            step = 1;
            error = '';
          }}
        >
          Back
        </button><button class="btn btn-primary" onclick={next}>Continue</button>
      </div>
    {:else}
      <h1 class="setup-title">Appearance</h1>
      <div class="form-group">
        <label class="form-label" for="su-name">Dashboard name</label><input
          class="form-input"
          id="su-name"
          bind:value={dashboardName}
        />
      </div>
      <div class="form-group">
        <span class="form-label">Colors</span>
        <label class="color-row"><input type="color" bind:value={theme.accent} />Accent</label>
        <label class="color-row"><input type="color" bind:value={theme.accent2} />Secondary</label>
        <label class="color-row"><input type="color" bind:value={theme.bg} />Background</label>
      </div>
      <div style="display:flex;gap:.5rem">
        <button
          class="btn btn-secondary"
          onclick={() => {
            step = 2;
            error = '';
          }}
        >
          Back
        </button><button class="btn btn-primary" disabled={busy} onclick={finish}>
          {busy ? 'Saving' : 'Finish'}
        </button>
      </div>
    {/if}
    {#if error}<div class="setup-error" role="alert">{error}</div>{/if}
  </div>
</div>
