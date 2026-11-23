<script>
  import { api } from '../lib/api.js';
  import { initialTheme, isLightBackground } from '../lib/theme.js';
  import BrandMark from './BrandMark.svelte';
  import EventPicker from './EventPicker.svelte';
  import Icon from './Icon.svelte';
  import SecretInput from './SecretInput.svelte';
  import ThemePresetPicker from './ThemePresetPicker.svelte';

  let { onFinished } = $props();

  const steps = [
    { label: 'FTC Events API', short: 'Connect', description: 'Official event data' },
    { label: 'Team and event', short: 'Team', description: 'Your tournament' },
    { label: 'Appearance', short: 'Customize', description: 'Your dashboard' },
  ];

  let step = $state(1);
  let username = $state('');
  let key = $state('');
  let team = $state('');
  let season = $state(2026);
  let maxSeason = $state(2026);
  let event = $state(null);
  let pin = $state('');
  let dashboardName = $state('LL Dash');
  let theme = $state({ ...initialTheme });
  let error = $state('');
  let busy = $state(false);
  let overlay = $state(null);

  $effect(() => {
    void step;
    if (overlay) overlay.scrollTop = 0;
  });

  const seasons = $derived(
    Array.from({ length: Math.max(1, maxSeason - 2017) }, (_, i) => maxSeason - i),
  );

  function goBack() {
    if (busy || step <= 1) return;
    error = '';
    step -= 1;
  }

  async function validate() {
    if (busy) return;
    if (!username.trim() || !key.trim()) {
      error = 'Enter your FTC Events API username and key.';
      return;
    }

    busy = true;
    error = '';
    try {
      const result = await api.setupValidate({ username: username.trim(), key: key.trim() });
      if (!result.valid)
        throw new Error(result.error || 'Those credentials could not be verified.');
      const currentSeason = Number(result.currentSeason) || 2026;
      const latestSeason = Number(result.maxSeason) || currentSeason;
      season = currentSeason;
      maxSeason = Math.max(currentSeason, latestSeason);
      event = null;
      step = 2;
    } catch (reason) {
      error = reason.message || 'Could not verify credentials.';
    } finally {
      busy = false;
    }
  }

  function next() {
    if (busy) return;
    if (!/^\d+$/.test(team.trim())) {
      error = 'Enter a valid numeric team number.';
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      error = 'Choose a four-digit PIN.';
      return;
    }
    error = '';
    step = 3;
  }

  async function finish() {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await api.completeSetup({
        ftc_api_username: username.trim(),
        ftc_api_key: key.trim(),
        team_number: team.trim(),
        team_pin: pin,
        active_season: season,
        active_event_code: event?.code || '',
        active_event_name: event?.name || '',
        dashboard_name: dashboardName.trim() || 'LL Dash',
        theme_accent: theme.accent,
        theme_accent2: theme.accent2,
        theme_bg: theme.bg,
        theme_mode: isLightBackground(theme.bg) ? 'light' : 'dark',
      });
      onFinished();
    } catch (reason) {
      error = reason.message || 'Could not complete setup.';
      busy = false;
    }
  }
</script>

