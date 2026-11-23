export const formatTime = (value) => {
  if (!value) return '–';
  try {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '–';
  }
};

export function teamsFor(match, side) {
  return (match?.teams || []).filter((team) => team.station?.startsWith(side));
}

export function isOurMatch(match, teamNumber) {
  return match?.teams?.some((team) => Number(team.teamNumber) === Number(teamNumber));
}

export function allianceFor(match, teamNumber) {
  return match?.teams
    ?.find((team) => Number(team.teamNumber) === Number(teamNumber))
    ?.station?.startsWith('Red')
    ? 'Red'
    : 'Blue';
}

export function computeRp(alliance, won, tie = false, season = 2026) {
  if (!alliance) return null;
  const bonuses =
    Number(season) === 2026
      ? [
          ['swarmRp', 'swarmRP'],
          ['pollinator1Rp', 'pollinator1RP'],
          ['pollinator2Rp', 'pollinator2RP'],
        ]
      : [
          ['movementRp', 'movementRP', 'movementRankingPoint', 'MovementRp'],
          ['goalRp', 'goalRP', 'goalRankingPoint', 'GoalRp'],
          ['patternRp', 'patternRP', 'patternRankingPoint', 'PatternRp'],
        ];
  return (
    (won ? 3 : tie ? 1 : 0) +
    bonuses.filter((fields) => fields.some((field) => alliance[field] === true)).length
  );
}

export function oprPrediction(redTeams, blueTeams, oprs) {
  const components = {
    total: 'opr',
    auto: 'autoOpr',
    teleop: 'dcOpr',
    endgame: 'egOpr',
  };
  const sum = (teams, key) =>
    teams.reduce((total, team) => {
      const number = typeof team === 'number' ? team : team.teamNumber;
      return total + (oprs?.[number]?.[key] || 0);
    }, 0);
  const comp = Object.fromEntries(
    Object.entries(components).map(([phase, key]) => [
      phase,
      [sum(redTeams, key), sum(blueTeams, key)],
    ]),
  );
  const [red, blue] = comp.total;
  const diff = red - blue;
  const rawConfidence = Math.min(Math.abs(diff) / (Math.max(red + blue, 1) * 0.4), 1);
  return {
    red,
    blue,
    redOPR: red,
    blueOPR: blue,
    diff,
    comp,
    winner: diff > 0 ? 'Red' : diff < 0 ? 'Blue' : 'Tie',
    confidence: Math.round(rawConfidence * 100),
    redWinProb: 0.5 + ((diff >= 0 ? 1 : -1) * rawConfidence) / 2,
    hasData: red > 0 || blue > 0,
  };
}

export function number(value, decimals = 1) {
  return value == null || !Number.isFinite(Number(value)) ? '–' : Number(value).toFixed(decimals);
}

export function robotStationRows(match, score) {
  return ['Red', 'Blue'].flatMap((side) =>
    [1, 2].map((stationNumber) => {
      const station = `${side}${stationNumber}`;
      const team = match?.teams?.find((member) => member.station === station) || null;
      const alliance = side === 'Red' ? score?.red : score?.blue;
      return {
        station,
        side,
        team,
        leftWall: alliance?.[`autoRobot${stationNumber}Leave`] ?? null,
        autoPark: alliance?.[`autoRobot${stationNumber}Park`] ?? null,
        teleopPark: alliance?.[`teleopRobot${stationNumber}Park`] ?? null,
      };
    }),
  );
}
