<script>
  import MatchAlliances from './MatchAlliances.svelte';
  import { allianceFor } from '../lib/helpers.js';
  import { matchTimeLabel } from '../lib/match-timing.js';
  import { matchOutcome, fieldLabel, estimatedMatchOutcome } from '../lib/match-data.js';

  let {
    match,
    teamNumber,
    onMatch = () => {},
    onTeam = () => {},
    metrics = {},
    now = Date.now(),
  } = $props();
  const ours = $derived(
    match.teams?.some((team) => Number(team.teamNumber) === Number(teamNumber)) || false,
  );
  const outcome = $derived(matchOutcome(match, teamNumber));
  const played = $derived(match.scoreRedFinal != null && match.scoreBlueFinal != null);
  const estimate = $derived(estimatedMatchOutcome(match, metrics?.oprs));
  const favoredOurs = $derived(
    ours &&
      estimate != null &&
      estimate.winner !== 'Tie' &&
      estimate.winner === allianceFor(match, teamNumber),
  );
  const favoredOpponents = $derived(
    ours && estimate != null && estimate.winner !== 'Tie' && !favoredOurs,
  );
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
    {#if !played && fieldLabel(officialField)}<span class="match-card-field">
        {fieldLabel(officialField)}
      </span>{/if}
    {#if outcome}<strong class="match-card-outcome">
        {outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Tie'}
      </strong>
    {:else if !played}<span class="match-card-time">{matchTimeLabel(match, now)}</span>{/if}
  </div>

  <MatchAlliances {match} {teamNumber} {onTeam} compact />

  {#if estimate}
    <div
      class="match-card-estimate"
      title="Approximate win chance from season OPR. This is a heuristic, not a calibrated probability."
    >
      <span class="match-card-estimated-score">
        Est. <span class="match-scoring-red">{estimate.redScore}</span><span aria-hidden="true">
          –
        </span><span class="match-scoring-blue">{estimate.blueScore}</span>
      </span>
      <span
        class="match-card-probability"
        class:red={estimate.winner === 'Red'}
        class:blue={estimate.winner === 'Blue'}
        class:favored-ours={favoredOurs}
        class:favored-opponents={favoredOpponents}
      >
        {#if estimate.winner === 'Tie'}Even · 50% each
        {:else}
          {estimate.winner} favored{ours ? (favoredOurs ? ' (ours)' : ' (opponents)') : ''} · ~{estimate.winChance}%
        {/if}
      </span>
    </div>
  {/if}
</div>
