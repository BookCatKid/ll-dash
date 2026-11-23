const test = require('node:test');
const assert = require('node:assert/strict');

const read = () => import('../frontend/ui/spa/lib/match-history.js');
const makeMatch = (matchNumber, redScore, blueScore, side = 'Red') => ({
  matchNumber,
  teams: [
    { teamNumber: side === 'Red' ? 3650 : 12345, station: 'Red1' },
    { teamNumber: side === 'Blue' ? 3650 : 12345, station: 'Blue1' },
  ],
  scoreRedFinal: redScore,
  scoreBlueFinal: blueScore,
  redWins: redScore != null && blueScore != null && redScore > blueScore,
  blueWins: redScore != null && blueScore != null && blueScore > redScore,
});

test('qualification results include every played match, not just the latest four', async () => {
  const { teamMatchHistory } = await read();
  const matches = [
    makeMatch(1, 16, 25),
    makeMatch(4, 27, 33),
    makeMatch(8, 15, 15),
    makeMatch(12, 55, 20, 'Blue'),
    makeMatch(17, 35, 38),
    makeMatch(20, 40, 55, 'Blue'),
    makeMatch(25, 25, 28),
    makeMatch(26, null, null),
  ];
  const results = teamMatchHistory(matches, 3650);
  assert.equal(results.length, 7);
  assert.deepEqual(
    results.map((result) => result.match.matchNumber),
    [25, 20, 17, 12, 8, 4, 1],
  );
  assert.equal(results[0].outcome, 'loss');
  assert.equal(results[1].outcome, 'win');
  assert.equal(results.find((result) => result.match.matchNumber === 8).outcome, 'tie');
  assert.equal(results[0].rp, null);
});

test('RP is only shown when its scoring record exists', async () => {
  const { teamMatchHistory } = await read();
  const match = makeMatch(6, 45, 30);
  const result = teamMatchHistory(
    [match],
    3650,
    {
      6: { red: { swarmRp: true, pollinator1Rp: true, pollinator2Rp: false } },
    },
    2026,
  )[0];
  assert.equal(result.rp, 5);
  assert.equal(result.ownScore, 45);
  assert.equal(result.opponentScore, 30);
});
