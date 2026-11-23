<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { onPageRefresh } from '../lib/refresh.js';
  import { formatTime, teamsFor, isOurMatch } from '../lib/helpers.js';
  import Icon from '../components/Icon.svelte';
  let { settings, onExit } = $props();
  let clock = $state(new Date());
  let matches = $state([]),
    ranks = $state([]),
    playoffs = $state([]),
    alliances = $state([]),
    fields = $state({});
  let cycle = $state(false),
    index = $state(0);
  const config = $derived(settings.bigscreen || {});
  const panels = $derived(
    ['schedule', 'rankings', 'playoffs'].filter((key) => config.panels?.[key] !== false),
  );
  const shown = $derived(cycle ? [panels[index % panels.length]] : panels);
  const nextIndex = $derived(matches.findIndex((m) => m.scoreRedFinal == null));
  const visible = $derived(
    nextIndex < 0 ? matches.slice(-12) : matches.slice(Math.max(0, nextIndex - 3), nextIndex + 10),
  );
  function toggleCycle() {
    cycle = !cycle;
    localStorage.setItem('bs_cycle', cycle ? '1' : '0');
    index = 0;
  }
  onMount(() => {
    let active = true;
    document.body.classList.add('bigscreen-mode');
    try {
      cycle = localStorage.getItem('bs_cycle') === '1';
    } catch {
      /* storage */
    }
    const keyHandler = (event) => {
      if (event.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', keyHandler);
    const load = async () => {
      try {
        const [s, r, p, a, f] = await Promise.all([
          api.schedule(),
          api.rankings(),
          api.playoffSchedule(),
          api.alliances(),
          api.scheduleFields(),
        ]);
        if (!active) return;
        matches = s.schedule || [];
        ranks = r.rankings || [];
        playoffs = p.schedule || [];
        alliances = a.alliances || [];
        fields = f.fieldsByMatch || {};
      } catch {
        /* retry at next refresh */
      }
    };
    void load();
    const unsubscribe = onPageRefresh(load);
    const refresh = setInterval(load, Math.max(10, config.refresh_seconds || 45) * 1000);
    const tick = setInterval(() => (clock = new Date()), 1000);
    const step = setInterval(
      () => {
        if (cycle && panels.length > 1) index = (index + 1) % panels.length;
      },
      Math.max(5, config.cycle_seconds || 15) * 1000,
    );
    return () => {
      active = false;
      unsubscribe();
      clearInterval(refresh);
      clearInterval(tick);
      clearInterval(step);
      document.removeEventListener('keydown', keyHandler);
      document.body.classList.remove('bigscreen-mode');
    };
  });
</script>

<div class="bs-root">
  <header class="bs-header">
    <div class="bs-brand">{settings.dashboard_name || 'LL Dash'}</div>
    <div class="bs-event">{settings.active_event_name}</div>
    <div class="bs-clock">{clock.toLocaleTimeString()}</div>
    <div class="bs-controls">
      <button
        class="icon-btn"
        class:bs-toggle-on={cycle}
        aria-label="Cycle panels"
        onclick={toggleCycle}
      >
        <Icon name="rotate-ccw" size={19} />
      </button><button class="icon-btn" aria-label="Exit display" onclick={onExit}>
        <Icon name="x" size={19} />
      </button>
    </div>
  </header>
  <div
    class="bs-grid"
    style:grid-template-columns={shown
      .map((key) => (key === 'schedule' ? '2fr' : key === 'playoffs' ? '1.6fr' : '1fr'))
      .join(' ')}
  >
    {#if shown.includes('schedule')}
      <section class="bs-panel bs-schedule">
        <div class="bs-panel-title">Qualification schedule</div>
        {#each visible as match (match.matchNumber)}
          <div
            class="bs-match"
            class:bs-ours={isOurMatch(match, settings.team_number)}
            class:bs-current={match === matches[nextIndex]}
            class:bs-played={match.scoreRedFinal != null}
          >
            <div class="bs-qnum">Q{match.matchNumber}</div>
            <div class="bs-teams">
              {#each teamsFor(match, 'Red') as team}<span
                  class="bs-chip red"
                  class:our={Number(team.teamNumber) === Number(settings.team_number)}
                >
                  {team.teamNumber}
                </span>{/each}
            </div>
            {#if match.scoreRedFinal != null}<div class="bs-score">
                <span class="bs-score-r">{match.scoreRedFinal}</span>–<span class="bs-score-b">
                  {match.scoreBlueFinal}
                </span>
              </div>{:else}<div class="bs-time">{formatTime(match.startTime)}</div>{/if}
            <div class="bs-teams bs-right">
              {#each teamsFor(match, 'Blue') as team}<span
                  class="bs-chip blue"
                  class:our={Number(team.teamNumber) === Number(settings.team_number)}
                >
                  {team.teamNumber}
                </span>{/each}
            </div>
            <div class="bs-field">{fields[String(match.matchNumber)] || ''}</div>
          </div>
        {/each}
      </section>
    {/if}
    {#if shown.includes('rankings')}
      <aside class="bs-panel bs-rankings">
        <div class="bs-panel-title">Rankings</div>
        {#each ranks.slice(0, 16) as rank (rank.teamNumber)}
          <div
            class="bs-rank-row"
            class:bs-ours={Number(rank.teamNumber) === Number(settings.team_number)}
          >
            <span class="bs-rank-pos">{rank.rank}</span><span class="bs-rank-team">
              {rank.teamNumber}
            </span><span class="bs-rank-name">{rank.teamName}</span><span class="bs-rank-rp">
              {rank.sortOrder1?.toFixed(2) || '–'}
            </span><span class="bs-rank-wl">{rank.wins}–{rank.losses}</span>
          </div>
        {/each}
      </aside>
    {/if}
    {#if shown.includes('playoffs')}
      <section class="bs-panel bs-playoffs">
        <div class="bs-panel-title">Playoffs</div>
        {#each playoffs as match (match.matchNumber)}
          <div class="bs-match" class:bs-ours={isOurMatch(match, settings.team_number)}>
            <span class="bs-qnum">M{match.matchNumber}</span>
            <div class="bs-teams">
              {#each teamsFor(match, 'Red') as team}<span class="bs-chip red">
                  {team.teamNumber}
                </span>{/each}
            </div>
            <div class="bs-score">{match.scoreRedFinal ?? '–'}–{match.scoreBlueFinal ?? '–'}</div>
            <div class="bs-teams bs-right">
              {#each teamsFor(match, 'Blue') as team}<span class="bs-chip blue">
                  {team.teamNumber}
                </span>{/each}
            </div>
          </div>
        {/each}
      </section>
    {/if}
  </div>
</div>
