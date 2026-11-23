import { allianceFor } from './helpers.js';
import { matchOutcome } from './match-data.js';

/** Identical qualification metrics for the dashboard and any team profile. */
export function teamStatistics({ rank = null, matches = [], teamNumber, teamCount = 0, season }) {
  const played = matches.filter(
    (match) =>
      match.teams?.some((team) => Number(team.teamNumber) === Number(teamNumber)) &&
      match.scoreRedFinal != null &&
      match.scoreBlueFinal != null,
  );
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let scoreTotal = 0;
  let autoTotal = 0;
  let highMatch = null;
  let highScore = null;

  for (const match of played) {
    const outcome = matchOutcome(match, teamNumber);
    if (outcome === 'win') wins++;
    if (outcome === 'loss') losses++;
    if (outcome === 'tie') ties++;

    const red = allianceFor(match, teamNumber) === 'Red';
    const score = red ? match.scoreRedFinal : match.scoreBlueFinal;
    scoreTotal += score;
    autoTotal += (red ? match.scoreRedAuto : match.scoreBlueAuto) ?? 0;
    if (highScore == null || score > highScore) {
      highScore = score;
      highMatch = match;
    }
  }

  const playedCount = played.length;
  const averageScore = playedCount ? Math.round(scoreTotal / playedCount) : null;
  const averageAuto = playedCount ? Math.round(autoTotal / playedCount) : null;
  return {
    stats: [
      { id: 'rank', label: 'Rank', value: rank?.rank != null ? `#${rank.rank}` : '–' },
      {
        id: 'record',
        label: ties ? 'W–L–T' : 'W–L',
        value: `${wins}–${losses}${ties ? `–${ties}` : ''}`,
      },
      { id: 'rp', label: 'RP avg', value: rank?.sortOrder1?.toFixed(3) ?? '–' },
      { id: 'averageScore', label: 'Avg score', value: averageScore ?? '–' },
      { id: 'averageAuto', label: 'Avg Auto', value: averageAuto ?? '–' },
      { id: 'highScore', label: 'High score', value: highScore ?? '–' },
      { id: 'so2', label: 'SO₂', value: rank?.sortOrder2?.toFixed(2) ?? '–' },
      {
        id: 'matches',
        label: 'Counted / played',
        value:
          rank?.matchesCounted != null && rank.matchesPlayed != null
            ? `${rank.matchesCounted}/${rank.matchesPlayed}`
            : '–',
      },
      { id: 'dq', label: 'DQ', value: rank?.dq ?? '–' },
    ],
    context: {
      season,
      rank,
      teamCount,
      wins,
      losses,
      ties,
      playedCount,
      scoreTotal,
      autoTotal,
      averageScore,
      averageAuto,
      highScore,
      highMatch,
    },
  };
}
