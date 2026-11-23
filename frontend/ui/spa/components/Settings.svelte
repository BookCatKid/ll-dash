<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import Icon from './Icon.svelte';
  import { api } from '../lib/api.js';
  import { applyAppearance, initialTheme, themePresets } from '../lib/theme.js';
  import { pages } from '../lib/nav.js';

  let { settings, onSaved, onClose, notify } = $props();
  const copy = (value) => JSON.parse(JSON.stringify(value));
  let activeTab = writable('event');
  let tab = $state('event');
  let navigationScope = $state('shared');
  let eventSeason = $state(2026);
  let seasons = $state([]);
  let eventSearch = $state('');
  let events = $state([]);
  let eventError = $state('');
  let eventLoading = $state(false);
  let name = $state('LL Dash');
  let theme = $state({ ...initialTheme });
  let mode = $state('dark');
  let density = $state('normal');
  let nav = $state([]);
  let bigscreen = $state({
    panels: { schedule: true, rankings: true, playoffs: true },
    cycle_seconds: 15,
    refresh_seconds: 45,
  });
  let highlightAwards = $state(true);
  let advancedPredictions = $state(true);
  let deviceHidden = $state([]);
  let scoutingFields = $state([]);
  let flagCategories = $state([]);
  let teamNumber = $state('');
  let teamPin = $state('');
  let username = $state('');
  let apiKey = $state('');
  let status = $state('');
  let saving = $state(false);
  let searchCounter = 0;
  let searchTimer;

  const tabs = [
    { key: 'event', label: 'Event' },
    { key: 'display', label: 'Display' },
    { key: 'scouting', label: 'Scout fields' },
    { key: 'flags', label: 'Flags' },
    { key: 'pages', label: 'Pages' },
    { key: 'data', label: 'Data' },
    { key: 'advanced', label: 'Team & API' },
  ];
  const fieldTypes = ['text', 'textarea', 'number', 'select', 'stars'];

  onMount(() => {
    eventSeason = Number(settings.active_season) || 2026;
    seasons = [eventSeason];
    name = settings.dashboard_name || 'LL Dash';
    theme = { ...initialTheme, ...(settings.theme || {}) };
    mode = settings.theme_mode || 'dark';
    density = settings.density || 'normal';
    nav = copy(settings.nav || Object.keys(pages).map((key) => ({ key, visible: true })));
    bigscreen = copy(settings.bigscreen || bigscreen);
    highlightAwards = settings.awards_highlight_ours !== false;
    advancedPredictions = settings.advanced_predictions !== false;
    teamNumber = String(settings.team_number || '');
    username = settings.ftc_api_username || '';
    let active = true;
    try {
      deviceHidden = JSON.parse(localStorage.getItem('device_hidden_tabs') || '[]');
    } catch {
      deviceHidden = [];
    }
    Promise.all([
      api.seasons().catch(() => null),
      api.scoutingFields().catch(() => []),
      api.flagCategories().catch(() => []),
    ]).then(([result, fields, flags]) => {
      if (!active) return;
      seasons = result?.seasons?.length ? result.seasons : [eventSeason];
      scoutingFields = copy(fields || []);
      flagCategories = copy(flags || []);
    });
    return () => {
      active = false;
      clearTimeout(searchTimer);
    };
  });

  function selectTab(key) {
    tab = key;
    activeTab.set(key);
    status = '';
  }
  function preview() {
    applyAppearance({ theme, theme_mode: mode, density, dashboard_name: name });
  }
  function choosePreset(preset) {
    theme = { accent: preset.accent, accent2: preset.accent2, bg: preset.bg };
    mode = preset.mode;
    preview();
  }
  function restoreAppearance() {
    applyAppearance(settings);
  }

  async function save(payload, update = {}) {
    if (saving) return false;
    saving = true;
    try {
      await api.saveSettings(payload);
      const next = { ...settings, ...update };
      onSaved(next);
      notify('Saved');
      return true;
    } catch (error) {
      notify(error.message || 'Save failed');
      return false;
    } finally {
      saving = false;
    }
  }

  function searchEvents() {
    clearTimeout(searchTimer);
    const query = eventSearch.trim();
    const requestId = ++searchCounter;
    if (query.length < 2) {
      events = [];
      eventLoading = false;
      return;
    }
    searchTimer = setTimeout(async () => {
      eventLoading = true;
      eventError = '';
      try {
        const result = await api.events(eventSeason);
        if (requestId !== searchCounter) return;
        const search = query.toLowerCase();
        events = (result.events || [])
          .filter((event) =>
            [event.name, event.code, event.city, event.stateprov].some((value) =>
              String(value || '')
                .toLowerCase()
                .includes(search),
            ),
          )
          .slice(0, 12);
      } catch (error) {
        if (requestId === searchCounter) eventError = error.message;
      } finally {
        if (requestId === searchCounter) eventLoading = false;
      }
    }, 280);
  }

  async function selectEvent(event) {
    const saved = await save(
      { active_event_code: event.code, active_event_name: event.name, active_season: eventSeason },
      { active_event_code: event.code, active_event_name: event.name, active_season: eventSeason },
    );
    if (saved) {
      eventSearch = '';
      events = [];
      onClose();
    }
  }

  function move(list, index, offset) {
    const target = index + offset;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
  }

  async function saveDisplay() {
    await save(
      {
        dashboard_name: name,
        theme_accent: theme.accent,
        theme_accent2: theme.accent2,
        theme_bg: theme.bg,
        theme_mode: mode,
        density,
      },
      { dashboard_name: name, theme: { ...theme }, theme_mode: mode, density },
    );
  }

  async function savePages() {
    if (!Object.values(bigscreen.panels).some(Boolean)) {
      notify('Enable a display panel');
      return;
    }
    const config = copy(nav);
    const bs = copy(bigscreen);
    await save(
      {
        nav_config: config,
        bigscreen_config: bs,
        awards_highlight_ours: highlightAwards,
        advanced_predictions: advancedPredictions,
      },
      {
        nav: config,
        bigscreen: bs,
        awards_highlight_ours: highlightAwards,
        advanced_predictions: advancedPredictions,
      },
    );
  }

  function setDeviceVisibility(key, checked) {
    deviceHidden = checked ? deviceHidden.filter((item) => item !== key) : [...deviceHidden, key];
    localStorage.setItem('device_hidden_tabs', JSON.stringify(deviceHidden));
    onSaved({ ...settings });
  }

  async function saveFields() {
    try {
      scoutingFields = await api.saveScoutingFields(scoutingFields);
      notify('Saved');
    } catch (error) {
      notify(error.message || 'Save failed');
    }
  }

  async function saveFlags() {
    try {
      flagCategories = await api.saveFlagCategories(flagCategories);
      notify('Saved');
    } catch (error) {
      notify(error.message || 'Save failed');
    }
  }

  async function saveCredentials() {
    const payload = {};
    if (teamNumber.trim()) payload.team_number = teamNumber.trim();
    if (teamPin.trim()) payload.team_pin = teamPin.trim();
    if (username.trim()) payload.ftc_api_username = username.trim();
    if (apiKey.trim()) payload.ftc_api_key = apiKey.trim();
    await save(payload, {
      team_number: Number(teamNumber),
      ftc_api_username: username,
      has_credentials: true,
    });
    teamPin = '';
    apiKey = '';
  }

  async function testCredentials() {
    status = 'Checking';
    if (!username.trim() || !apiKey.trim()) {
      status = 'Enter username and key';
      return;
    }
    try {
      const result = await api.setupValidate({ username: username.trim(), key: apiKey.trim() });
      status = result.valid ? 'Credentials valid' : result.error || 'Invalid credentials';
    } catch (error) {
      status = error.message;
    }
  }
