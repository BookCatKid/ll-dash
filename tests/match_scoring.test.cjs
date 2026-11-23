const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../frontend/static/js/pages/match-scoring.js'),
  'utf8',
);

const match = {
  redWins: false,
  blueWins: true,
  teams: [
    {station: 'Blue2', teamNumber: 39053, teamName: 'Bishbots Assemble'},
    {station: 'Red2', teamNumber: 3650, teamName: 'Limited Liability'},
    {station: 'Red1', teamNumber: 26471, teamName: 'Steady State'},
    {station: 'Blue1', teamNumber: 6016, teamName: 'Ironwolves'},
  ],
};

const score = {
  red: {
    autoPoints: 5,
    autoRobot1Leave: true,
    autoRobot2Leave: false,
    autoRobot1Park: false,
    autoRobot2Park: true,
    teleopRobot1Park: true,
    teleopRobot2Park: false,
  },
  blue: {
    autoPoints: 8,
    autoRobot1Leave: false,
    autoRobot2Leave: true,
    autoRobot1Park: true,
    autoRobot2Park: false,
    teleopRobot1Park: false,
    teleopRobot2Park: true,
  },
};

function render(currentMatch = match, currentScore = score) {
  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const context = {
    window: {_teamNames: {}},
    escHtml: escapeHtml,
    computeMatchRP: () => 0,
    teamChipNamed: (team, alliance) => (
      `<span class="team-chip ${alliance} clickable-chip" data-team="${team.teamNumber}">` +
      `${team.teamNumber}</span>`
    ),
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return vm.runInContext(
    `renderBioBuzzMatchScoring(${JSON.stringify(currentScore)}, ${JSON.stringify(currentMatch)})`,
    context,
  );
}

function teamRow(markup, station) {
  const escapedStation = station.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = markup.match(
    new RegExp(`<tr class="match-scoring-robot-row" data-station="${escapedStation}">([\\s\\S]*?)</tr>`),
  );
  assert.ok(row, `Missing station ${station}`);
  return row[1];
}

test('robot actions are attributed by station, not array position', () => {
  const markup = render();
  const expectations = [
    ['Red1', 26471, ['Yes', 'No', 'Yes']],
    ['Red2', 3650, ['No', 'Yes', 'No']],
    ['Blue1', 6016, ['No', 'Yes', 'No']],
    ['Blue2', 39053, ['Yes', 'No', 'Yes']],
  ];

  for (const [station, teamNumber, outcomes] of expectations) {
    const row = teamRow(markup, station);
    assert.match(row, new RegExp(`data-team="${teamNumber}"`));
    const statuses = [...row.matchAll(/class="match-scoring-robot-result [^"]+">(.*?)<\/span>/g)]
      .map(result => result[1]);
    assert.deepEqual(statuses, outcomes, `${station}: incorrect action assignment`);
  }
  assert.equal((markup.match(/class="match-scoring-robot-row"/g) || []).length, 4);
  assert.doesNotMatch(markup, /Robot [12]/);
});

test('unknown stations do not invent a team identity', () => {
  const markup = render({...match, teams: match.teams.filter(team => team.station !== 'Red2')});
  assert.match(teamRow(markup, 'Red2'), /Team unavailable/);
  assert.doesNotMatch(teamRow(markup, 'Red2'), /data-team="3650"/);
});

test('team names are escaped in score details', () => {
  const malicious = {...match, teams: match.teams.map(team => ({
    ...team,
    teamName: '<img src=x onerror=alert(1)>',
  }))};
  const markup = render(malicious);
  assert.doesNotMatch(markup, /<img/);
  assert.match(markup, /&lt;img/);
});
