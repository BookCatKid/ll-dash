function groupPlayoffRounds(matches) {
  const rounds = []; // [{label, matches:[...]}] in matchNumber order
  const byLabel = {};
  [...matches]
    .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
    .forEach((m) => {
      const desc = m.description || `Match ${m.matchNumber}`;
      let label = desc.replace(/\s*Match\s*\d+\s*$/i, '').trim();
      if (!label || /^\d+$/.test(label)) label = 'Playoffs';
      if (!byLabel[label]) {
        byLabel[label] = { label, matches: [] };
        rounds.push(byLabel[label]);
      }
      byLabel[label].matches.push(m);
    });
  return rounds;
}

// teamNumber → alliance number map from /alliances
function allianceMap(alliances) {
  const map = {};
  (alliances || []).forEach((a) => {
    [a.captain, a.round1, a.round2, a.round3, a.backup].forEach((t) => {
      if (t != null && t > 0) map[t] = a.number;
    });
  });
  return map;
}

// ── Official FTC double-elim templates (Competition Manual 13.7) ──
// refs: {seed:n} = Alliance n, {w:k} = winner of Mk, {l:k} = loser of Mk
// w/l: where the winner/loser goes ('Mk', 'F' = finals, or a placement)
const DE_TEMPLATES = {
  2: {
    slots: [],
    finals: { red: { seed: 1 }, blue: { seed: 2 }, redLosses: 0, blueLosses: 0 },
  },
  4: {
    slots: [
      { m: 1, bracket: 'upper', round: 0, red: { seed: 1 }, blue: { seed: 4 }, w: 'M4', l: 'M3' },
      { m: 2, bracket: 'upper', round: 0, red: { seed: 2 }, blue: { seed: 3 }, w: 'M4', l: 'M3' },
      { m: 3, bracket: 'lower', round: 0, red: { l: 1 }, blue: { l: 2 }, w: 'M5', l: '4th' },
      { m: 4, bracket: 'upper', round: 1, red: { w: 1 }, blue: { w: 2 }, w: 'F', l: 'M5' },
      { m: 5, bracket: 'lower', round: 1, red: { l: 4 }, blue: { w: 3 }, w: 'F', l: '3rd' },
    ],
    finals: { red: { w: 4 }, blue: { w: 5 }, redLosses: 0, blueLosses: 1 },
  },
  6: {
    slots: [
      { m: 1, bracket: 'upper', round: 0, red: { seed: 4 }, blue: { seed: 5 }, w: 'M3', l: 'M6' },
      { m: 2, bracket: 'upper', round: 0, red: { seed: 3 }, blue: { seed: 6 }, w: 'M4', l: 'M5' },
      { m: 3, bracket: 'upper', round: 1, red: { seed: 1 }, blue: { w: 1 }, w: 'M7', l: 'M5' },
      { m: 4, bracket: 'upper', round: 1, red: { seed: 2 }, blue: { w: 2 }, w: 'M7', l: 'M6' },
      { m: 5, bracket: 'lower', round: 0, red: { l: 3 }, blue: { l: 2 }, w: 'M8', l: '5th' },
      { m: 6, bracket: 'lower', round: 0, red: { l: 4 }, blue: { l: 1 }, w: 'M8', l: '5th' },
      { m: 7, bracket: 'upper', round: 2, red: { w: 3 }, blue: { w: 4 }, w: 'F', l: 'M9' },
      { m: 8, bracket: 'lower', round: 1, red: { w: 6 }, blue: { w: 5 }, w: 'M9', l: '4th' },
      { m: 9, bracket: 'lower', round: 2, red: { l: 7 }, blue: { w: 8 }, w: 'F', l: '3rd' },
    ],
    finals: { red: { w: 7 }, blue: { w: 9 }, redLosses: 0, blueLosses: 1 },
  },
  8: {
    slots: [
      { m: 1, bracket: 'upper', round: 0, red: { seed: 1 }, blue: { seed: 8 }, w: 'M7', l: 'M5' },
      { m: 2, bracket: 'upper', round: 0, red: { seed: 4 }, blue: { seed: 5 }, w: 'M7', l: 'M5' },
      { m: 3, bracket: 'upper', round: 0, red: { seed: 2 }, blue: { seed: 7 }, w: 'M8', l: 'M6' },
      { m: 4, bracket: 'upper', round: 0, red: { seed: 3 }, blue: { seed: 6 }, w: 'M8', l: 'M6' },
      { m: 5, bracket: 'lower', round: 0, red: { l: 1 }, blue: { l: 2 }, w: 'M10', l: '7th' },
      { m: 6, bracket: 'lower', round: 0, red: { l: 3 }, blue: { l: 4 }, w: 'M9', l: '7th' },
      { m: 7, bracket: 'upper', round: 1, red: { w: 1 }, blue: { w: 2 }, w: 'M11', l: 'M9' },
      { m: 8, bracket: 'upper', round: 1, red: { w: 3 }, blue: { w: 4 }, w: 'M11', l: 'M10' },
      { m: 9, bracket: 'lower', round: 1, red: { l: 7 }, blue: { w: 6 }, w: 'M12', l: '5th' },
      { m: 10, bracket: 'lower', round: 1, red: { l: 8 }, blue: { w: 5 }, w: 'M12', l: '5th' },
      { m: 11, bracket: 'upper', round: 2, red: { w: 7 }, blue: { w: 8 }, w: 'F', l: 'M13' },
      { m: 12, bracket: 'lower', round: 2, red: { w: 10 }, blue: { w: 9 }, w: 'M13', l: '4th' },
      { m: 13, bracket: 'lower', round: 3, red: { l: 11 }, blue: { w: 12 }, w: 'F', l: '3rd' },
    ],
    finals: { red: { w: 11 }, blue: { w: 13 }, redLosses: 0, blueLosses: 1 },
  },
};

