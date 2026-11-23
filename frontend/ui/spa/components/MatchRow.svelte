<script>
  import TeamChip from './TeamChip.svelte';
  import { formatTime, teamsFor, isOurMatch } from '../lib/helpers.js';
  let { match, teamNumber, onMatch = () => {}, onTeam = () => {}, oprMap = null } = $props();
  const ours = $derived(isOurMatch(match, teamNumber));
  const red = $derived(teamsFor(match, 'Red'));
  const blue = $derived(teamsFor(match, 'Blue'));
  const played = $derived(match.scoreRedFinal != null && match.scoreBlueFinal != null);
</script>

<div
  class="match-row"
  class:our-match={ours}
  role="button"
  tabindex="0"
  onclick={() => onMatch(match)}
  onkeydown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onMatch(match);
    }
  }}
>
  <span class="match-num">Q{match.matchNumber}</span>
  <div class="match-alliances">
    <div class="alliance-teams">
      {#each red as team (team.station)}<TeamChip
          {team}
          alliance="red"
          ourTeam={teamNumber}
          onOpen={onTeam}
        />{/each}
    </div>
    <div class="alliance-teams">
      {#each blue as team (team.station)}<TeamChip
          {team}
          alliance="blue"
          ourTeam={teamNumber}
          onOpen={onTeam}
        />{/each}
    </div>
  </div>
  <div class="match-score">
    {#if played}
      <span class:red-score={match.redWins}>{match.scoreRedFinal}</span><span class="match-vs">
        –
      </span><span class:blue-score={match.blueWins}>{match.scoreBlueFinal}</span>
    {:else}
      <span class="match-time">{formatTime(match.startTime)}</span>
    {/if}
  </div>
</div>
