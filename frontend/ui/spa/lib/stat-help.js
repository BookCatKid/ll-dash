export const statHelp = {
  rank: {
    title: 'Qualification rank',
    description:
      'Your position in the official qualification standings for the selected event. Rank 1 is the highest-ranked team.',
    calculation:
      'FIRST sorts teams by ranking score (average ranking points). When teams have the same ranking score, the official tiebreakers determine their order.',
    example: ({ rank, teamCount }) =>
      rank
        ? `Rank ${rank.rank} of ${teamCount} teams. Ranking score: ${rank.sortOrder1.toFixed(3)} RP per counted match.`
        : null,
    details: [
      {
        title: 'Tiebreakers',
        text: ({ season }) =>
          Number(season) === 2026
            ? 'After ranking score, BIOBUZZ compares average alliance match points excluding fouls (SO₂), average tips, then average Auto points. Any remaining tie is resolved by event software.'
            : 'After ranking score, DECODE compares average alliance match points excluding fouls (SO₂), average BASE points, then average Auto points. Any remaining tie is resolved by event software.',
      },
      {
        title: 'What it represents',
        text: () =>
          'Rank measures qualification results, not individual robot scoring ability. Both alliance partners earn the same ranking points unless a team is disqualified or playing as a surrogate.',
      },
    ],
    rules: true,
  },
  record: {
    title: 'Win–loss record',
    description:
      'The results of your team’s completed qualification matches at the selected event.',
    calculation:
      'LL Dash finds matches containing your team, checks the final Red and Blue scores, and counts wins, losses and ties. Playoff matches are not included.',
    example: ({ wins, losses, ties }) =>
      `${wins} ${wins === 1 ? 'win' : 'wins'}, ${losses} ${losses === 1 ? 'loss' : 'losses'}${ties ? `, ${ties} ${ties === 1 ? 'tie' : 'ties'}` : ''}.`,
    details: [
      {
        title: 'What counts as a win',
        text: () =>
          'If your alliance has the higher final score, both teams win the match. A lower score is a loss; equal final scores are a tie.',
      },
      {
        title: 'Why it may differ from ranking',
        text: () =>
          'This tile uses completed matches on the event schedule. Official rankings can exclude surrogate matches, and a disqualified team receives zero ranking credit. Bonus ranking points also make RP average different from a simple win percentage.',
      },
    ],
  },
  rp: {
    title: 'Average ranking points',
    description:
      'The official ranking score (RS), shown as ranking points earned per counted qualification match.',
    calculation: 'Average RP = ranking points credited to the team ÷ matches counted by FIRST.',
    example: ({ rank }) =>
      rank?.matchesCounted
        ? `${Number((rank.sortOrder1 * rank.matchesCounted).toFixed(3))} RP ÷ ${rank.matchesCounted} counted matches = ${rank.sortOrder1.toFixed(3)} RP avg.`
        : null,
    details: [
      {
        title: 'How ranking points are earned',
        text: ({ season }) =>
          Number(season) === 2026
            ? 'In BIOBUZZ, winning earns 3 RP and a tie earns 1 RP. Alliances can also earn 1 RP each for Swarm, Pollinator 1 and Pollinator 2. A loss can still earn bonus RP.'
            : 'In DECODE, winning earns 3 RP and a tie earns 1 RP. Alliances can also earn bonus RP for Movement, Goal and Pattern achievements.',
      },
      {
        title: 'Why the average can look low',
        text: () =>
          'League events may count up to 10 ranking entries before all 10 matches have been played. Missing entries count as zero, so the official average can be lower than total earned RP divided by matches already played.',
      },
    ],
    rules: true,
  },
  averageScore: {
    title: 'Average match score',
    description: 'Your alliance’s average final score in completed qualification matches.',
    calculation:
      'Average score = sum of your alliance’s final scores ÷ completed matches. LL Dash rounds to the nearest point.',
    example: ({ scoreTotal, playedCount, averageScore }) =>
      playedCount
        ? `${scoreTotal} points ÷ ${playedCount} matches ≈ ${averageScore} points.`
        : null,
    details: [
      {
        title: 'Alliance score, not robot score',
        text: () =>
          'Each match score is shared by two robots. It is not the number of points your robot scored individually, and it does not separate your contributions from your partner’s.',
      },
      {
        title: 'What is included',
        text: () =>
          'This uses the final alliance score, including points awarded because of opponent fouls. It reflects completed matches visible in the event schedule, rather than the separate set of matches FIRST uses for qualification ranking.',
      },
    ],
  },
  averageAuto: {
    title: 'Average Auto score',
    description:
      'Your alliance’s average points during the autonomous phase of completed qualification matches.',
    calculation:
      'Average Auto = sum of alliance Auto scores ÷ completed matches. LL Dash rounds to the nearest point.',
    example: ({ autoTotal, playedCount, averageAuto }) =>
      playedCount
        ? `${autoTotal} Auto points ÷ ${playedCount} matches ≈ ${averageAuto} points.`
        : null,
    details: [
      {
        title: 'What Auto measures',
        text: () =>
          'Auto is the first 30 seconds of a match, when robots operate without driver control. Scoring actions vary with the season’s game rules.',
      },
      {
        title: 'What it cannot tell you',
        text: () =>
          'The reported Auto total belongs to the alliance, not to either robot alone. It is different from an Auto OPR estimate, which statistically attempts to separate the partners’ contributions.',
      },
    ],
  },
  highScore: {
    title: 'Highest match score',
    description:
      'The largest final alliance score recorded in a qualification match involving your team.',
    calculation:
      'High score = maximum of the final alliance scores from your completed qualification matches.',
    example: ({ highMatch, highScore }) =>
      highMatch ? `${highScore} points in qualification match Q${highMatch.matchNumber}.` : null,
    details: [
      {
        title: 'Why the result can be unusually high',
        text: () =>
          'The final score includes both robots’ scoring and points awarded for opponent fouls. One exceptional match does not describe typical performance.',
      },
      {
        title: 'What is excluded',
        text: () =>
          'Playoff matches and unplayed matches do not contribute to this Dashboard statistic.',
      },
    ],
  },
  so2: {
    title: 'Second ranking sort order (SO₂)',
    description: 'FIRST’s first tiebreaker when two teams have the same ranking score.',
    calculation:
      'SO₂ is the average alliance match score excluding minor and major foul points. FIRST calculates it using the matches counted for ranking.',
    example: ({ rank }) =>
      rank?.matchesCounted
        ? `${Number((rank.sortOrder2 * rank.matchesCounted).toFixed(2))} non-foul points ÷ ${rank.matchesCounted} counted matches = ${rank.sortOrder2.toFixed(2)}.`
        : null,
    details: [
      {
        title: 'Why SO₂ differs from average score',
        text: () =>
          'SO₂ excludes foul points and uses FIRST’s ranking divisor. The Dashboard’s average score instead uses the final alliance scores from completed scheduled matches. At league meets, the two denominators can differ.',
      },
      {
        title: 'How it affects your rank',
        text: () =>
          'SO₂ only breaks a tie when teams have equal ranking scores. A higher SO₂ does not outrank a team with a higher ranking score.',
      },
    ],
    rules: true,
  },
  matches: {
    title: 'Matches counted / played',
    description: 'Two values supplied by the official event rankings API.',
    calculation:
      'Counted is the number of match entries used in the ranking averages. Played is the number of qualification matches recorded as played for the team.',
    example: ({ rank }) => {
      if (rank?.matchesCounted == null || rank.matchesPlayed == null) return null;
      const missing = rank.matchesCounted - rank.matchesPlayed;
      return `${rank.matchesCounted} counted entries / ${rank.matchesPlayed} played matches${missing > 0 ? `, including ${missing} zero-valued entries not yet played` : ''}.`;
    },
    details: [
      {
        title: 'Why counted can be larger than played',
        text: () =>
          'At BIOBUZZ League Meets, the official ranking calculation reserves 10 entries. If a team has played fewer than 10 eligible matches, missing entries contribute zero to ranking score and its tiebreakers.',
      },
      {
        title: 'Which matches qualify',
        text: () =>
          'Surrogate matches do not contribute to qualification rankings. The counts come directly from FIRST, rather than being inferred from the visible schedule.',
      },
    ],
    rules: true,
  },
  dq: {
    title: 'Disqualifications',
    description:
      'The number of qualification disqualifications recorded for your team in the official standings.',
    calculation:
      'LL Dash displays the DQ count returned by FIRST. It does not calculate this from alliance scores or fouls.',
    example: ({ rank }) =>
      rank?.dq != null
        ? `${rank.dq} official ${rank.dq === 1 ? 'disqualification' : 'disqualifications'} recorded.`
        : null,
    details: [
      {
        title: 'Effect on rankings',
        text: () =>
          'A disqualified team receives zero credit for that match in the qualification ranking criteria. In qualification matches, the partner team’s result is not automatically changed by the disqualification.',
      },
      {
        title: 'Not the same as a foul',
        text: () =>
          'Minor or major fouls may award points to an opposing alliance. A DQ is a separate disciplinary result and should not be inferred from foul totals.',
      },
    ],
    rules: true,
  },
};

export function statHelpUrls(season) {
  const manual =
    Number(season) === 2026
      ? 'https://ftc-resources.firstinspires.org/ftc/game/manual-13'
      : 'https://ftc-resources.firstinspires.org/ftc/archive/2026/game/manual-13';
  return {
    rules: manual,
    rankings: 'https://ftc-events.firstinspires.org/api-docs/index.html',
  };
}