function _sideTeams(m, station) {
  return (m.teams || []).filter((t) => t.station?.startsWith(station)).map((t) => t.teamNumber);
}

// Resolve the bracket. Returns {template, slots, finals, rosters} or null
// if the matches don't fit the double-elim structure.
function resolveBracket(alliances, apiMatches) {
  const template = DE_TEMPLATES[(alliances || []).length];
  if (!template) return null;
  if (apiMatches.some((m) => /semifinal/i.test(m.description || ''))) return null; // legacy format

  const aMap = allianceMap(alliances);
  const pool = [...apiMatches]
    .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
    .map((m) => ({ m, used: false, redA: null, blueA: null }));

  // Alliance number for one side, from the (growing) team→alliance map
  const sideAlliance = (m, station) => {
    const counts = {};
    _sideTeams(m, station).forEach((t) => {
      const a = aMap[t];
      if (a != null) counts[a] = (counts[a] || 0) + 1;
    });
    let best = null;
    Object.keys(counts).forEach((a) => {
      if (best == null || counts[a] > counts[best]) best = a;
    });
    return best != null ? parseInt(best) : null;
  };
  const hasRoster = (a) => Object.values(aMap).includes(a);
  const enroll = (m, station, allianceNum) =>
    _sideTeams(m, station).forEach((t) => {
      if (aMap[t] == null) aMap[t] = allianceNum;
    });

  const slots = {};
  const resolveRef = (ref) => {
    if (!ref) return null;
    if (ref.seed) return ref.seed;
    if (ref.w) return slots['M' + ref.w]?.winnerA ?? null;
    if (ref.l) return slots['M' + ref.l]?.loserA ?? null;
    return null;
  };
  const refLabel = (ref) =>
    ref.seed ? `Alliance ${ref.seed}` : ref.w ? `Winner M${ref.w}` : `Loser M${ref.l}`;

  // Consume matches between two alliances until one is decided (handles tie
  // replays). When rosters are missing/partial, sides are inferred:
  //  - one side known and expected → the other side joins the other alliance
  //  - both sides unknown and neither alliance has any roster yet → anchor
  //    the next unused match by color (red = expected red, per the manual)
  function consumePair(expRedA, expBlueA) {
    const games = [];
    let winnerA = null;
    for (const r of pool) {
      if (r.used) continue;
      let redA = sideAlliance(r.m, 'Red'),
        blueA = sideAlliance(r.m, 'Blue');
      if (redA != null && blueA != null) {
        const same =
          (redA === expRedA && blueA === expBlueA) || (redA === expBlueA && blueA === expRedA);
        if (!same) continue;
      } else if (redA != null && blueA == null && (redA === expRedA || redA === expBlueA)) {
        blueA = redA === expRedA ? expBlueA : expRedA;
        enroll(r.m, 'Blue', blueA);
      } else if (blueA != null && redA == null && (blueA === expRedA || blueA === expBlueA)) {
        redA = blueA === expRedA ? expBlueA : expRedA;
        enroll(r.m, 'Red', redA);
      } else if (redA == null && blueA == null && !hasRoster(expRedA) && !hasRoster(expBlueA)) {
        redA = expRedA;
        blueA = expBlueA; // round-1 anchor: red = higher seed
        enroll(r.m, 'Red', redA);
        enroll(r.m, 'Blue', blueA);
      } else {
        continue;
      }
      // fold in any still-unmapped teams (3-team alliances, substitutes)
      enroll(r.m, 'Red', redA);
      enroll(r.m, 'Blue', blueA);
      r.used = true;
      r.redA = redA;
      r.blueA = blueA;
      games.push(r);
      const played = r.m.scoreRedFinal !== null && r.m.scoreRedFinal !== undefined;
      if (!played) break; // scheduled, not yet played
      if (r.m.redWins || r.m.blueWins) {
        // decided (ties keep consuming replays)
        winnerA = r.m.redWins ? redA : blueA;
        break;
      }
    }
    return { games, winnerA };
  }

  for (const t of template.slots) {
    const redA = resolveRef(t.red),
      blueA = resolveRef(t.blue);
    const slot = {
      t,
      redA,
      blueA,
      redLabel: refLabel(t.red),
      blueLabel: refLabel(t.blue),
      games: [],
      match: null,
      winnerA: null,
      loserA: null,
    };
    if (redA != null && blueA != null) {
      const { games, winnerA } = consumePair(redA, blueA);
      slot.games = games;
      slot.match = games.length ? games[games.length - 1] : null;
      if (winnerA != null) {
        slot.winnerA = winnerA;
        slot.loserA = winnerA === redA ? blueA : redA;
      }
    }
    slots['M' + t.m] = slot;
  }

  // Finals series: red = upper-bracket finalist; an alliance is champion
  // when the other reaches 2 total losses (the lower-bracket finalist
  // arrives with 1; in a 2-alliance event both start at 0 = best of 3).
  const f = template.finals;
  const fRedA = resolveRef(f.red),
    fBlueA = resolveRef(f.blue);
  const finals = {
    redA: fRedA,
    blueA: fBlueA,
    redLabel: refLabel(f.red),
    blueLabel: refLabel(f.blue),
    bestOf3: f.blueLosses === 0,
    games: [],
    championA: null,
  };
  if (fRedA != null && fBlueA != null) {
    const losses = { [fRedA]: f.redLosses, [fBlueA]: f.blueLosses };
    while (finals.championA == null) {
      const { games, winnerA } = consumePair(fRedA, fBlueA);
      if (!games.length) break;
      finals.games.push(...games);
      if (winnerA == null) break; // last game unplayed/tied
      const loserA = winnerA === fRedA ? fBlueA : fRedA;
      losses[loserA]++;
      if (losses[loserA] >= 2) finals.championA = winnerA;
    }
  }

  // Played matches the template couldn't place → not really double-elim
  if (pool.some((r) => !r.used && r.m.scoreRedFinal !== null && r.m.scoreRedFinal !== undefined))
    return null;

  // Display rosters: /alliances members + everything learned from matches
  const rosters = {};
  (alliances || []).forEach((a) => {
    rosters[a.number] = [a.captain, a.round1, a.round2, a.round3, a.backup].filter(
      (t) => t != null && t > 0,
    );
  });
  Object.entries(aMap).forEach(([team, num]) => {
    rosters[num] = rosters[num] || [];
    if (!rosters[num].includes(parseInt(team))) rosters[num].push(parseInt(team));
  });

  return { template, slots, finals, rosters };
}

export { groupPlayoffRounds, allianceMap, resolveBracket };
