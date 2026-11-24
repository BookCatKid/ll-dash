<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import MatchRow from '../components/MatchRow.svelte';
  import TeamIdentity from '../components/TeamIdentity.svelte';
  import TeamStatGrid from '../components/TeamStatGrid.svelte';
  import { isOurMatch } from '../lib/helpers.js';
  import { withMatchEstimates, matchTimeLabel } from '../lib/match-timing.js';
  import { loadMatchData } from '../lib/match-data.js';
  import { onPageRefresh } from '../lib/refresh.js';

  let { settings, onMatch, onTeam, onNavigate } = $props();
  let loading = $state(true);
  let error = $state('');
  let ranks = $state([]);
  let matches = $state([]);
  let metrics = $state({ scores: {}, oprs: {} });
  let now = $state(Date.now());
  const timedMatches = $derived(withMatchEstimates(matches));
  const teamNumber = $derived(Number(settings.team_number));
  const ourMatches = $derived(timedMatches.filter((match) => isOurMatch(match, teamNumber)));
  const played = $derived(ourMatches.filter((m) => m.scoreRedFinal != null));
  const next = $derived(ourMatches.find((m) => m.scoreRedFinal == null));
  const last = $derived(played.at(-1));
  const rank = $derived(ranks.find((r) => Number(r.teamNumber) === teamNumber));
  const remaining = $derived.by(() => {
    if (next?.estimatedStartTime == null || next.estimatedStartTime <= now) return '';
    const seconds = Math.ceil((next.estimatedStartTime - now) / 1000);
    return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });
  onMount(() => {
    let active = true;
    let request = 0;
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
    const timer = setInterval(() => (now = Date.now()), 1000);
    const refresh = setInterval(load, 45000);
    const unsubscribe = onPageRefresh(load);
    return () => {
      active = false;
      clearInterval(timer);
      clearInterval(refresh);
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
      <span class="match-time">{matchTimeLabel(next, now)}</span>
    </div>
    {#if remaining}<div class="countdown-block">
        <div class="countdown-time">{remaining}</div>
      </div>{/if}
    <MatchRow match={next} {teamNumber} {onMatch} {onTeam} {metrics} {now} />
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
        <span class="card-title dashboard-team-heading">
          <TeamIdentity team={rank} ourTeam={teamNumber} onOpen={onTeam} />
        </span><span>
          #{rank.rank} of {ranks.length}
        </span>
      </div>
      <TeamStatGrid
        {rank}
        matches={ourMatches}
        {teamNumber}
        teamCount={ranks.length}
        season={settings.active_season}
      />
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
      <div class="rank-summary-row">
        <span class="rank-summary-position">#{entry.rank}</span>
        <TeamIdentity team={entry} ourTeam={teamNumber} onOpen={onTeam} />
        <span class="rank-summary-rp">{entry.sortOrder1?.toFixed(2) ?? '–'} RP</span>
      </div>
    {/each}
  </div>
{/if}
