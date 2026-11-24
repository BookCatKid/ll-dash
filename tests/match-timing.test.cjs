const test = require('node:test');
const assert = require('node:assert/strict');

const read = () => import('../frontend/ui/spa/lib/match-timing.js');
const start = '2026-11-22T10:00:00';
const base = Date.parse(start);
const minute = 60000;
const match = (matchNumber, offset = null, completed = offset != null) => ({
  matchNumber,
  actualStartTime: offset == null ? null : new Date(base + offset * minute).toISOString(),
  startTime: '2026-11-22T01:00:00',
  scoreRedFinal: completed ? 0 : null,
  scoreBlueFinal: completed ? 0 : null,
});

test('estimates begin with the first measured interval', async () => {
  const { withMatchEstimates } = await read();
  const schedule = [match(1, 0), match(2, 10), match(3), match(4)];
  const results = withMatchEstimates(schedule);
  assert.equal(results[2].estimatedStartTime, base + 20 * minute);
  assert.equal(results[3].estimatedStartTime, base + 30 * minute);
  assert.equal(results[0].estimatedStartTime, null);
  assert.equal(schedule[2].estimatedStartTime, undefined);
});

test('the median resists a lunch break and updates its anchor', async () => {
  const { withMatchEstimates } = await read();
  const results = withMatchEstimates([
    match(5),
    match(3, 61),
    match(1, 0),
    match(2, 10),
    match(4, 72),
  ]);
  assert.equal(results[0].estimatedStartTime, base + 83 * minute);
});

test('missing actual timestamps cannot provide an interval or a replacement estimate', async () => {
  const { withMatchEstimates, matchTimeLabel } = await read();
  const results = withMatchEstimates([match(1, 0), match(2, null, true), match(3, 20), match(4)]);
  assert.equal(results[1].estimatedStartTime, null);
  assert.equal(results[3].estimatedStartTime, null);
  assert.match(matchTimeLabel(results[3]), /^Sched\./);
});

test('overdue estimates stay overdue instead of silently moving forward', async () => {
  const { withMatchEstimates, matchTimeLabel } = await read();
  const upcoming = withMatchEstimates([match(1, 0), match(2, 10), match(3)])[2];
  assert.match(matchTimeLabel(upcoming, base + 19 * minute), /^Est\./);
  assert.equal(matchTimeLabel(upcoming, base + 21 * minute), 'Overdue');
  assert.equal(upcoming.estimatedStartTime, base + 20 * minute);
});

test('actual start takes priority even before scores are available', async () => {
  const { withMatchEstimates, matchTimeLabel } = await read();
  const results = withMatchEstimates([match(1, 0), match(2, 10, false), match(3)]);
  assert.equal(results[1].estimatedStartTime, null);
  assert.match(matchTimeLabel(results[1]), /^Started /);
  assert.equal(results[2].estimatedStartTime, base + 20 * minute);
});
