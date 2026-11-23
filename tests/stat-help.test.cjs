const test = require('node:test');
const assert = require('node:assert/strict');

const helpModule = () => import('../frontend/ui/spa/lib/stat-help.js');

const context = {
  season: 2026,
  rank: {
    rank: 17,
    sortOrder1: 0.3,
    sortOrder2: 13.7,
    matchesCounted: 10,
    matchesPlayed: 6,
    dq: 0,
  },
  teamCount: 17,
  wins: 1,
  losses: 5,
  ties: 0,
  playedCount: 6,
  scoreTotal: 162,
  autoTotal: 36,
  averageScore: 27,
  averageAuto: 6,
  highScore: 55,
  highMatch: { matchNumber: 15 },
};

test('all nine dashboard metrics have complete contextual explanations', async () => {
  const { statHelp } = await helpModule();
  const metricIds = [
    'rank',
    'record',
    'rp',
    'averageScore',
    'averageAuto',
    'highScore',
    'so2',
    'matches',
    'dq',
  ];

  assert.deepEqual(Object.keys(statHelp), metricIds);
  for (const id of metricIds) {
    const help = statHelp[id];
    assert.ok(help.title);
    assert.ok(help.description);
    assert.ok(help.calculation);
    assert.ok(help.example(context));
    assert.equal(help.details.length, 2);

    for (const detail of help.details) {
      assert.ok(detail.title);
      assert.ok(detail.text(context));
    }
  }
});

test('official ranking explanations preserve the counted-match denominator', async () => {
  const { statHelp } = await helpModule();

  assert.match(statHelp.rp.example(context), /3 RP ÷ 10 counted matches = 0\.300/);
  assert.match(statHelp.so2.example(context), /137 non-foul points ÷ 10 counted matches = 13\.70/);
  assert.match(statHelp.matches.example(context), /4 zero-valued entries/);
  assert.match(statHelp.dq.example(context), /^0 official disqualifications recorded/);
});

test('match statistics explain alliance results and provide the actual calculation', async () => {
  const { statHelp } = await helpModule();

  assert.match(statHelp.averageScore.example(context), /162 points ÷ 6 matches ≈ 27/);
  assert.match(statHelp.averageAuto.example(context), /36 Auto points ÷ 6 matches ≈ 6/);
  assert.match(statHelp.highScore.example(context), /55 points in qualification match Q15/);
  assert.match(statHelp.record.example(context), /1 win, 5 losses/);
  assert.match(
    statHelp.averageScore.details[0].text(context),
    /shared by two robots/,
  );
});
