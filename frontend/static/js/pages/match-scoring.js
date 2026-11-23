// Official BIOBUZZ score details. The FTC Events API returns an alliance score
// record for each color, plus a shared snapshot of the field's four flowers.

function matchScoreValue(value) {
  return value == null ? '–' : escHtml(String(value));
}

function matchScoreRow(label, red, blue, className = '') {
  return `<div class="match-scoring-row ${className}">
    <span class="match-scoring-label">${escHtml(label)}</span>
    <span class="match-scoring-red">${matchScoreValue(red)}</span>
    <span class="match-scoring-blue">${matchScoreValue(blue)}</span>
  </div>`;
}

function matchScoreGroup(title, rows) {
  return `<section class="match-scoring-group">
    <h3 class="match-scoring-group-title">${escHtml(title)}</h3>
    ${rows.join('')}
  </section>`;
}

function matchScoreRobotValue(result) {
  const status = result == null ? 'Unknown' : result ? 'Yes' : 'No';
  const state = result == null ? 'unknown' : result ? 'yes' : 'no';
  return `<span class="match-scoring-robot-result ${state}">${status}</span>`;
}

function matchScoreRobotActions(score, match) {
  const rows = ['Red', 'Blue'].flatMap(side => [1, 2].map(stationNumber => {
    const station = `${side}${stationNumber}`;
    const team = match.teams?.find(entry => entry.station === station);
    const alliance = side === 'Red' ? score.red : score.blue;
    const name = team?.teamName || window._teamNames?.[team?.teamNumber] || '';
    const identity = team?.teamNumber
      ? `${teamChipNamed({...team, teamName: name}, side.toLowerCase())}
        ${name ? `<span class="match-scoring-robot-name">${escHtml(name)}</span>` : ''}`
      : 'Team unavailable';

    return `<tr class="match-scoring-robot-row" data-station="${station}">
      <th scope="row"><div class="match-scoring-robot-identity">${identity}</div></th>
      <td>${matchScoreRobotValue(alliance?.[`autoRobot${stationNumber}Leave`])}</td>
      <td>${matchScoreRobotValue(alliance?.[`autoRobot${stationNumber}Park`])}</td>
      <td>${matchScoreRobotValue(alliance?.[`teleopRobot${stationNumber}Park`])}</td>
    </tr>`;
  }));

  return `<table class="match-scoring-robot-table">
    <colgroup><col class="match-scoring-robot-team-col"><col span="3"></colgroup>
    <thead><tr><th scope="col">Team</th><th scope="col">Left wall</th><th scope="col">Auto park</th><th scope="col">TeleOp park</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function matchScoreBonus(earned) {
  if (earned == null) return '–';
  return earned ? '+1' : '0';
}

const BIOBUZZ_FLOWERS = [
  ['Red alliance flower', 'redAllianceFlower'],
  ['Scoring flower', 'scoringFlower'],
  ['Blue alliance flower', 'blueAllianceFlower'],
  ['Audience flower', 'audienceFlower'],
];

const BIOBUZZ_ELEMENTS = {
  RED_NECTAR: {label: 'Red nectar', className: 'red'},
  BLUE_NECTAR: {label: 'Blue nectar', className: 'blue'},
  POLLEN: {label: 'Pollen', className: 'pollen'},
};

function matchScoreFlower(label, elements) {
  const pieces = Array.isArray(elements) ? elements : [];
  const tokens = pieces.map(piece => {
    const element = BIOBUZZ_ELEMENTS[piece];
    if (!element) return `<span class="match-scoring-piece">${matchScoreValue(piece)}</span>`;
    return `<span class="match-scoring-piece ${element.className}" title="${element.label}" aria-label="${element.label}">${element.label}</span>`;
  });

  return `<div class="match-scoring-flower">
    <div class="match-scoring-flower-heading">
      <strong>${escHtml(label)}</strong>
    </div>
    <div class="match-scoring-flower-pieces">${tokens.length ? tokens.join(', ') : '<span class="match-scoring-empty">Empty</span>'}</div>
  </div>`;
}

function renderBioBuzzMatchScoring(score, match) {
  const red = score?.red;
  const blue = score?.blue;
  if (!red || !blue || red.autoPoints == null || blue.autoPoints == null) return '';

  const earnedFromFouls = (alliance, opponent) => opponent?.foulPointsCommitted;
  const isTie = match.redWins === false && match.blueWins === false;
  const redRP = computeMatchRP(red, match.redWins, isTie);
  const blueRP = computeMatchRP(blue, match.blueWins, isTie);

  const phases = [
    matchScoreGroup('Autonomous', [
      matchScoreRow('Leave points', red.autoLeavePoints, blue.autoLeavePoints),
      matchScoreRow('Park points', red.autoParkPoints, blue.autoParkPoints),
      matchScoreRow('Hive points', red.autoHivePoints, blue.autoHivePoints),
      matchScoreRow('Auto total', red.autoPoints, blue.autoPoints, 'total'),
    ]),
    matchScoreGroup('TeleOp', [
      matchScoreRow('Hive points', red.teleopHivePoints, blue.teleopHivePoints),
      matchScoreRow('Flower points', red.teleopFlowerPoints, blue.teleopFlowerPoints),
      matchScoreRow('Garden points', red.teleopGardenPoints, blue.teleopGardenPoints),
      matchScoreRow('Park points', red.teleopParkPoints, blue.teleopParkPoints),
      matchScoreRow('TeleOp total', red.teleopPoints, blue.teleopPoints, 'total'),
    ]),
    matchScoreGroup('Score', [
      matchScoreRow('Points scored', red.preFoulTotal, blue.preFoulTotal),
      matchScoreRow('Opponent fouls', earnedFromFouls(red, blue), earnedFromFouls(blue, red)),
      matchScoreRow('Final score', red.totalPoints, blue.totalPoints, 'final'),
    ]),
    matchScoreGroup('Ranking points', [
      matchScoreRow('Win / tie', match.redWins ? '+3' : isTie ? '+1' : '0',
        match.blueWins ? '+3' : isTie ? '+1' : '0'),
      matchScoreRow('Swarm', matchScoreBonus(red.swarmRP), matchScoreBonus(blue.swarmRP)),
      matchScoreRow('Pollinator 1', matchScoreBonus(red.pollinator1RP), matchScoreBonus(blue.pollinator1RP)),
      matchScoreRow('Pollinator 2', matchScoreBonus(red.pollinator2RP), matchScoreBonus(blue.pollinator2RP)),
      matchScoreRow('Total RP', redRP, blueRP, 'total'),
    ]),
  ];

  const robotActions = matchScoreRobotActions(score, match);

  const fieldActivity = [
    matchScoreRow('Auto hive tips', red.autoHiveTips, blue.autoHiveTips),
    matchScoreRow('TeleOp hive tips', red.teleopHiveTips, blue.teleopHiveTips),
    matchScoreRow('TeleOp hive pieces', red.teleopHivePollenNectar, blue.teleopHivePollenNectar),
    matchScoreRow('TeleOp garden pieces', red.teleopGardenPollenNectar, blue.teleopGardenPollenNectar),
  ];

  const fouls = [
    matchScoreRow('Minor fouls committed', red.minorFouls, blue.minorFouls),
    matchScoreRow('Major fouls committed', red.majorFouls, blue.majorFouls),
    matchScoreRow('Foul points conceded', red.foulPointsCommitted, blue.foulPointsCommitted),
  ];

  const flowerState = BIOBUZZ_FLOWERS.map(([label, field]) => {
    const redState = red[field];
    const blueState = blue[field];
    const same = JSON.stringify(redState) === JSON.stringify(blueState);
    return same
      ? matchScoreFlower(label, redState)
      : matchScoreFlower(`${label} (red record)`, redState)
        + matchScoreFlower(`${label} (blue record)`, blueState);
  }).join('');

  return `<section class="match-scoring" aria-label="BIOBUZZ scoring">
    <div class="match-scoring-columns" aria-hidden="true">
      <span></span><strong>Red</strong><strong>Blue</strong>
    </div>
    ${phases.join('')}
    <details class="match-scoring-expand">
      <summary>Robot actions</summary>
      <div class="match-scoring-expand-body">${robotActions}</div>
    </details>
    <details class="match-scoring-expand">
      <summary>Hive and fouls</summary>
      <div class="match-scoring-expand-body">${fieldActivity.join('')}${fouls.join('')}</div>
    </details>
    <details class="match-scoring-expand">
      <summary>Flower contents</summary>
      <div class="match-scoring-expand-body match-scoring-flower-list">
        ${flowerState}
      </div>
    </details>
  </section>`;
}


function renderBioBuzzScoutingSummary(score) {
  if (!score?.red || !score?.blue || score.red.autoHivePoints == null) return '';

  const red = score.red;
  const blue = score.blue;
  return `<section class="match-scoring" aria-label="BIOBUZZ scoring">
    <div class="match-scoring-columns" aria-hidden="true"><span></span><strong>Red</strong><strong>Blue</strong></div>
    ${matchScoreGroup('Scoring', [
      matchScoreRow('Auto hive', red.autoHivePoints, blue.autoHivePoints),
      matchScoreRow('TeleOp hive', red.dcHivePoints, blue.dcHivePoints),
      matchScoreRow('Flower', red.dcFlowerPoints, blue.dcFlowerPoints),
      matchScoreRow('Garden', red.dcGardenPoints, blue.dcGardenPoints),
      matchScoreRow('TeleOp park', red.dcParkPoints, blue.dcParkPoints),
      matchScoreRow('Hive tips', red.tips, blue.tips),
    ])}
  </section>`;
}