<div class="setup-overlay" bind:this={overlay}>
  <div class="setup-shell">
    <aside class="setup-side" aria-label="Setup progress">
      <BrandMark />
      <div class="setup-side-intro">
        <h2>Set up your dashboard</h2>
        <p>Connect your team to official match data, then make the dashboard yours.</p>
      </div>
      <ol class="setup-step-list">
        {#each steps as item, index}
          <li
            class="setup-step"
            class:current={step === index + 1}
            class:complete={step > index + 1}
            aria-current={step === index + 1 ? 'step' : undefined}
          >
            <span class="setup-step-index" aria-hidden="true">
              {step > index + 1 ? '✓' : index + 1}
            </span>
            <span class="setup-step-text">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </li>
        {/each}
      </ol>
      <div class="setup-side-footer">LL Dash · FIRST Tech Challenge</div>
    </aside>

    <main class="setup-panel">
      <div class="setup-progress-header">
        <span>Step {step} of {steps.length}</span>
        <span>{steps[step - 1].short}</span>
      </div>
      <div
        class="setup-progress"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin="0"
        aria-valuemax={steps.length}
        aria-valuenow={step}
      >
        <span class="setup-progress-fill" style:width={`${(step / steps.length) * 100}%`}></span>
      </div>

      {#key step}
        <section class="setup-step-content" aria-label={steps[step - 1].label}>
          {#if step === 1}
            <div class="setup-content-heading">
              <h1 class="setup-title">Connect FTC Events</h1>
              <p>
                Use your FIRST FTC Events API credentials to load official schedules, scores, and
                rankings.
              </p>
            </div>
            <form
              novalidate
              onsubmit={(event) => {
                event.preventDefault();
                void validate();
              }}
            >
              <div class="form-group">
                <label class="form-label" for="su-user">API username</label>
                <input
                  id="su-user"
                  class="form-input"
                  autocomplete="username"
                  value={username}
                  oninput={(event) => {
                    username = event.currentTarget.value;
                    error = '';
                  }}
                  placeholder="Your FTC Events API username"
                />
              </div>
              <SecretInput
                id="su-key"
                label="API key"
                value={key}
                onChange={(value) => {
                  key = value;
                  error = '';
                }}
              />
              <div class="setup-context-link">
                Need API access?
                <a
                  href="https://ftc-events.firstinspires.org/services/API/register"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Register with FIRST <Icon name="arrow-right" size={14} />
                </a>
              </div>
              {#if error}<p class="setup-error" role="alert">{error}</p>{/if}
              <div class="setup-actions">
                <button type="submit" class="btn btn-primary setup-next" disabled={busy}>
                  {busy ? 'Verifying credentials…' : 'Verify and continue'}
                  {#if !busy}<Icon name="arrow-right" size={18} />{/if}
                </button>
              </div>
            </form>
          {:else if step === 2}
            <div class="setup-content-heading">
              <h1 class="setup-title">Choose your team</h1>
              <p>Set your team number and event. You can change the event later in Settings.</p>
            </div>
            <form
              novalidate
              onsubmit={(event) => {
                event.preventDefault();
                next();
              }}
            >
              <div class="form-row setup-team-fields">
                <div class="form-group">
                  <label class="form-label" for="su-team">Team number</label>
                  <input
                    id="su-team"
                    class="form-input"
                    inputmode="numeric"
                    autocomplete="off"
                    value={team}
                    oninput={(event) => {
                      team = event.currentTarget.value.replace(/\D/g, '');
                      error = '';
                    }}
                    placeholder="e.g. 3650"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="su-season">Season</label>
                  <select
                    id="su-season"
                    class="form-select"
                    value={season}
                    onchange={(change) => {
                      season = Number(change.currentTarget.value);
                      event = null;
                    }}
                  >
                    {#each seasons as option (option)}
                      <option value={option}>{option}–{String(option + 1).slice(-2)}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <div class="form-group setup-event-field">
                <label class="form-label" for="su-event">
                  Event <span class="setup-optional">Optional</span>
                </label>
                <EventPicker
                  {season}
                  inputClass="form-input"
                  id="su-event"
                  onSelect={(selected) => {
                    event = { code: selected.code, name: selected.name };
                    error = '';
                  }}
                />
                {#if event}
                  <div class="event-picked" role="status">
                    <span>{event.name} · {event.code}</span>
                    <button
                      type="button"
                      class="event-picked-clear"
                      onclick={() => (event = null)}
                      aria-label="Clear event"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                {/if}
              </div>
              <SecretInput
                id="su-pin"
                label="Dashboard PIN"
                value={pin}
                inputmode="numeric"
                maxlength={4}
                autocomplete="new-password"
                normalize={(value) => value.replace(/\D/g, '').slice(0, 4)}
                onChange={(value) => {
                  pin = value;
                  error = '';
                }}
              />
              <p class="setup-help">This four-digit PIN controls access to your dashboard.</p>
              {#if error}<p class="setup-error" role="alert">{error}</p>{/if}
              <div class="setup-actions">
                <button type="button" class="btn btn-secondary" onclick={goBack}>Back</button>
                <button type="submit" class="btn btn-primary setup-next">
                  Continue <Icon name="arrow-right" size={18} />
                </button>
              </div>
            </form>
          {:else}
            <div class="setup-content-heading">
              <h1 class="setup-title">Make it yours</h1>
              <p>Choose a name and colors for your dashboard. You can adjust these later.</p>
            </div>
            <form
              novalidate
              onsubmit={(event) => {
                event.preventDefault();
                void finish();
              }}
            >
              <div class="form-group">
                <label class="form-label" for="su-name">Dashboard name</label>
                <input
                  id="su-name"
                  class="form-input"
                  maxlength="48"
                  value={dashboardName}
                  oninput={(event) => {
                    dashboardName = event.currentTarget.value;
                    error = '';
                  }}
                />
              </div>
              <div class="form-group">
                <div class="setup-section-heading"><span class="form-label">Theme</span></div>
                <ThemePresetPicker
                  accent={theme.accent}
                  accent2={theme.accent2}
                  bg={theme.bg}
                  onSelect={(preset) =>
                    (theme = { accent: preset.accent, accent2: preset.accent2, bg: preset.bg })}
                />
              </div>
              <div class="setup-colors">
                {#each [{ key: 'accent', label: 'Accent' }, { key: 'accent2', label: 'Secondary' }, { key: 'bg', label: 'Background' }] as color (color.key)}
                  <label class="setup-color-item">
                    <span>{color.label}</span>
                    <input
                      type="color"
                      aria-label={`${color.label} color`}
                      bind:value={theme[color.key]}
                    />
                    <span class="setup-color-value">{theme[color.key].toUpperCase()}</span>
                  </label>
                {/each}
              </div>
              <div
                class="setup-theme-preview"
                class:light-preview={isLightBackground(theme.bg)}
                style:--preview-bg={theme.bg}
                style:--preview-accent={theme.accent}
                style:--preview-accent2={theme.accent2}
              >
                <div class="setup-theme-preview-header">
                  <strong>{dashboardName.trim() || 'LL Dash'}</strong>
                  <span>Team {team}</span>
                </div>
                <div class="setup-theme-preview-tabs">
                  <span class="selected"><Icon name="layout-dashboard" size={15} /> Dashboard</span>
                  <span><Icon name="calendar-days" size={15} /> Schedule</span>
                  <span><Icon name="chart-no-axes-column" size={15} /> Rankings</span>
                </div>
                <div class="setup-theme-preview-event">
                  {event?.name || 'Add an event whenever you’re ready'}
                </div>
              </div>
              {#if error}<p class="setup-error" role="alert">{error}</p>{/if}
              <div class="setup-actions">
                <button type="button" class="btn btn-secondary" disabled={busy} onclick={goBack}>
                  Back
                </button>
                <button type="submit" class="btn btn-primary setup-next" disabled={busy}>
                  {busy ? 'Finishing setup…' : 'Finish setup'}
                  {#if !busy}<Icon name="arrow-right" size={18} />{/if}
                </button>
              </div>
            </form>
          {/if}
        </section>
      {/key}
    </main>
  </div>
</div>
