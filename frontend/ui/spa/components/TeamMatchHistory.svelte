<script>
  import { teamMatchHistory } from '../lib/match-history.js';

  let { matches, teamNumber, matchScores = {}, season, onMatch } = $props();
  const results = $derived(teamMatchHistory(matches, teamNumber, matchScores, season));
</script>

{#if results.length}
  <section class="team-match-history" aria-label="Qualification results">
    <h3 class="form-label">Qualification results ({results.length})</h3>
    <div class="team-match-history-list">
      {#each results as result (result.match.matchNumber)}
        <button
          type="button"
          class="team-match-history-row"
          aria-label={`Q${result.match.matchNumber}, ${result.side}, ${result.ownScore} to ${result.opponentScore}, ${result.outcome}`}
          onclick={() => onMatch(result.match)}
        >
          <span class="team-match-history-number">Q{result.match.matchNumber}</span>
          <span
            class="team-match-history-alliance"
            class:red={result.side === 'Red'}
            class:blue={result.side === 'Blue'}
          >
            {result.side}
          </span>
          <span class="team-match-history-score">{result.ownScore}–{result.opponentScore}</span>
          {#if result.rp != null}
            <span class="team-match-history-rp">{result.rp} RP</span>
          {/if}
          <strong
            class="team-match-history-outcome"
            class:win={result.outcome === 'win'}
            class:loss={result.outcome === 'loss'}
            class:tie={result.outcome === 'tie'}
          >
            {result.outcome === 'win' ? 'Win' : result.outcome === 'loss' ? 'Loss' : 'Tie'}
          </strong>
        </button>
      {/each}
    </div>
  </section>
{/if}