</script>

<SegmentedTabs items={tabs} {activeTab} onSelect={selectTab} extraClass="settings-tabs" />
{#if tab === 'event'}
  <div class="setting-group">
    <label class="setting-label" for="event-season">Season</label>
    <select
      class="setting-select"
      id="event-season"
      bind:value={eventSeason}
      onchange={() => {
        eventSearch = '';
        events = [];
      }}
    >
      {#each seasons as season}<option value={season}>
          {season}–{String(Number(season) + 1).slice(-2)}
        </option>{/each}
    </select>
  </div>
  <div class="setting-group">
    <label class="setting-label" for="event-search">Search events</label>
    <input
      class="setting-input"
      id="event-search"
      bind:value={eventSearch}
      oninput={searchEvents}
      placeholder="City, event name, or code"
    />
    {#if eventLoading}<div class="loading">Searching</div>{/if}
    {#if eventError}<div class="svelte-error">{eventError}</div>{/if}
    {#each events as event (event.code)}
      <button
        class="event-result"
        style="display:block;width:100%;text-align:left"
        onclick={() => selectEvent(event)}
      >
        <span class="event-result-name">{event.name}</span>
        <span class="event-result-meta">
          {event.code} · {event.city || ''}{event.stateprov ? ', ' + event.stateprov : ''}
        </span>
      </button>
    {/each}
  </div>
  <div class="setting-group">
    <span class="setting-label">Active event</span>
    <div class="active-event-display">
      {settings.active_event_name || 'None'}{settings.active_event_code
        ? ` (${settings.active_event_code})`
        : ''}
    </div>
  </div>
{:else if tab === 'display'}
  <div class="setting-group">
    <label class="setting-label" for="brand-name">Dashboard name</label><input
      class="setting-input"
      id="brand-name"
      bind:value={name}
      oninput={preview}
    />
  </div>
  <div class="setting-group">
    <span class="setting-label">Theme</span>
    <div class="preset-row">
      {#each themePresets as preset (preset.name)}
        <button
          class="preset-chip"
          title={preset.name}
          style:background={preset.bg}
          style:border-color={preset.accent}
          onclick={() => choosePreset(preset)}
        >
          <span class="preset-dot" style:background={preset.accent}></span><span
            class="preset-dot"
            style:background={preset.accent2}
          ></span>
          <span class="preset-name" style:color={preset.mode === 'light' ? '#222' : '#eee'}>
            {preset.name}
          </span>
        </button>
      {/each}
    </div>
  </div>
  <div class="setting-group">
    <span class="setting-label">Colors</span>
    <label class="color-row">
      <input type="color" bind:value={theme.accent} oninput={preview} /><span>Accent</span>
    </label>
    <label class="color-row">
      <input type="color" bind:value={theme.accent2} oninput={preview} /><span>Secondary</span>
    </label>
    <label class="color-row">
      <input type="color" bind:value={theme.bg} oninput={preview} /><span>Background</span>
    </label>
  </div>
  <div class="setting-group">
    <span class="setting-label">Mode and density</span>
    <div class="seg-toggle">
      <button
        class:on={mode === 'dark'}
        onclick={() => {
          mode = 'dark';
          if (theme.bg === '#f4f5f8') theme.bg = initialTheme.bg;
          preview();
        }}
      >
        Dark
      </button><button
        class:on={mode === 'light'}
        onclick={() => {
          mode = 'light';
          if (theme.bg === initialTheme.bg) theme.bg = '#f4f5f8';
          preview();
        }}
      >
        Light
      </button>
    </div>
    <div class="seg-toggle" style="margin-top:.5rem">
      <button
        class:on={density === 'normal'}
        onclick={() => {
          density = 'normal';
          preview();
        }}
      >
        Normal
      </button><button
        class:on={density === 'compact'}
        onclick={() => {
          density = 'compact';
          preview();
        }}
      >
        Compact
      </button>
    </div>
  </div>
  <div style="display:flex;gap:.5rem">
    <button class="btn btn-primary" disabled={saving} onclick={saveDisplay}>Save</button><button
      class="btn btn-secondary"
      onclick={() => {
        theme = { ...initialTheme };
        mode = 'dark';
        density = 'normal';
        preview();
      }}
    >
      Reset
    </button>
  </div>
{:else if tab === 'pages'}
  <div class="setting-group">
    <span class="setting-label">Navigation</span>
    <div class="seg-toggle" style="margin-bottom:.75rem">
      <button class:on={navigationScope === 'shared'} onclick={() => (navigationScope = 'shared')}>
        All devices
      </button>
      <button class:on={navigationScope === 'device'} onclick={() => (navigationScope = 'device')}>
        This device
      </button>
    </div>
    {#if navigationScope === 'shared'}
      {#each nav as item, index (item.key)}
        <div class="cfg-row">
          <div class="cfg-row-main" style="align-items:center;gap:.45rem">
            <label class="sf-req-label" style="margin:0">
              <input
                type="checkbox"
                bind:checked={item.visible}
                disabled={item.key === 'dashboard'}
                aria-label={`Show ${pages[item.key]?.label || item.key}`}
              />
            </label>
            <span style="flex:1">{pages[item.key]?.label || item.key}</span>
            <button
              class="icon-btn cfg-mini"
              aria-label="Move up"
              disabled={index === 0}
              onclick={() => move(nav, index, -1)}
            >
              <Icon name="arrow-up" size={17} />
            </button>
            <button
              class="icon-btn cfg-mini"
              aria-label="Move down"
              disabled={index === nav.length - 1}
              onclick={() => move(nav, index, 1)}
            >
              <Icon name="arrow-down" size={17} />
            </button>
          </div>
        </div>
      {/each}
    {:else}
      {#each nav.filter((item) => item.visible && item.key !== 'dashboard') as item (item.key)}
        <label class="sf-req-label">
          <input
            type="checkbox"
            checked={!deviceHidden.includes(item.key)}
            onchange={(event) => setDeviceVisibility(item.key, event.currentTarget.checked)}
          />{pages[item.key]?.label || item.key}
        </label>
      {/each}
    {/if}
  </div>
  <div class="setting-group">
    <span class="setting-label">Display panels</span>
    {#each ['schedule', 'rankings', 'playoffs'] as panel}
      <label class="sf-req-label">
        <input type="checkbox" bind:checked={bigscreen.panels[panel]} />{pages[panel].label}
      </label>
    {/each}
    <div class="form-row">
      <label class="form-group">
        Cycle (seconds)<input
          class="setting-input"
          type="number"
          min="5"
          max="300"
          bind:value={bigscreen.cycle_seconds}
        />
      </label>
      <label class="form-group">
        Refresh (seconds)<input
          class="setting-input"
          type="number"
          min="10"
          max="600"
          bind:value={bigscreen.refresh_seconds}
        />
      </label>
    </div>
  </div>
  <div class="setting-group">
    <label class="sf-req-label">
      <input type="checkbox" bind:checked={advancedPredictions} />Advanced predictions
    </label><label class="sf-req-label">
      <input type="checkbox" bind:checked={highlightAwards} />Highlight our awards
    </label>
  </div>
  <button class="btn btn-primary btn-block" disabled={saving} onclick={savePages}>Save</button>
{:else if tab === 'scouting'}
  {#each scoutingFields as field, index (index)}
    <div class="cfg-row">
      <div class="cfg-row-main">
        <input class="setting-input" aria-label="Field label" bind:value={field.label} />
        <select class="setting-select" aria-label="Field type" bind:value={field.type}>
          {#each fieldTypes as type}<option value={type}>{type}</option>{/each}
        </select>
      </div>
      {#if field.type === 'select'}<input
          class="setting-input"
          placeholder="Options separated by commas"
          value={(field.options || []).join(', ')}
          onchange={(event) =>
            (field.options = event.currentTarget.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean))}
        />{/if}
      <div style="display:flex;align-items:center;gap:.5rem;margin-top:.35rem">
        <label class="sf-req-label">
          <input type="checkbox" bind:checked={field.required} />Required
        </label><span style="flex:1"></span>
        <button
          class="icon-btn cfg-mini"
          aria-label="Move up"
          disabled={index === 0}
          onclick={() => move(scoutingFields, index, -1)}
        >
          <Icon name="arrow-up" size={17} />
        </button>
        <button
          class="icon-btn cfg-mini"
          aria-label="Move down"
          disabled={index === scoutingFields.length - 1}
          onclick={() => move(scoutingFields, index, 1)}
        >
          <Icon name="arrow-down" size={17} />
        </button>
        <button
          class="icon-btn cfg-mini"
          aria-label="Remove field"
          onclick={() => scoutingFields.splice(index, 1)}
        >
          <Icon name="trash-2" size={17} />
        </button>
      </div>
    </div>
  {/each}
  <div style="display:flex;gap:.5rem">
    <button
      class="btn btn-secondary"
      onclick={() => scoutingFields.push({ label: '', type: 'text', required: false })}
    >
      Add field
    </button><button class="btn btn-primary" onclick={saveFields}>Save</button>
  </div>
{:else if tab === 'flags'}
  {#each flagCategories as category, index (index)}
    <div class="cfg-row">
      <div class="cfg-row-main">
        <input class="setting-input" aria-label="Category name" bind:value={category.label} /><input
          type="color"
          aria-label="Category color"
          bind:value={category.color}
        />
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;align-items:center">
        <label>
          Icon <input class="setting-input" style="width:100px" bind:value={category.icon} />
        </label><span style="flex:1"></span>
        <button
          class="icon-btn cfg-mini"
          aria-label="Move up"
          disabled={index === 0}
          onclick={() => move(flagCategories, index, -1)}
        >
          <Icon name="arrow-up" size={17} />
        </button>
        <button
          class="icon-btn cfg-mini"
          aria-label="Move down"
          disabled={index === flagCategories.length - 1}
          onclick={() => move(flagCategories, index, 1)}
        >
          <Icon name="arrow-down" size={17} />
        </button>
        <button
          class="icon-btn cfg-mini"
          aria-label="Remove category"
          onclick={() => flagCategories.splice(index, 1)}
        >
          <Icon name="trash-2" size={17} />
        </button>
      </div>
    </div>
  {/each}
  <div style="display:flex;gap:.5rem">
    <button
      class="btn btn-secondary"
      onclick={() => flagCategories.push({ label: '', color: '#b6ade9', icon: '' })}
    >
      Add category
    </button><button class="btn btn-primary" onclick={saveFlags}>Save</button>
  </div>
{:else if tab === 'data'}
  <div class="setting-group">
    <span class="setting-label">Scouting notes</span>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap">
      <a
        class="btn btn-secondary btn-sm"
        href="/api/export/scouting?format=csv"
        target="_blank"
        rel="noopener"
      >
        CSV
      </a>
      <a
        class="btn btn-secondary btn-sm"
        href="/api/export/scouting?format=json"
        target="_blank"
        rel="noopener"
      >
        JSON
      </a>
      <a
        class="btn btn-secondary btn-sm"
        href="/api/export/scouting?format=csv&all=1"
        target="_blank"
        rel="noopener"
      >
        All events CSV
      </a>
    </div>
  </div>
  <div class="setting-group">
    <span class="setting-label">Alliance flags</span>
    <div style="display:flex;gap:.4rem">
      <a
        class="btn btn-secondary btn-sm"
        href="/api/export/flags?format=csv"
        target="_blank"
        rel="noopener"
      >
        CSV
      </a>
      <a
        class="btn btn-secondary btn-sm"
        href="/api/export/flags?format=json"
        target="_blank"
        rel="noopener"
      >
        JSON
      </a>
    </div>
  </div>
  <div class="setting-group">
    <span class="setting-label">Hub</span><a
      class="btn btn-secondary btn-sm"
      href="/api/export/hub"
      target="_blank"
      rel="noopener"
    >
      JSON
    </a>
  </div>
{:else if tab === 'advanced'}
  <div class="setting-group">
    <label class="setting-label" for="team-number">Team number</label><input
      class="setting-input"
      id="team-number"
      bind:value={teamNumber}
      inputmode="numeric"
    />
  </div>
  <div class="setting-group">
    <label class="setting-label" for="team-pin">Change PIN</label><input
      class="setting-input"
      id="team-pin"
      bind:value={teamPin}
      inputmode="numeric"
      maxlength="4"
      placeholder="4 digits"
    />
  </div>
  <div class="setting-group">
    <label class="setting-label" for="api-username">FTC Events API username</label><input
      class="setting-input"
      id="api-username"
      bind:value={username}
    />
  </div>
  <div class="setting-group">
    <label class="setting-label" for="api-key">FTC Events API key</label><input
      class="setting-input"
      id="api-key"
      type="password"
      bind:value={apiKey}
      placeholder={settings.has_credentials ? 'Saved' : 'API key'}
    />
  </div>
  {#if status}<div class="setting-hint">{status}</div>{/if}
  <div style="display:flex;gap:.5rem">
    <button class="btn btn-secondary" onclick={testCredentials}>Test API</button><button
      class="btn btn-primary"
      disabled={saving}
      onclick={saveCredentials}
    >
      Save
    </button>
  </div>
{/if}
