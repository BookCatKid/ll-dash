import { allianceFor, computeRp } from './helpers.js';
import { matchOutcome } from './match-data.js';

/** Build qualification results without inventing scores or ranking points. */
export function teamMatchHistory(matches, teamNumber, matchScores = {}, season = 2026) {
  return matches
    .filter(
      (match) =>
        match.teams?.some((team) => Number(team.teamNumber) === Number(teamNumber)) &&
        match.scoreRedFinal != null &&
        match.scoreBlueFinal != null,
    )
    .map((match) => {
      const side = allianceFor(match, teamNumber);
      const outcome = matchOutcome(match, teamNumber);
      const entry = matchScores[match.matchNumber];
      const alliance = entry?.[side.toLowerCase()];
      return {
        match,
        side,
        outcome,
        ownScore: side === 'Red' ? match.scoreRedFinal : match.scoreBlueFinal,
        opponentScore: side === 'Red' ? match.scoreBlueFinal : match.scoreRedFinal,
        rp: alliance ? computeRp(alliance, outcome === 'win', outcome === 'tie', season) : null,
      };
    })
    .sort((first, second) => second.match.matchNumber - first.match.matchNumber);
}
