<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import BottomNav from '../components/BottomNav.svelte';
  import Toast from '../components/Toast.svelte';
  import Icon from './components/Icon.svelte';
  import Modal from './components/Modal.svelte';
  import Settings from './components/Settings.svelte';
  import Pin from './components/Pin.svelte';
  import Setup from './components/Setup.svelte';
  import MatchDetails from './components/MatchDetails.svelte';
  import TeamProfile from './components/TeamProfile.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Schedule from './pages/Schedule.svelte';
  import Rankings from './pages/Rankings.svelte';
  import Scouting from './pages/Scouting.svelte';
  import Alliance from './pages/Alliance.svelte';
  import Simulator from './pages/Simulator.svelte';
  import Hub from './pages/Hub.svelte';
  import Playoffs from './pages/Playoffs.svelte';
  import Awards from './pages/Awards.svelte';
  import Bigscreen from './pages/Bigscreen.svelte';
  import { api } from './lib/api.js';
  import { applyAppearance } from './lib/theme.js';
  import { visiblePages } from './lib/nav.js';

  let phase = $state('loading');
  /** @type {Record<string, any>} */
  let settings = $state({});
  let current = $state('dashboard');
  let refreshCount = $state(0);
  let settingsOpen = $state(false);
  let selectedTeam = $state(null);
  let selectedMatch = $state(null);
  let scoutTeam = $state(null);
  let bootError = $state('');
  let toasts = writable('');
  let tabItems = writable([]);
  let tabSelection = writable('dashboard');
  let toastTimeout;

  function notify(message) {
    toasts.set(String(message || ''));
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toasts.set(''), 2200);
  }

  async function initialize() {
    bootError = '';
    phase = 'loading';
    try {
      const config = await api.config();
      settings = { ...config };
      applyAppearance(settings);
      if (config.needs_setup) {
        phase = 'setup';
        return;
      }
      const auth = await api.auth();
      if (!auth.authenticated) {
        phase = 'pin';
        return;
      }
      await authenticated();
    } catch (e) {
      bootError = e.message;
      phase = 'error';
    }
  }

  async function authenticated() {
    try {
      settings = await api.settings();
      applyAppearance(settings);
      tabItems.set(visiblePages(settings));
      phase = 'app';
    } catch (e) {
      bootError = e.message;
      phase = 'error';
    }
  }

  onMount(() => {
    void initialize();
    // Retain the installable/offline PWA behavior from the pre-Svelte frontend.
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    return () => clearTimeout(toastTimeout);
  });

  function navigate(page) {
    current = page;
    tabSelection.set(page);
    refreshCount++;
    selectedTeam = null;
    selectedMatch = null;
  }

  function updateSettings(next) {
    settings = { ...next };
    applyAppearance(settings);
    tabItems.set(visiblePages(settings));
    if (!visiblePages(settings).some((item) => item.key === current)) navigate('dashboard');
    refreshCount++;
  }

  async function logout() {
    await api.logout();
    settingsOpen = false;
    selectedTeam = null;
    selectedMatch = null;
    phase = 'pin';
  }

  function openTeam(number) {
    selectedTeam = Number(number);
  }
  function openMatch(match) {
    selectedMatch = match;
  }
  function scoutFor(number) {
    scoutTeam = Number(number);
    navigate('scouting');
    scoutTeam = Number(number);
  }
</script>

{#if phase === 'loading'}
  <div class="loading">Loading</div>
{:else if phase === 'error'}
  <div class="svelte-error" role="alert">{bootError}</div>
  <button class="btn btn-secondary" onclick={initialize}>Retry</button>
{:else if phase === 'pin'}
  <Pin {settings} onAuthenticated={authenticated} />
{:else if phase === 'setup'}
  <Setup onFinished={initialize} />
{:else if phase === 'app'}
  <div class="app svelte-shell" class:display-mode={current === 'bigscreen'}>
    {#if current !== 'bigscreen'}
      <header class="topbar">
        <div class="topbar-left">
          <span class="topbar-logo">{settings.dashboard_name || 'LL Dash'}</span><span
            class="topbar-event"
          >
            {settings.active_event_name || 'No event'}
          </span>
        </div>
        <div class="topbar-right">
          <button
            class="icon-btn"
            aria-label="Refresh page"
            title="Refresh"
            onclick={() => refreshCount++}
          >
            <Icon name="refresh-cw" size={19} />
          </button>
          <button
            class="icon-btn"
            aria-label="Settings"
            title="Settings"
            onclick={() => (settingsOpen = true)}
          >
            <Icon name="settings" size={19} />
          </button>
        </div>
      </header>
    {/if}
    <main class="page-container" class:display-content={current === 'bigscreen'}>
      {#if !settings.active_event_code && current !== 'bigscreen'}
        <div class="empty-state">Choose an event in Settings.</div>
      {:else}
        {#key `${current}-${refreshCount}`}
          {#if current === 'dashboard'}<Dashboard
              {settings}
              onMatch={openMatch}
              onTeam={openTeam}
              onNavigate={navigate}
            />
          {:else if current === 'schedule'}<Schedule
              {settings}
              onMatch={openMatch}
              onTeam={openTeam}
            />
          {:else if current === 'rankings'}<Rankings {settings} onTeam={openTeam} />
          {:else if current === 'scouting'}<Scouting
              {settings}
              {notify}
              onTeam={openTeam}
              initialTeam={scoutTeam}
            />
          {:else if current === 'alliance'}<Alliance {settings} {notify} onTeam={openTeam} />
          {:else if current === 'simulator'}<Simulator {settings} {notify} onTeam={openTeam} />
          {:else if current === 'hub'}<Hub {notify} />
          {:else if current === 'playoffs'}<Playoffs
              {settings}
              onMatch={openMatch}
              onTeam={openTeam}
            />
          {:else if current === 'awards'}<Awards {settings} onTeam={openTeam} />
          {:else if current === 'bigscreen'}<Bigscreen
              {settings}
              onExit={() => navigate('dashboard')}
            />{/if}
        {/key}
      {/if}
    </main>
    {#if current !== 'bigscreen'}
      <BottomNav items={tabItems} activePage={tabSelection} onNavigate={navigate} />
    {/if}
  </div>
  {#if settingsOpen}
    <Modal
      open
      title="Settings"
      onClose={() => {
        settingsOpen = false;
        applyAppearance(settings);
      }}
    >
      <Settings
        {settings}
        {notify}
        onSaved={updateSettings}
        onClose={() => (settingsOpen = false)}
      />
      <button class="btn btn-secondary" style="margin-top:1rem" onclick={logout}>
        <Icon name="lock-keyhole" size={18} /> Lock app
      </button>
    </Modal>
  {/if}
  {#if selectedMatch}
    <Modal open title={`Q${selectedMatch.matchNumber}`} onClose={() => (selectedMatch = null)}>
      <MatchDetails match={selectedMatch} {settings} onTeam={openTeam} />
    </Modal>
  {/if}
  {#if selectedTeam != null}
    <Modal open title={`Team ${selectedTeam}`} onClose={() => (selectedTeam = null)}>
      <TeamProfile
        number={selectedTeam}
        {settings}
        {notify}
        onScout={scoutFor}
        onMatch={openMatch}
      />
    </Modal>
  {/if}
{/if}
<Toast message={toasts} />
