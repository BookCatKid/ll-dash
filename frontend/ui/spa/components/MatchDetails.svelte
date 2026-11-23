<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import {
    teamsFor,
    oprPrediction,
    computeRp,
    number,
    robotStationRows,
    formatTime,
  } from '../lib/helpers.js';
  import TeamChip from './TeamChip.svelte';

  let { match, settings, onTeam } = $props();
  let official = $state(null);
  let scout = $state(null);
  let oprs = $state({});
  let ranks = $state({});
  const redTeams = $derived(teamsFor(match, 'Red'));
  const blueTeams = $derived(teamsFor(match, 'Blue'));
  const red = $derived(official?.red);
  const blue = $derived(official?.blue);
  const tie = $derived(match.scoreRedFinal != null && match.scoreRedFinal === match.scoreBlueFinal);
  const redRP = $derived(computeRp(red, match.redWins, tie, settings.active_season));
  const blueRP = $derived(computeRp(blue, match.blueWins, tie, settings.active_season));
  const prediction = $derived(oprPrediction(redTeams, blueTeams, oprs));
  const season = $derived(Number(settings.active_season));
  const videoUrl = $derived(
    typeof match.videoURL === 'string' && /^https?:\/\//i.test(match.videoURL)
      ? match.videoURL
      : null,
  );
  const bonusFields = $derived(
    season === 2026
      ? [
          { label: 'Swarm', aliases: ['swarmRP', 'swarmRp'] },
          { label: 'Pollinator 1', aliases: ['pollinator1RP', 'pollinator1Rp'] },
          { label: 'Pollinator 2', aliases: ['pollinator2RP', 'pollinator2Rp'] },
        ]
      : season === 2025
        ? [
            {
              label: 'Movement',
              aliases: ['movementRP', 'movementRp', 'movementRankingPoint', 'MovementRp'],
            },
            { label: 'Goal', aliases: ['goalRP', 'goalRp', 'goalRankingPoint', 'GoalRp'] },
            {
              label: 'Pattern',
              aliases: ['patternRP', 'patternRp', 'patternRankingPoint', 'PatternRp'],
            },
          ]
        : [],
  );
  const scoutRedRP = $derived(computeRp(scout?.red, match.redWins, tie, season));
  const scoutBlueRP = $derived(computeRp(scout?.blue, match.blueWins, tie, season));
  function bonusEarned(alliance, aliases) {
    return aliases.some((alias) => alliance?.[alias] === true);
  }
  const metric = (label, key, points = false) => ({
    label,
    red: red?.[key],
    blue: blue?.[key],
    points,
  });
  const phases = $derived([
    {
      name: 'Autonomous',
      rows: [
        metric('Leave points', 'autoLeavePoints'),
        metric('Park points', 'autoParkPoints'),
        metric('Hive points', 'autoHivePoints'),
        metric('Auto total', 'autoPoints'),
      ],
    },
    {
      name: 'TeleOp',
      rows: [
        metric('Hive points', 'teleopHivePoints'),
        metric('Flower points', 'teleopFlowerPoints'),
        metric('Garden points', 'teleopGardenPoints'),
        metric('Park points', 'teleopParkPoints'),
        metric('TeleOp total', 'teleopPoints'),
      ],
    },
    {
      name: 'Score',
      rows: [
        metric('Points scored', 'preFoulTotal'),
        { label: 'Opponent fouls', red: blue?.foulPointsCommitted, blue: red?.foulPointsCommitted },
        metric('Final score', 'totalPoints'),
      ],
    },
    {
      name: 'Ranking points',
      rows: [
        {
          label: 'Win / tie',
          red: match.redWins ? 3 : tie ? 1 : 0,
          blue: match.blueWins ? 3 : tie ? 1 : 0,
        },
        {
          label: 'Swarm',
          red: red?.swarmRP || red?.swarmRp ? 1 : 0,
          blue: blue?.swarmRP || blue?.swarmRp ? 1 : 0,
        },
        {
          label: 'Pollinator 1',
          red: red?.pollinator1RP || red?.pollinator1Rp ? 1 : 0,
          blue: blue?.pollinator1RP || blue?.pollinator1Rp ? 1 : 0,
        },
        {
          label: 'Pollinator 2',
          red: red?.pollinator2RP || red?.pollinator2Rp ? 1 : 0,
          blue: blue?.pollinator2RP || blue?.pollinator2Rp ? 1 : 0,
        },
        { label: 'Total RP', red: redRP, blue: blueRP },
      ],
    },
  ]);
  const fields = $derived([
    { label: 'Auto hive tips', red: red?.autoHiveTips, blue: blue?.autoHiveTips },
    { label: 'TeleOp hive tips', red: red?.teleopHiveTips, blue: blue?.teleopHiveTips },
    { label: 'Hive pieces', red: red?.teleopHivePollenNectar, blue: blue?.teleopHivePollenNectar },
    {
      label: 'Garden pieces',
      red: red?.teleopGardenPollenNectar,
      blue: blue?.teleopGardenPollenNectar,
    },
    { label: 'Minor fouls', red: red?.minorFouls, blue: blue?.minorFouls },
    { label: 'Major fouls', red: red?.majorFouls, blue: blue?.majorFouls },
    {
      label: 'Points given to opponent',
      red: red?.foulPointsCommitted,
      blue: blue?.foulPointsCommitted,
    },
  ]);
  const flowers = [
    { label: 'Red flower', key: 'redAllianceFlower' },
    { label: 'Scoring flower', key: 'scoringFlower' },
    { label: 'Blue flower', key: 'blueAllianceFlower' },
    { label: 'Audience flower', key: 'audienceFlower' },
  ];
  const pieceLabels = { RED_NECTAR: 'Red nectar', BLUE_NECTAR: 'Blue nectar', POLLEN: 'Pollen' };
  function scoreValue(value) {
    return value == null ? '–' : value;
  }

  onMount(() => {
    let active = true;
    const season = Number(settings.active_season);
    Promise.all([
      season === 2026 ? api.matches().catch(() => null) : null,
      api.ftcEventScores(settings.active_event_code, season).catch(() => null),
      api.ftcEventOprs(settings.active_event_code, season).catch(() => null),
      api.rankings().catch(() => null),
    ]).then(([scoreData, scoutData, oprData, rankData]) => {
      if (!active) return;
      const found = scoreData?.matchScores?.find((m) => m.matchNumber === match.matchNumber);
      if (found)
        official = {
          red: found.alliances?.find((a) => a.alliance === 'Red'),
          blue: found.alliances?.find((a) => a.alliance === 'Blue'),
        };
      const matchScore = scoutData?.matches?.find((m) => m.matchNum === match.matchNumber);
      if (matchScore) scout = matchScore;
      oprs = Object.fromEntries((oprData?.oprList || []).map((entry) => [entry.teamNumber, entry]));
      ranks = Object.fromEntries(
        (rankData?.rankings || rankData?.Rankings || []).map((entry) => [entry.teamNumber, entry]),
      );
    });
    return () => {
      active = false;
    };
  });
