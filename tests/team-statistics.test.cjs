const test = require('node:test');
const assert = require('node:assert/strict');

const loadStatistics = () => import('../frontend/ui/spa/lib/team-statistics.js');
const rank = {
  rank: 17,
  sortOrder1: 0.3,
  sortOrder2: 13.7,
  matchesCounted: 10,
  matchesPlayed: 6,
  dq: 0,
};
const createMatch = (number, ownSide, ownScore, otherScore, auto, complete = true) => ({
  matchNumber: number,
  teams: [
    { teamNumber: ownSide === 'Red' ? 3650 : 1234, station: 'Red1' },
    { teamNumber: ownSide === 'Red' ? 1234 : 3650, station: 'Blue1' },
  ],
  scoreRedFinal: complete ? (ownSide === 'Red' ? ownScore : otherScore) : null,
  scoreBlueFinal: complete ? (ownSide === 'Blue' ? ownScore : otherScore) : null,
  scoreRedAuto: ownSide === 'Red' ? auto : 3,
  scoreBlueAuto: ownSide === 'Blue' ? auto : 3,
  redWins: complete && (ownSide === 'Red' ? ownScore > otherScore : ownScore < otherScore),
  blueWins: complete && (ownSide === 'Blue' ? ownScore > otherScore : ownScore < otherScore),
});

test('both screens use the same nine team statistics, in the same order', async () => {
  const { teamStatistics } = await loadStatistics();
  const matches = [
    createMatch(1, 'Red', 55, 20, 6),
    createMatch(2, 'Blue', 14, 27, 8),
    createMatch(3, 'Red', 23, 23, 4),
    createMatch(4, 'Blue', 35, 10, 10, false),
  ];
  const data = teamStatistics({ rank, matches, teamNumber: 3650, teamCount: 17, season: 2026 });
  assert.deepEqual(
    data.stats.map((stat) => stat.id),
    ['rank', 'record', 'rp', 'averageScore', 'averageAuto', 'highScore', 'so2', 'matches', 'dq'],
  );
  assert.deepEqual(
    data.stats.map((stat) => stat.value),
    ['#17', '1–1–1', '0.300', 31, 6, 55, '13.70', '10/6', 0],
  );
  assert.deepEqual(data.context, {
    season: 2026,
    rank,
    teamCount: 17,
    wins: 1,
    losses: 1,
    ties: 1,
    playedCount: 3,
    scoreTotal: 92,
    autoTotal: 18,
    averageScore: 31,
    averageAuto: 6,
    highScore: 55,
    highMatch: matches[0],
  });
});

test('matches involving other teams and unplayed matches are excluded', async () => {
  const { teamStatistics } = await loadStatistics();
  const other = createMatch(1, 'Red', 90, 20, 20);
  other.teams = other.teams.map((member) => ({ ...member, teamNumber: member.teamNumber + 90000 }));
  const data = teamStatistics({
    rank: null,
    matches: [other, createMatch(2, 'Blue', 35, 10, 9, false)],
    teamNumber: 3650,
    teamCount: 17,
    season: 2026,
  });
  assert.deepEqual(
    data.stats.map((stat) => stat.value),
    ['–', '0–0', '–', '–', '–', '–', '–', '–', '–'],
  );
  assert.equal(data.context.playedCount, 0);
  assert.equal(data.context.highMatch, null);
});
