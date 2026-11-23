const assert = require('node:assert/strict');
const test = require('node:test');

async function helpers() {
  return import('../frontend/ui/spa/lib/helpers.js');
}

test('robot actions follow their official alliance stations, not team array order', async () => {
  const { robotStationRows } = await helpers();
  const match = {
    teams: [
      { station: 'Blue2', teamNumber: 39053 },
      { station: 'Red2', teamNumber: 3650 },
      { station: 'Blue1', teamNumber: 6016 },
      { station: 'Red1', teamNumber: 26471 },
    ],
  };
  const scores = {
    red: {
      autoRobot1Leave: true,
      autoRobot2Leave: false,
      autoRobot1Park: false,
      autoRobot2Park: true,
      teleopRobot1Park: true,
      teleopRobot2Park: false,
    },
    blue: {
      autoRobot1Leave: false,
      autoRobot2Leave: true,
      autoRobot1Park: true,
      autoRobot2Park: false,
      teleopRobot1Park: false,
      teleopRobot2Park: true,
    },
  };
  const rows = robotStationRows(match, scores);
  assert.deepEqual(
    rows.map((row) => row.team.teamNumber),
    [26471, 3650, 6016, 39053],
  );
  assert.deepEqual(
    rows.map((row) => [row.leftWall, row.autoPark, row.teleopPark]),
    [
      [true, false, true],
      [false, true, false],
      [false, true, false],
      [true, false, true],
    ],
  );
});

test('unknown stations stay unknown rather than receiving a fabricated team', async () => {
  const { robotStationRows } = await helpers();
  const rows = robotStationRows({ teams: [{ station: 'Red1', teamNumber: 3650 }] }, {});
  assert.equal(rows[0].team.teamNumber, 3650);
  assert.equal(rows[1].team, null);
  assert.equal(rows[1].leftWall, null);
});

test('ranking points accept FIRST and FTCScout field names', async () => {
  const { computeRp } = await helpers();
  assert.equal(
    computeRp({ swarmRP: true, pollinator1RP: false, pollinator2RP: true }, true, false, 2026),
    5,
  );
  assert.equal(
    computeRp({ swarmRp: true, pollinator1Rp: false, pollinator2Rp: true }, true, false, 2026),
    5,
  );
  assert.equal(
    computeRp({ movementRp: true, goalRp: false, patternRp: true }, false, true, 2025),
    3,
  );
  assert.equal(computeRp(null, false, false, 2026), null);
});

test('OPR predictions preserve the established formula', async () => {
  const { oprPrediction } = await helpers();
  const red = [{ teamNumber: 3650 }, { teamNumber: 26471 }];
  const blue = [{ teamNumber: 6016 }, { teamNumber: 39053 }];
  const oprs = {
    3650: { opr: 12.12 },
    26471: { opr: 10.49 },
    6016: { opr: 6.42 },
    39053: { opr: 7.27 },
  };
  const result = oprPrediction(red, blue, oprs);
  assert.equal(result.winner, 'Red');
  assert.equal(result.red.toFixed(2), '22.61');
  assert.equal(result.blue.toFixed(2), '13.69');
  assert.equal(result.confidence, 61);
});

test('OPR phase components preserve the legacy prediction breakdown', async () => {
  const { oprPrediction } = await helpers();
  const result = oprPrediction([{ teamNumber: 3650 }], [{ teamNumber: 6016 }], {
    3650: { opr: 20, autoOpr: 7, dcOpr: 10, egOpr: 3 },
    6016: { opr: 10, autoOpr: 3, dcOpr: 6, egOpr: 1 },
  });
  assert.deepEqual(result.comp, {
    total: [20, 10],
    auto: [7, 3],
    teleop: [10, 6],
    endgame: [3, 1],
  });
  assert.equal(result.redOPR, 20);
  assert.equal(result.blueOPR, 10);
  assert.equal(result.redWinProb, 0.5 + 10 / (30 * 0.4) / 2);
});

test('win and loss labels are only assigned to our completed matches', async () => {
  const { matchOutcome } = await import('../frontend/ui/spa/lib/match-data.js');
  const match = {
    teams: [
      { station: 'Red1', teamNumber: 3650 },
      { station: 'Blue1', teamNumber: 6016 },
    ],
    scoreRedFinal: 28,
    scoreBlueFinal: 32,
    redWins: false,
    blueWins: true,
  };
  assert.equal(matchOutcome(match, 3650), 'loss');
  assert.equal(matchOutcome(match, 6016), 'win');
  assert.equal(matchOutcome(match, 12345), null);
  assert.equal(
    matchOutcome({ ...match, scoreBlueFinal: 28, redWins: false, blueWins: false }, 3650),
    'tie',
  );
  assert.equal(matchOutcome({ ...match, scoreBlueFinal: null }, 3650), null);
});

test('official 2026 scoring exposes earned ranking points and hive tips', async () => {
  const { matchMetrics } = await import('../frontend/ui/spa/lib/match-data.js');
  const match = {
    matchNumber: 25,
    teams: [
      { station: 'Red1', teamNumber: 3650 },
      { station: 'Blue1', teamNumber: 6016 },
    ],
    scoreRedFinal: 27,
    scoreBlueFinal: 34,
    redWins: false,
    blueWins: true,
  };
  const result = matchMetrics(
    match,
    {
      scores: {
        25: {
          red: {
            swarmRP: false,
            pollinator1RP: true,
            pollinator2RP: true,
            autoHiveTips: 1,
            teleopHiveTips: 2,
          },
          blue: {
            swarmRP: true,
            pollinator1RP: false,
            pollinator2RP: true,
            autoHiveTips: 2,
            teleopHiveTips: 3,
          },
        },
      },
      oprs: { 3650: { opr: 24 }, 6016: { opr: 30 } },
    },
    2026,
  );
  assert.equal(result.redRP, 2);
  assert.equal(result.blueRP, 5);
  assert.deepEqual(result.tips, { red: 3, blue: 5 });
  assert.equal(result.prediction.winner, 'Blue');
});

test('missing hive tip data never implies a zero score', async () => {
  const { matchMetrics, fieldLabel } = await import('../frontend/ui/spa/lib/match-data.js');
  const match = {
    matchNumber: 1,
    teams: [{ station: 'Red1', teamNumber: 3650 }],
    scoreRedFinal: 10,
    scoreBlueFinal: 10,
  };
  const scores = { scores: { 1: { red: { swarmRp: true }, blue: { swarmRp: false } } } };
  assert.equal(matchMetrics(match, scores, 2026).tips, null);
  assert.equal(fieldLabel(1), 'Field 1');
  assert.equal(fieldLabel('2'), 'Field 2');
  assert.equal(fieldLabel(null), null);
});