</script>

<div class="match-scoring">
  <div class="match-scoring-columns"><span></span><strong>Red</strong><strong>Blue</strong></div>
  <div class="match-scoring-row final">
    <span class="match-scoring-label">Final</span><strong class="match-scoring-red">
      {scoreValue(match.scoreRedFinal)}
    </strong><strong class="match-scoring-blue">{scoreValue(match.scoreBlueFinal)}</strong>
  </div>
  <div class="match-scoring-row">
    <span class="match-scoring-label">Teams</span>
    <span
      class="match-scoring-red"
      style="display:flex;flex-wrap:wrap;gap:.15rem;justify-content:flex-end"
    >
      {#each redTeams as team}<TeamChip
          {team}
          alliance="red"
          ourTeam={settings.team_number}
          onOpen={onTeam}
        />{/each}
    </span>
    <span
      class="match-scoring-blue"
      style="display:flex;flex-wrap:wrap;gap:.15rem;justify-content:flex-end"
    >
      {#each blueTeams as team}<TeamChip
          {team}
          alliance="blue"
          ourTeam={settings.team_number}
          onOpen={onTeam}
        />{/each}
    </span>
  </div>
  {#if prediction.hasData}
    <div class="match-scoring-row">
      <span class="match-scoring-label">OPR</span><span class="match-scoring-red">
        {number(prediction.red)}
      </span><span class="match-scoring-blue">{number(prediction.blue)}</span>
    </div>
    <div class="match-scoring-row">
      <span class="match-scoring-label">Favored</span><span class="match-scoring-red">
        {prediction.winner === 'Red' ? `${prediction.confidence}%` : '–'}
      </span><span class="match-scoring-blue">
        {prediction.winner === 'Blue' ? `${prediction.confidence}%` : '–'}
      </span>
    </div>
  {/if}
  {#if red && blue && red.autoPoints != null}
    {#each phases as phase (phase.name)}
      <section class="match-scoring-group">
        <h3 class="match-scoring-group-title">{phase.name}</h3>
        {#each phase.rows as item (item.label)}
          <div
            class="match-scoring-row"
            class:total={item.label.includes('total') || item.label === 'Total RP'}
            class:final={item.label === 'Final score'}
          >
            <span class="match-scoring-label">{item.label}</span><span class="match-scoring-red">
              {scoreValue(item.red)}
            </span><span class="match-scoring-blue">{scoreValue(item.blue)}</span>
          </div>
        {/each}
      </section>
    {/each}
    <details class="match-scoring-expand">
      <summary>Robot actions</summary>
      <div class="match-scoring-expand-body">
        <table class="match-scoring-robot-table">
          <colgroup><col class="match-scoring-robot-team-col" /><col span="3" /></colgroup>
          <thead>
            <tr><th>Team</th><th>Left wall</th><th>Auto park</th><th>TeleOp park</th></tr>
          </thead>
          <tbody>
            {#each robotStationRows(match, official) as row (row.station)}
              <tr class="match-scoring-robot-row" data-station={row.station}>
                <th scope="row">
                  <div class="match-scoring-robot-identity">
                    {#if row.team}<TeamChip
                        team={row.team}
                        alliance={row.side.toLowerCase()}
                        ourTeam={settings.team_number}
                        onOpen={onTeam}
                      />{#if row.team.teamName}<span class="match-scoring-robot-name">
                          {row.team.teamName}
                        </span>{/if}{:else}Team unavailable{/if}
                  </div>
                </th>
                {#each [row.leftWall, row.autoPark, row.teleopPark] as result}
                  <td>
                    <span class="match-scoring-robot-result" class:yes={result === true}>
                      {result == null ? '–' : result ? 'Yes' : 'No'}
                    </span>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </details>
    <details class="match-scoring-expand">
      <summary>Field and fouls</summary>
      <div class="match-scoring-expand-body">
        {#each fields as item (item.label)}
          <div class="match-scoring-row">
            <span class="match-scoring-label">{item.label}</span><span class="match-scoring-red">
              {scoreValue(item.red)}
            </span><span class="match-scoring-blue">{scoreValue(item.blue)}</span>
          </div>
        {/each}
      </div>
    </details>
    <details class="match-scoring-expand">
      <summary>Flower contents</summary>
      <div class="match-scoring-expand-body match-scoring-flower-list">
        {#each flowers as flower (flower.key)}
          <div class="match-scoring-flower">
            <div class="match-scoring-flower-heading"><strong>{flower.label}</strong></div>
            <div class="match-scoring-flower-pieces">
              {#if !red?.[flower.key]?.length}<span class="match-scoring-empty">Empty</span>
              {:else}{#each red[flower.key] as piece, index}<span
                    class="match-scoring-piece"
                    class:red={piece === 'RED_NECTAR'}
                    class:blue={piece === 'BLUE_NECTAR'}
                    class:pollen={piece === 'POLLEN'}
                  >
                    {pieceLabels[piece] || piece}{index < red[flower.key].length - 1 ? ', ' : ''}
                  </span>{/each}{/if}
            </div>
          </div>
        {/each}
      </div>
    </details>
  {:else if scout?.red?.autoHivePoints != null}
    <section class="match-scoring-group">
      <h3 class="match-scoring-group-title">Scoring</h3>
      {#each [['Auto hive', 'autoHivePoints'], ['TeleOp hive', 'dcHivePoints'], ['Flower', 'dcFlowerPoints'], ['Garden', 'dcGardenPoints'], ['TeleOp park', 'dcParkPoints']] as [label, key]}
        <div class="match-scoring-row">
          <span class="match-scoring-label">{label}</span><span class="match-scoring-red">
            {scout.red[key] || 0}
          </span><span class="match-scoring-blue">{scout.blue[key] || 0}</span>
        </div>
      {/each}
    </section>
  {/if}
  {#if scout?.red && scout?.blue && !(red && blue && red.autoPoints != null)}
    {#if bonusFields.length}
      <section class="match-scoring-group">
        <h3 class="match-scoring-group-title">Ranking points</h3>
        <div class="match-scoring-row">
          <span class="match-scoring-label">Win / tie</span><span class="match-scoring-red">
            {match.redWins ? 3 : tie ? 1 : 0}
          </span><span class="match-scoring-blue">{match.blueWins ? 3 : tie ? 1 : 0}</span>
        </div>
        {#each bonusFields as bonus (bonus.label)}
          <div class="match-scoring-row">
            <span class="match-scoring-label">{bonus.label}</span><span class="match-scoring-red">
              {bonusEarned(scout.red, bonus.aliases) ? 1 : 0}
            </span><span class="match-scoring-blue">
              {bonusEarned(scout.blue, bonus.aliases) ? 1 : 0}
            </span>
          </div>
        {/each}
        <div class="match-scoring-row total">
          <span class="match-scoring-label">Total RP</span><strong class="match-scoring-red">
            {scoutRedRP}
          </strong><strong class="match-scoring-blue">{scoutBlueRP}</strong>
        </div>
      </section>
    {/if}
  {/if}
  <section style="margin-top:1rem">
    {#each [{ side: 'Red', members: redTeams }, { side: 'Blue', members: blueTeams }] as alliance (alliance.side)}
      <div
        class="section-label"
        style:color={alliance.side === 'Red' ? 'var(--alliance-red)' : 'var(--alliance-blue)'}
      >
        {alliance.side} alliance
      </div>
      {#each alliance.members as team (team.station)}
        {@const ranking = ranks[team.teamNumber]}
        <div class="md-team-row">
          <TeamChip
            {team}
            alliance={alliance.side.toLowerCase()}
            ourTeam={settings.team_number}
            onOpen={onTeam}
          />
          <button class="md-team-detail" type="button" onclick={() => onTeam(team.teamNumber)}>
            <strong>{team.teamName || team.teamNumber}</strong>
            <span>
              {team.station}{team.surrogate ? ' · Surrogate' : ''}{team.dq ? ' · DQ' : ''}
            </span>
          </button>
          {#if ranking}
            <span class="md-team-ranking">
              #{ranking.rank}<span>{ranking.wins}W–{ranking.losses}L</span><span>
                RP {ranking.sortOrder1?.toFixed(3) ?? '–'}
              </span>
            </span>
          {/if}
        </div>
      {/each}
    {/each}
  </section>
  {#if settings.advanced_predictions !== false && prediction.hasData}
    <section class="match-scoring-group" style="margin-top:1rem">
      <h3 class="match-scoring-group-title">
        OPR favoring{match.scoreRedFinal == null && prediction.winner !== 'Tie'
          ? ` · ${prediction.winner} favored ${prediction.confidence}%`
          : ''}
      </h3>
      {#each [{ key: 'auto', label: 'Auto' }, { key: 'teleop', label: 'TeleOp' }, { key: 'endgame', label: 'Endgame' }, { key: 'total', label: 'Total' }] as phase (phase.key)}
        <div class="match-scoring-row" class:total={phase.key === 'total'}>
          <span class="match-scoring-label">{phase.label}</span><span class="match-scoring-red">
            {number(prediction.comp[phase.key][0])}
          </span><span class="match-scoring-blue">{number(prediction.comp[phase.key][1])}</span>
        </div>
      {/each}
      <div style="color:var(--text3);font-size:.7rem;margin-top:.35rem">
        Alliance sums of FTCScout season npOPR by phase
      </div>
    </section>
  {/if}
  {#if match.scoreRedFinal == null}
    <div class="setting-hint">
      Scheduled: {formatTime(match.startTime)}{match.series != null
        ? ` · Field ${match.series + 1}`
        : ''}
    </div>
  {:else if match.scoreRedAuto != null || match.scoreBlueAuto != null}
    <div class="match-scoring-row" style="margin-top:.6rem">
      <span class="match-scoring-label">Auto</span><span class="match-scoring-red">
        {scoreValue(match.scoreRedAuto)}
      </span><span class="match-scoring-blue">{scoreValue(match.scoreBlueAuto)}</span>
    </div>
    {#if match.scoreRedFoul != null || match.scoreBlueFoul != null}<div class="match-scoring-row">
        <span class="match-scoring-label">Foul points committed</span><span
          class="match-scoring-red"
        >
          {scoreValue(match.scoreRedFoul)}
        </span><span class="match-scoring-blue">{scoreValue(match.scoreBlueFoul)}</span>
      </div>{/if}
  {/if}
  {#if match.actualStartTime}
    <div style="color:var(--text3);font-size:.7rem;margin-top:.5rem">
      Started: {formatTime(match.actualStartTime)}{match.postResultTime
        ? ` · Posted: ${formatTime(match.postResultTime)}`
        : ''}
    </div>
  {/if}
  {#if videoUrl}
    <a
      class="btn btn-secondary btn-sm"
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      style="margin-top:.75rem"
    >
      Watch match video
    </a>
  {/if}
</div>
