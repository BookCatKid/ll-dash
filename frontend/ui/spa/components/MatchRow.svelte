<script>
  import MatchAlliances from './MatchAlliances.svelte';
  import { formatTime } from '../lib/helpers.js';
  import { matchOutcome, fieldLabel } from '../lib/match-data.js';

  let { match, teamNumber, onMatch = () => {}, onTeam = () => {}, metrics = {} } = $props();
  const ours = $derived(
    match.teams?.some((team) => Number(team.teamNumber) === Number(teamNumber)) || false,
  );
  const outcome = $derived(matchOutcome(match, teamNumber));
  const played = $derived(match.scoreRedFinal != null && match.scoreBlueFinal != null);
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
    {:else if !played}<time class="match-card-time">{formatTime(match.startTime)}</time>{/if}
  </div>

  <MatchAlliances {match} {teamNumber} {onTeam} compact />
</div>
