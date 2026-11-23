<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import MatchRow from '../components/MatchRow.svelte';
  import TeamChip from '../components/TeamChip.svelte';
  import StatHelp from '../components/StatHelp.svelte';
  import Modal from '../components/Modal.svelte';
  import { isOurMatch, allianceFor, formatTime } from '../lib/helpers.js';
  import { loadMatchData, matchOutcome } from '../lib/match-data.js';
  import { statHelp } from '../lib/stat-help.js';
  import { onPageRefresh } from '../lib/refresh.js';

  let { settings, onMatch, onTeam, onNavigate } = $props();
  let loading = $state(true);
  let error = $state('');
  let ranks = $state([]);
  let matches = $state([]);
  let metrics = $state({ scores: {}, oprs: {} });
  let remaining = $state('');
  let selectedStatId = $state(null);
  const teamNumber = $derived(Number(settings.team_number));
  const ourMatches = $derived(matches.filter((match) => isOurMatch(match, teamNumber)));
  const played = $derived(ourMatches.filter((m) => m.scoreRedFinal != null));
  const next = $derived(ourMatches.find((m) => m.scoreRedFinal == null));
  const last = $derived(played.at(-1));
  const rank = $derived(ranks.find((r) => Number(r.teamNumber) === teamNumber));
  const teamScore = (m) =>
    allianceFor(m, teamNumber) === 'Red' ? m.scoreRedFinal : m.scoreBlueFinal;
  const teamAuto = (m) => (allianceFor(m, teamNumber) === 'Red' ? m.scoreRedAuto : m.scoreBlueAuto);
  const wins = $derived(played.filter((match) => matchOutcome(match, teamNumber) === 'win').length);
  const losses = $derived(
    played.filter((match) => matchOutcome(match, teamNumber) === 'loss').length,
  );
  const ties = $derived(played.filter((match) => matchOutcome(match, teamNumber) === 'tie').length);
  const average = (items, value) =>
    items.length
      ? Math.round(items.reduce((sum, m) => sum + (value(m) || 0), 0) / items.length)
      : '–';
  const highMatch = $derived(
    played.reduce(
      (highest, match) => (!highest || teamScore(match) > teamScore(highest) ? match : highest),
      null,
    ),
  );
  const stats = $derived([
    { id: 'rank', label: 'Rank', value: rank ? `#${rank.rank}` : '–' },
    {
      id: 'record',
      label: ties ? 'W–L–T' : 'W–L',
      value: `${wins}–${losses}${ties ? `–${ties}` : ''}`,
    },
    { id: 'rp', label: 'RP avg', value: rank?.sortOrder1?.toFixed(3) ?? '–' },
    { id: 'averageScore', label: 'Avg score', value: average(played, teamScore) },
    { id: 'averageAuto', label: 'Avg Auto', value: average(played, teamAuto) },
    { id: 'highScore', label: 'High score', value: highMatch ? teamScore(highMatch) : '–' },
    { id: 'so2', label: 'SO₂', value: rank?.sortOrder2?.toFixed(2) ?? '–' },
    {
      id: 'matches',
      label: 'Counted / played',
      value:
        rank?.matchesCounted != null && rank.matchesPlayed != null
          ? `${rank.matchesCounted}/${rank.matchesPlayed}`
          : '–',
    },
    { id: 'dq', label: 'DQ', value: rank?.dq ?? '–' },
  ]);
  const selectedStat = $derived(stats.find((stat) => stat.id === selectedStatId));
  const helpContext = $derived({
    season: settings.active_season,
    rank,
    teamCount: ranks.length,
    wins,
    losses,
    ties,
    playedCount: played.length,
    scoreTotal: played.reduce((sum, match) => sum + (teamScore(match) || 0), 0),
    autoTotal: played.reduce((sum, match) => sum + (teamAuto(match) || 0), 0),
    averageScore: average(played, teamScore),
    averageAuto: average(played, teamAuto),
    highScore: highMatch ? teamScore(highMatch) : null,
    highMatch,
  });

  function showStat(id) {
    if (statHelp[id]) selectedStatId = id;
  }

  onMount(() => {
    let active = true;
    let request = 0;
    const updateCountdown = () => {
      if (!next?.startTime) {
        remaining = '';
        return;
      }
      const seconds = Math.max(0, Math.floor((Date.parse(next.startTime) - Date.now()) / 1000));
      remaining = `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    };
    const load = async () => {
      const id = ++request;
      try {
        const matchDataRequest = loadMatchData(settings);
        const [rankData, scheduleData] = await Promise.all([api.rankings(), api.schedule()]);
        if (!active || id !== request) return;
        ranks = rankData.rankings || rankData.Rankings || [];
        matches = scheduleData.schedule || [];
        error = '';
        loading = false;
        updateCountdown();
        const matchData = await matchDataRequest;
        if (active && id === request) metrics = matchData;
      } catch (reason) {
        if (active && id === request) {
          error = reason.message;
          loading = false;
        }
      }
    };
    void load();
    const timer = setInterval(updateCountdown, 1000);
    const unsubscribe = onPageRefresh(load);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
    };
  });
</script>

{#if !settings.active_event_code}
  <div class="empty-state">Choose an event in Settings.</div>
{:else if loading}
  <div class="loading">Loading</div>
{:else if error}
  <div class="svelte-error">{error}</div>
{:else}
  {#if next}
    <div class="card-header dashboard-match-heading">
      <span class="card-title">Next match</span>
      <time class="match-time">{formatTime(next.startTime)}</time>
    </div>
    {#if remaining}<div class="countdown-block">
        <div class="countdown-time">{remaining}</div>
      </div>{/if}
    <MatchRow match={next} {teamNumber} {onMatch} {onTeam} {metrics} />
  {/if}
  {#if last}
    <div class="card-header dashboard-match-heading">
      <span class="card-title">Last match</span>
    </div>
    <MatchRow match={last} {teamNumber} {onMatch} {onTeam} {metrics} />
  {/if}
  {#if rank}
    <div class="card">
      <div class="card-header">
        <span class="card-title">{teamNumber} · {rank.teamName}</span><span>
          #{rank.rank} of {ranks.length}
        </span>
      </div>
      <div class="stat-grid stat-grid-3">
        {#each stats as stat (stat.id)}
          <button
            type="button"
            class="stat-box stat-box-link"
            aria-label={`Explain ${stat.label}`}
            onclick={() => showStat(stat.id)}
          >
            <span class="stat-value">{stat.value}</span>
            <span class="stat-label">{stat.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
  {#if played.length}
    <div class="card-header">
      <span class="card-title">Recent matches</span><button
        class="btn btn-secondary btn-sm"
        onclick={() => onNavigate('schedule')}
      >
        All matches
      </button>
    </div>
    {#each [...played].slice(-5).reverse() as match (match.matchNumber)}
      <MatchRow {match} {teamNumber} {onMatch} {onTeam} {metrics} />
    {/each}
  {/if}
  <div class="card-header" style="margin-top:1.25rem">
    <span class="card-title">Rankings</span><button
      class="btn btn-secondary btn-sm"
      onclick={() => onNavigate('rankings')}
    >
      All rankings
    </button>
  </div>
  <div class="card">
    {#each ranks.slice(0, 5) as entry (entry.teamNumber)}
      <div
        class="rank-summary-row"
        style="display:flex;align-items:center;justify-content:space-between;padding:.45rem 0;gap:.5rem;border-bottom:1px solid var(--border)"
      >
        <span>#{entry.rank}</span><TeamChip
          team={entry}
          ourTeam={teamNumber}
          onOpen={onTeam}
        /><span>{entry.teamName}</span><span style="margin-left:auto">
          {entry.sortOrder1?.toFixed(2) ?? '–'} RP
        </span>
      </div>
    {/each}
  </div>
{/if}

{#if selectedStat}
  <Modal open title={statHelp[selectedStat.id].title} onClose={() => (selectedStatId = null)}>
    <StatHelp stat={selectedStat} context={helpContext} />
  </Modal>
{/if}
