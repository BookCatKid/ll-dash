import { formatTime } from './helpers.js';

function actualStart(match) {
  if (typeof match.actualStartTime !== 'string' || !match.actualStartTime) return null;
  const time = Date.parse(match.actualStartTime);
  return Number.isFinite(time) && time > 0 ? time : null;
}

function played(match) {
  return match.scoreRedFinal != null && match.scoreBlueFinal != null;
}

export function withMatchEstimates(matches) {
  const ordered = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
  const intervals = [];
  let latest = null;

  for (const match of ordered) {
    const time = actualStart(match);
    const number = Number(match.matchNumber);
    if (time == null || !Number.isInteger(number) || number < 1) continue;
    if (latest && number === latest.number + 1 && time > latest.time) {
      intervals.push(time - latest.time);
    }
    if (!latest || time > latest.time) {
      latest = { number, time };
    }
  }

  intervals.sort((a, b) => a - b);
  const middle = Math.floor(intervals.length / 2);
  const median = intervals.length
    ? (intervals[middle] + intervals[Math.floor((intervals.length - 1) / 2)]) / 2
    : null;

  return matches.map((match) => ({
    ...match,
    estimatedStartTime:
      median != null &&
      latest &&
      !played(match) &&
      actualStart(match) == null &&
      Number(match.matchNumber) > latest.number
        ? latest.time + (Number(match.matchNumber) - latest.number) * median
        : null,
  }));
}

export function matchTimeLabel(match, now = Date.now()) {
  const actual = actualStart(match);
  if (actual != null) return `Started ${formatTime(actual)}`;
  if (match.estimatedStartTime != null) {
    return match.estimatedStartTime <= now
      ? 'Overdue'
      : `Est. ${formatTime(match.estimatedStartTime)}`;
  }
  return match.startTime && Number.isFinite(Date.parse(match.startTime))
    ? `Sched. ${formatTime(match.startTime)}`
    : '–';
}
