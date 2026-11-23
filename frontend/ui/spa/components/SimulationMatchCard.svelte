<script>
  import TeamIdentity from './TeamIdentity.svelte';
  import NumberStepper from './NumberStepper.svelte';
  import { isOurMatch, teamsFor } from '../lib/helpers.js';
  import { estimatedMatchOutcome } from '../lib/match-data.js';

  let {
    match,
    entry = null,
    teamNumber,
    oprs = {},
    maxRp = 6,
    onTeam,
    onChange,
    onPredict,
  } = $props();

  const played = $derived(match.scoreRedFinal != null && match.scoreBlueFinal != null);
  const prediction = $derived(played ? null : estimatedMatchOutcome(match, oprs));
</script>

<article class="sim-match-card" class:our-match={isOurMatch(match, teamNumber)}>
  <header class="sim-match-header">
    <strong class="match-num">Q{match.matchNumber}</strong>
    {#if played}
      <span class="sim-match-score">
        Final <span class="red">{match.scoreRedFinal}</span>–<span class="blue">
          {match.scoreBlueFinal}
        </span>
      </span>
    {:else if prediction}
      <span class="sim-match-score">
        Est. <span class="red">{prediction.redScore}</span>–<span class="blue">
          {prediction.blueScore}
        </span>
        · {prediction.winner === 'Tie' ? 'Even' : `${prediction.winner} favored`}
      </span>
    {:else}
      <span class="sim-match-score">Awaiting estimate</span>
    {/if}
  </header>

  {#each ['Red', 'Blue'] as side}
    <div class="sim-match-alliance" class:red={side === 'Red'} class:blue={side === 'Blue'}>
      <div class="sim-match-team-list">
        {#each teamsFor(match, side) as team (team.station)}
          <TeamIdentity {team} alliance={side.toLowerCase()} ourTeam={teamNumber} onOpen={onTeam} />
        {/each}
      </div>
      <NumberStepper
        label={`${side.toLowerCase()} RP for Q${match.matchNumber}`}
        variant={side.toLowerCase()}
        value={entry?.[side.toLowerCase()] ?? null}
        min={0}
        max={maxRp}
        onChange={(value) => onChange(side.toLowerCase(), value)}
      />
    </div>
  {/each}

  {#if !played}
    <footer class="sim-match-footer">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        disabled={!prediction}
        onclick={onPredict}
      >
        Predict
      </button>
    </footer>
  {/if}
</article>
