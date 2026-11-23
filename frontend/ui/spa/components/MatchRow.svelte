<script>
  import MatchAlliances from './MatchAlliances.svelte';
  import { formatTime, allianceFor } from '../lib/helpers.js';
  import { matchOutcome, matchMetrics, fieldLabel } from '../lib/match-data.js';

  let {
    match,
    teamNumber,
    onMatch = () => {},
    onTeam = () => {},
    metrics = {},
    season = 2026,
  } = $props();
  const ours = $derived(
    match.teams?.some((team) => Number(team.teamNumber) === Number(teamNumber)) || false,
  );
  const outcome = $derived(matchOutcome(match, teamNumber));
  const played = $derived(match.scoreRedFinal != null && match.scoreBlueFinal != null);
  const stats = $derived(matchMetrics(match, metrics, season));
  const ourSide = $derived(ours ? allianceFor(match, teamNumber) : null);
  const officialField = $derived(metrics?.fields?.[String(match.matchNumber)] ?? null);
  const matchDetail = $derived({
    ...match,
    field: officialField,
    preloadedScore: metrics?.scores?.[String(match.matchNumber)] ?? null,
    preloadedOprs: metrics?.oprs ?? {},
  });

  function onKey(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onMatch(matchDetail);
    }
  }
</script>

<div
  class="match-card"
  class:our-match={ours}
  class:match-win={outcome === 'win'}
  class:match-loss={outcome === 'loss'}
  class:match-tie={outcome === 'tie'}
  role="button"
  tabindex="0"
  aria-label={`Qualification ${match.matchNumber}${outcome ? `, ${outcome}` : ''}`}
  onclick={() => onMatch(matchDetail)}
  onkeydown={onKey}
>
  <div class="match-card-heading">
    <span class="match-card-number">Q{match.matchNumber}</span>
    {#if fieldLabel(officialField)}<span class="match-card-field">
        {fieldLabel(officialField)}
      </span>{/if}
    {#if outcome}<strong class="match-card-outcome">
        {outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Tie'}
      </strong>
    {:else if !played}<time class="match-card-time">{formatTime(match.startTime)}</time>{/if}
  </div>

  <MatchAlliances {match} {teamNumber} {onTeam} compact />

  {#if played || stats.prediction.hasData}
    <div class="match-card-details">
      {#if played}
        {#if match.scoreRedAuto != null && match.scoreBlueAuto != null}
          <span class="match-card-metric">
            <span>Auto</span><span class="red-value">{match.scoreRedAuto}</span><span
              class="match-metric-sep"
            >
              :
            </span><span class="blue-value">{match.scoreBlueAuto}</span>
          </span>
        {/if}
        {#if stats.redRP != null && stats.blueRP != null}
          <span class="match-card-metric">
            <span>RP</span><span class="red-value">{stats.redRP}</span><span
              class="match-metric-sep"
            >
              :
            </span><span class="blue-value">{stats.blueRP}</span>
          </span>
        {/if}
        {#if stats.tips}
          <span class="match-card-metric">
            <span>Tips</span><span class="red-value">{stats.tips.red}</span><span
              class="match-metric-sep"
            >
              :
            </span><span class="blue-value">{stats.tips.blue}</span>
          </span>
        {/if}
        {#if match.scoreRedFoul || match.scoreBlueFoul}
          <span class="match-card-metric">
            <span>Fouls</span><span class="red-value">{match.scoreRedFoul ?? 0}</span><span
              class="match-metric-sep"
            >
              :
            </span><span class="blue-value">{match.scoreBlueFoul ?? 0}</span>
          </span>
        {/if}
      {/if}
      {#if stats.prediction.hasData}
        <span class="match-card-prediction">
          {#if stats.prediction.winner === 'Tie'}Even OPR
          {:else if ourSide}{stats.prediction.winner === ourSide ? 'Favored' : 'Unfavored'}
          {:else}{stats.prediction.winner} favored{/if}
          · {stats.prediction.confidence}%
          <span class="match-card-opr">
            OPR {Math.round(stats.prediction.red)} : {Math.round(stats.prediction.blue)}
          </span>
        </span>
      {/if}
    </div>
  {/if}
</div>
