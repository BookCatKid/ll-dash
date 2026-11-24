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
  import { matchOutcome, fieldLabel } from '../lib/match-data.js';
  import { matchTimeLabel } from '../lib/match-timing.js';
  import MatchAlliances from './MatchAlliances.svelte';
  import TeamIdentity from './TeamIdentity.svelte';

  let { match, settings, onTeam } = $props();
  let now = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  let fetchedOfficial = $state(null);
  let fetchedScout = $state(null);
  let fetchedOprs = $state(null);
  let ranks = $state({});
  const hasPreloadedOfficial = $derived(
    Number(settings.active_season) === 2026 && match.preloadedScore?.red?.autoPoints != null,
  );
  const official = $derived(
    fetchedOfficial ?? (hasPreloadedOfficial ? match.preloadedScore : null),
  );
  const scout = $derived(fetchedScout ?? match.preloadedScore ?? null);
  const oprs = $derived(fetchedOprs ?? match.preloadedOprs ?? {});
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
  const outcome = $derived(matchOutcome(match, settings.team_number));
  const displayedRedRP = $derived(redRP ?? scoutRedRP);
  const displayedBlueRP = $derived(blueRP ?? scoutBlueRP);
  const summary = $derived(
    [
      {
        label: 'Auto',
        red: red?.autoPoints ?? match.scoreRedAuto,
        blue: blue?.autoPoints ?? match.scoreBlueAuto,
      },
      { label: 'TeleOp', red: red?.teleopPoints, blue: blue?.teleopPoints },
      {
        label: 'Foul pts',
        red: blue?.foulPointsCommitted ?? match.scoreBlueFoul,
        blue: red?.foulPointsCommitted ?? match.scoreRedFoul,
      },
      { label: 'RP', red: displayedRedRP, blue: displayedBlueRP },
    ].filter((value) => value.red != null && value.blue != null),
  );
  function bonusEarned(alliance, aliases) {
    return aliases.some((alias) => alliance?.[alias] === true);
  }
  const robotRows = $derived(robotStationRows(match, official));

  function countLabel(value, label) {
    return `${scoreValue(value)} ${label}`;
  }

  /**
   * @typedef {object} ScoringRow
   * @property {string} label
   * @property {number | null | undefined} red
   * @property {number | null | undefined} blue
   * @property {boolean} [points]
   * @property {string} [redDetail]
   * @property {string} [blueDetail]
   * @property {'leftWall' | 'autoPark' | 'teleopPark'} [robotAction]
   */

  /** @returns {ScoringRow} */
  const metric = (label, key, options = {}) => ({
    label,
    red: red?.[key],
    blue: blue?.[key],
    ...options,
  });

  const points = (label, key, options = {}) => metric(label, key, { points: true, ...options });
  const hasSummary = (label) => summary.some((item) => item.label === label);

  /** @type {{name: string, rows: ScoringRow[]}[]} */
  const phases = $derived([
    {
      name: 'Autonomous',
      rows: [
        points('Leave wall', 'autoLeavePoints', { robotAction: 'leftWall' }),
        points('Park', 'autoParkPoints', { robotAction: 'autoPark' }),
        points('Hive', 'autoHivePoints', {
          redDetail: countLabel(red?.autoHiveTips, 'tips'),
          blueDetail: countLabel(blue?.autoHiveTips, 'tips'),
        }),
        ...(!hasSummary('Auto') ? [metric('Auto total', 'autoPoints')] : []),
      ],
    },
    {
      name: 'TeleOp',
      rows: [
        points('Hive', 'teleopHivePoints', {
          redDetail: `${countLabel(red?.teleopHivePollenNectar, 'pieces')} · ${countLabel(red?.teleopHiveTips, 'tips')}`,
          blueDetail: `${countLabel(blue?.teleopHivePollenNectar, 'pieces')} · ${countLabel(blue?.teleopHiveTips, 'tips')}`,
        }),
        points('Flower', 'teleopFlowerPoints'),
        points('Garden', 'teleopGardenPoints', {
          redDetail: countLabel(red?.teleopGardenPollenNectar, 'pieces'),
          blueDetail: countLabel(blue?.teleopGardenPollenNectar, 'pieces'),
        }),
        points('Park', 'teleopParkPoints', { robotAction: 'teleopPark' }),
        ...(!hasSummary('TeleOp') ? [metric('TeleOp total', 'teleopPoints')] : []),
      ],
    },
    {
      name: 'Score',
      rows: [
        metric('Points scored', 'preFoulTotal'),
        {
          label: 'Foul points received',
          points: true,
          red: blue?.foulPointsCommitted,
          blue: red?.foulPointsCommitted,
          redDetail: `Opponent fouls: ${countLabel(blue?.minorFouls, 'minor')} · ${countLabel(blue?.majorFouls, 'major')}`,
          blueDetail: `Opponent fouls: ${countLabel(red?.minorFouls, 'minor')} · ${countLabel(red?.majorFouls, 'major')}`,
        },
        ...(red?.totalPoints !== match.scoreRedFinal || blue?.totalPoints !== match.scoreBlueFinal
          ? [metric('Final score', 'totalPoints')]
          : []),
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
        ...bonusFields.map((bonus) => ({
          label: bonus.label,
          red: bonusEarned(red, bonus.aliases) ? 1 : 0,
          blue: bonusEarned(blue, bonus.aliases) ? 1 : 0,
        })),
        ...(!hasSummary('RP') ? [{ label: 'Total RP', red: redRP, blue: blueRP }] : []),
      ],
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
    const hasPreloadedScout =
      match.preloadedScore?.red != null && match.preloadedScore?.blue != null;
    const hasPreloadedOprs = Object.keys(match.preloadedOprs ?? {}).length > 0;
    Promise.all([
      season === 2026 && !hasPreloadedOfficial ? api.matches().catch(() => null) : null,
      !hasPreloadedScout
        ? api.ftcEventScores(settings.active_event_code, season).catch(() => null)
        : null,
      !hasPreloadedOprs
        ? api.ftcEventOprs(settings.active_event_code, season).catch(() => null)
        : null,
      api.rankings().catch(() => null),
    ]).then(([scoreData, scoutData, oprData, rankData]) => {
      if (!active) return;
      const found = scoreData?.matchScores?.find((m) => m.matchNumber === match.matchNumber);
      if (found)
        fetchedOfficial = {
          red: found.alliances?.find((a) => a.alliance === 'Red'),
          blue: found.alliances?.find((a) => a.alliance === 'Blue'),
        };
      const matchScore = scoutData?.matches?.find((m) => m.matchNum === match.matchNumber);
      if (matchScore) fetchedScout = matchScore;
      if (oprData) {
        fetchedOprs = Object.fromEntries(
          (oprData.oprList || []).map((entry) => [entry.teamNumber, entry]),
        );
      }
      ranks = Object.fromEntries(
        (rankData?.rankings || rankData?.Rankings || []).map((entry) => [entry.teamNumber, entry]),
      );
    });
    return () => {
      active = false;
    };
  });
</script>

<div class="match-detail">
  {#if outcome}
    <div
      class="match-detail-result"
      class:won={outcome === 'win'}
      class:lost={outcome === 'loss'}
      class:tied={outcome === 'tie'}
    >
      {outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Tie'}
    </div>
  {/if}
  <MatchAlliances {match} teamNumber={settings.team_number} {onTeam} {ranks} />

  {#if match.scoreRedFinal == null}
    <div class="match-detail-scheduled">
      {matchTimeLabel(match, now)}{fieldLabel(match.field) ? ` · ${fieldLabel(match.field)}` : ''}
    </div>
  {:else if summary.length}
    <div class="match-detail-summary">
      {#each summary as item (item.label)}
        <div class="match-detail-stat">
          <span class="match-detail-stat-label">{item.label}</span>
          <span class="match-detail-stat-values">
            <strong class="match-scoring-red">{item.red}</strong><span>:</span><strong
              class="match-scoring-blue"
            >
              {item.blue}
            </strong>
          </span>
        </div>
      {/each}
    </div>
  {/if}

  {#if red && blue && red.autoPoints != null}
    {#each phases as phase (phase.name)}
      <details class="match-detail-expand">
        <summary>
          {phase.name === 'Score' ? 'Score calculation' : `${phase.name} breakdown`}
        </summary>
        <div class="match-detail-table match-detail-breakdown">
          <div class="match-scoring-columns">
            <span></span><strong>Red</strong><strong>Blue</strong>
          </div>
          {#each phase.rows as item (item.label)}
            <div
              class="match-scoring-row"
              class:total={item.label.includes('total') || item.label === 'Total RP'}
              class:final={item.label === 'Final score'}
            >
              <span class="match-scoring-label">{item.label}</span>
              {#each ['Red', 'Blue'] as side}
                {@const value = side === 'Red' ? item.red : item.blue}
                {@const detail = side === 'Red' ? item.redDetail : item.blueDetail}
                <div class="match-scoring-cell">
                  <span class="match-scoring-{side.toLowerCase()}">
                    {scoreValue(value)}{item.points && value != null ? ' pts' : ''}
                  </span>
                  {#if detail}
                    <span class="match-scoring-secondary">{detail}</span>
                  {/if}
                  {#if item.robotAction}
                    <div class="match-scoring-robot-actions">
                      {#each robotRows.filter((row) => row.side === side) as row (row.station)}
                        {@const result = row[item.robotAction]}
                        <div class="match-scoring-robot-action" data-station={row.station}>
                          {#if row.team}
                            <TeamIdentity
                              team={row.team}
                              alliance={row.side.toLowerCase()}
                              ourTeam={settings.team_number}
                              onOpen={onTeam}
                            />
                          {:else}
                            <span>Team unavailable</span>
                          {/if}
                          <span class="match-scoring-robot-result" class:yes={result === true}>
                            {result == null ? '–' : result ? 'Yes' : 'No'}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </details>
    {/each}
    <details class="match-detail-expand">
      <summary>Flower contents</summary>
      <div class="match-scoring-flower-list">
        {#each flowers as flower (flower.key)}
          <div class="match-scoring-flower">
            <div class="match-scoring-flower-heading"><strong>{flower.label}</strong></div>
            <div class="match-scoring-flower-pieces">
              {#if !red?.[flower.key]?.length}<span class="match-scoring-empty">Empty</span>
              {:else}
                {#each red[flower.key] as piece, index}
                  <span
                    class="match-scoring-piece"
                    class:red={piece === 'RED_NECTAR'}
                    class:blue={piece === 'BLUE_NECTAR'}
                    class:pollen={piece === 'POLLEN'}
                  >
                    {pieceLabels[piece] || piece}{index < red[flower.key].length - 1 ? ', ' : ''}
                  </span>
                {/each}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </details>
  {:else if scout?.red && scout?.blue}
    {#if scout.red.autoHivePoints != null}
      <details class="match-detail-expand">
        <summary>Scoring breakdown</summary>
        <div class="match-detail-table">
          <div class="match-scoring-columns">
            <span></span><strong>Red</strong><strong>Blue</strong>
          </div>
          {#each [['Auto hive', 'autoHivePoints'], ['TeleOp hive', 'dcHivePoints'], ['Flower', 'dcFlowerPoints'], ['Garden', 'dcGardenPoints'], ['TeleOp park', 'dcParkPoints']] as [label, key]}
            <div class="match-scoring-row">
              <span class="match-scoring-label">{label}</span><span class="match-scoring-red">
                {scoreValue(scout.red[key])}
              </span><span class="match-scoring-blue">{scoreValue(scout.blue[key])}</span>
            </div>
          {/each}
        </div>
      </details>
    {/if}
    {#if bonusFields.length}
      <details class="match-detail-expand">
        <summary>Ranking points breakdown</summary>
        <div class="match-detail-table">
          <div class="match-scoring-columns">
            <span></span><strong>Red</strong><strong>Blue</strong>
          </div>
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
            <span class="match-scoring-label">Total RP</span><span class="match-scoring-red">
              {scoreValue(scoutRedRP)}
            </span><span class="match-scoring-blue">{scoreValue(scoutBlueRP)}</span>
          </div>
        </div>
      </details>
    {/if}
  {/if}

  {#if settings.advanced_predictions !== false && prediction.hasData}
    <details class="match-detail-expand" open={match.scoreRedFinal == null}>
      <summary>
        OPR{match.scoreRedFinal == null
          ? ` · ${prediction.winner === 'Tie' ? 'Toss-up' : `${prediction.winner} favored ${prediction.confidence}%`}`
          : ''}
      </summary>
      <div class="match-detail-table">
        <div class="match-scoring-columns">
          <span></span><strong>Red</strong><strong>Blue</strong>
        </div>
        {#each [{ key: 'auto', label: 'Auto' }, { key: 'teleop', label: 'TeleOp' }, { key: 'endgame', label: 'Endgame' }, { key: 'total', label: 'Total' }] as phase (phase.key)}
          <div class="match-scoring-row" class:total={phase.key === 'total'}>
            <span class="match-scoring-label">{phase.label}</span><span class="match-scoring-red">
              {number(prediction.comp[phase.key][0])}
            </span><span class="match-scoring-blue">{number(prediction.comp[phase.key][1])}</span>
          </div>
        {/each}
      </div>
    </details>
  {/if}
  {#if match.actualStartTime}
    <div class="match-detail-time">
      Started {formatTime(match.actualStartTime)}{match.postResultTime
        ? ` · Posted ${formatTime(match.postResultTime)}`
        : ''}
    </div>
  {/if}
  {#if videoUrl}<a
      class="btn btn-secondary btn-sm"
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      style="margin-top:.75rem"
    >
      Watch match video
    </a>{/if}
</div>
