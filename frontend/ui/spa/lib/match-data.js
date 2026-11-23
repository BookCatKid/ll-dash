import { api } from './api.js';
import { allianceFor, computeRp, oprPrediction, teamsFor } from './helpers.js';

export async function loadMatchData(settings) {
  const season = Number(settings.active_season);
  const [scout, official, oprResult, fieldData] = await Promise.all([
    api.ftcEventScores(settings.active_event_code, season).catch(() => null),
    season === 2026 ? api.matches().catch(() => null) : null,
    api.ftcEventOprs(settings.active_event_code, season).catch(() => null),
    api.scheduleFields().catch(() => null),
  ]);

  const scores = Object.fromEntries(
    (scout?.matches || [])
      .filter(
        (match) => !match.tournamentLevel || ['Quals', 'qual'].includes(match.tournamentLevel),
      )
      .map((match) => [match.matchNum, { red: match.red, blue: match.blue }]),
  );

  for (const match of official?.matchScores || []) {
    const red = match.alliances?.find((alliance) => alliance.alliance === 'Red');
    const blue = match.alliances?.find((alliance) => alliance.alliance === 'Blue');
    if (match.matchNumber != null && red && blue) scores[match.matchNumber] = { red, blue };
  }

  const oprs = Object.fromEntries(
    (oprResult?.oprList || []).map((team) => [team.teamNumber, team]),
  );
  return { scores, oprs, fields: fieldData?.fieldsByMatch || {} };
}

export function matchOutcome(match, ourTeam) {
  const isParticipant = match?.teams?.some((team) => Number(team.teamNumber) === Number(ourTeam));
  if (!isParticipant || match.scoreRedFinal == null || match.scoreBlueFinal == null) {
    return null;
  }

  const ourAlliance = allianceFor(match, ourTeam);
  const ourScore = ourAlliance === 'Red' ? match.scoreRedFinal : match.scoreBlueFinal;
  const opposingScore = ourAlliance === 'Red' ? match.scoreBlueFinal : match.scoreRedFinal;
  if (ourScore === opposingScore) return 'tie';

  const winningAlliance = match.redWins ? 'Red' : match.blueWins ? 'Blue' : null;
  if (winningAlliance) return winningAlliance === ourAlliance ? 'win' : 'loss';

  return ourScore > opposingScore ? 'win' : 'loss';
}

export function matchMetrics(match, data, season) {
  const score = data?.scores?.[match.matchNumber];
  const prediction = oprPrediction(
    teamsFor(match, 'Red'),
    teamsFor(match, 'Blue'),
    data?.oprs || {},
  );
  const played = match.scoreRedFinal != null && match.scoreBlueFinal != null;
  const tied = played && match.scoreRedFinal === match.scoreBlueFinal;
  const redRP = played ? computeRp(score?.red, match.redWins, tied, season) : null;
  const blueRP = played ? computeRp(score?.blue, match.blueWins, tied, season) : null;
  const hiveTips = (alliance) => {
    if (alliance?.tips != null) return alliance.tips;
    if (alliance?.autoHiveTips != null || alliance?.teleopHiveTips != null) {
      return (alliance.autoHiveTips ?? 0) + (alliance.teleopHiveTips ?? 0);
    }
    return null;
  };
  const redTips = hiveTips(score?.red);
  const blueTips = hiveTips(score?.blue);
  const tips =
    Number(season) === 2026 && redTips != null && blueTips != null
      ? { red: redTips, blue: blueTips }
      : null;
  return { prediction, redRP, blueRP, tips };
}

export function fieldLabel(field) {
  if (field == null || field === '') return null;
  if (Number.isInteger(Number(field)) && Number(field) > 0) return `Field ${Number(field)}`;
  return typeof field === 'string' ? field : null;
}
