<script>
  import TeamChip from './TeamChip.svelte';
  import { teamsFor } from '../lib/helpers.js';

  let { match, teamNumber, onTeam, compact = false, ranks = {} } = $props();
  const played = $derived(match.scoreRedFinal != null && match.scoreBlueFinal != null);
  const sides = $derived([
    {
      side: 'Red',
      teams: teamsFor(match, 'Red'),
      score: match.scoreRedFinal,
      wins: match.redWins,
    },
    {
      side: 'Blue',
      teams: teamsFor(match, 'Blue'),
      score: match.scoreBlueFinal,
      wins: match.blueWins,
    },
  ]);
</script>

<div class="match-alliance-grid" class:compact>
  {#each sides as alliance (alliance.side)}
    <section
      class="match-alliance-panel"
      class:red={alliance.side === 'Red'}
      class:blue={alliance.side === 'Blue'}
      class:winner={played && alliance.wins}
    >
      <div class="match-alliance-heading">
        <span class="match-alliance-title">{alliance.side}</span>
        {#if played}<strong class="match-alliance-score">{alliance.score}</strong>{/if}
      </div>
      <div class="match-alliance-members">
        {#each alliance.teams as team (team.station)}
          <div
            class="match-alliance-member"
            class:our-team={Number(team.teamNumber) === Number(teamNumber)}
          >
            <TeamChip
              {team}
              alliance={alliance.side.toLowerCase()}
              ourTeam={teamNumber}
              onOpen={onTeam}
            />
            {#if !compact}
              <div class="match-alliance-member-info">
                {#if team.teamName}<span class="match-alliance-member-name" title={team.teamName}>
                    {team.teamName}
                  </span>{/if}
                <span class="match-alliance-member-station">
                  {team.station}{team.surrogate ? ' · Surrogate' : ''}{team.dq ? ' · DQ' : ''}
                </span>
              </div>
            {/if}
            {#if !compact && ranks[team.teamNumber]}
              <span class="match-alliance-member-rank">#{ranks[team.teamNumber].rank}</span>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/each}
</div>
