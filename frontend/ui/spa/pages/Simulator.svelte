<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import TeamChip from '../components/TeamChip.svelte';
  import { api } from '../lib/api.js';
  import { teamsFor, computeRp, oprPrediction } from '../lib/helpers.js';

  let { settings, notify, onTeam } = $props();
  let tab = $state('schedule'),
    selection = writable('schedule');
  let loading = $state(true),
    rankings = $state([]),
    matches = $state([]),
    scores = $state({}),
    oprs = $state({}),
    sim = $state({});
  const season = $derived(Number(settings.active_season));
  const bonuses = $derived(
    season === 2026
      ? ['swarmRp', 'pollinator1Rp', 'pollinator2Rp']
      : ['movementRp', 'goalRp', 'patternRp'],
  );
  const maxRp = 6;
  const bonusRates = $derived.by(() => {
    const team = {};
    const overall = Object.fromEntries(bonuses.map((b) => [b, [0, 0]]));
    for (const match of matches.filter((m) => m.scoreRedFinal != null)) {
      const data = scores[match.matchNumber];
      if (!data) continue;
      for (const side of ['Red', 'Blue']) {
        const flags = data[side.toLowerCase()];
        if (!flags) continue;
        for (const bonus of bonuses) {
          overall[bonus][1]++;
          if (flags[bonus] || flags[bonus.replace(/Rp$/, 'RP')]) overall[bonus][0]++;
          for (const member of teamsFor(match, side)) {
            team[member.teamNumber] ??= {};
            (team[member.teamNumber][bonus] ??= [0, 0])[1]++;
            if (flags[bonus] || flags[bonus.replace(/Rp$/, 'RP')])
              team[member.teamNumber][bonus][0]++;
          }
        }
      }
    }
    return { team, overall };
  });
  const projected = $derived.by(() => {
    const state = Object.fromEntries(
      rankings.map((r) => [
        r.teamNumber,
        {
          teamNumber: r.teamNumber,
          teamName: r.teamName,
          total: 0,
          played: 0,
          wins: 0,
          losses: 0,
          ties: 0,
        },
      ]),
    );
    for (const match of matches) {
      const entry = sim[match.matchNumber];
      if (!entry) continue;
      const redWon = entry.played
        ? Boolean(match.redWins)
        : entry.predictedWinner
          ? entry.predictedWinner === 'Red'
          : entry.red > entry.blue;
      const blueWon = entry.played
        ? Boolean(match.blueWins)
        : entry.predictedWinner
          ? entry.predictedWinner === 'Blue'
          : entry.blue > entry.red;
      const tie = !redWon && !blueWon;
      for (const side of ['Red', 'Blue']) {
        const rp = entry[side.toLowerCase()];
        const won = side === 'Red' ? redWon : blueWon;
        for (const member of teamsFor(match, side)) {
          const row = state[member.teamNumber];
          if (!row) continue;
          row.total += rp;
          row.played++;
          if (tie) row.ties++;
          else if (won) row.wins++;
          else row.losses++;
        }
      }
    }
    return Object.values(state)
      .map((row) => ({ ...row, rpAvg: row.played ? row.total / row.played : 0 }))
      .sort((a, b) => b.rpAvg - a.rpAvg);
  });

  onMount(() => {
    let active = true;
    if (![2025, 2026].includes(season)) {
      loading = false;
      return;
    }
    Promise.all([
      api.rankings(),
      api.schedule(),
      api.ftcEventOprs(settings.active_event_code, season),
      api.ftcEventScores(settings.active_event_code, season),
    ])
      .then(([r, s, o, sc]) => {
        if (!active) return;
        rankings = r.rankings || r.Rankings || [];
        matches = s.schedule || [];
        oprs = Object.fromEntries((o?.oprList || []).map((row) => [row.teamNumber, row]));
        scores = Object.fromEntries(
          (sc?.matches || []).map((m) => [m.matchNum, { red: m.red, blue: m.blue }]),
        );
        const initial = {};
        for (const match of matches) {
          if (match.scoreRedFinal == null) {
            initial[match.matchNumber] = null;
            continue;
          }
          const data = scores[match.matchNumber],
            tie = match.redWins === false && match.blueWins === false;
          initial[match.matchNumber] = {
            played: true,
            red: data
              ? computeRp(data.red, match.redWins, tie, season)
              : match.redWins
                ? 3
                : tie
                  ? 1
                  : 0,
            blue: data
              ? computeRp(data.blue, match.blueWins, tie, season)
              : match.blueWins
                ? 3
                : tie
                  ? 1
                  : 0,
          };
        }
        sim = initial;
        loading = false;
      })
      .catch((e) => {
        if (active) {
          notify(e.message);
          loading = false;
        }
      });
    return () => {
      active = false;
    };
  });

  function probability(teams, key) {
    const rates = teams
      .map((t) => bonusRates.team[t.teamNumber]?.[key])
      .filter(Boolean)
      .map(([earned, played]) => earned / played);
    if (rates.length) return rates.reduce((a, b) => a + b, 0) / rates.length;
    const [earned, played] = bonusRates.overall[key] || [0, 0];
    return played ? earned / played : 0.33;
  }
  function estimate(match) {
    const red = teamsFor(match, 'Red'),
      blue = teamsFor(match, 'Blue');
    const pred = oprPrediction(red, blue, oprs);
    const redBonus = bonuses.filter((key) => probability(red, key) >= 0.5).length;
    const blueBonus = bonuses.filter((key) => probability(blue, key) >= 0.5).length;
    const r = pred.winner === 'Red' ? 3 : pred.winner === 'Tie' ? 1 : 0;
    const b = pred.winner === 'Blue' ? 3 : pred.winner === 'Tie' ? 1 : 0;
    return {
      red: r + redBonus,
      blue: b + blueBonus,
      played: false,
      predictedWinner: pred.winner,
      pred,
    };
  }
  function change(match, side, increment) {
    const previous = sim[match.matchNumber] || { red: 0, blue: 0, played: false };
    sim = {
      ...sim,
      [match.matchNumber]: {
        ...previous,
        [side]: Math.max(0, Math.min(maxRp, previous[side] + increment)),
        predictedWinner: null,
      },
    };
  }
  function predict(match) {
    sim = { ...sim, [match.matchNumber]: estimate(match) };
  }
  function predictAll() {
    sim = {
      ...sim,
      ...Object.fromEntries(
        matches.filter((m) => m.scoreRedFinal == null).map((m) => [m.matchNumber, estimate(m)]),
      ),
    };
  }
  function reset() {
    sim = {
      ...sim,
      ...Object.fromEntries(
        matches.filter((m) => m.scoreRedFinal == null).map((m) => [m.matchNumber, null]),
      ),
    };
  }
  function select(value) {
    tab = value;
    selection.set(value);
  }
</script>

{#if loading}<div class="loading">Loading</div>
{:else if ![2025, 2026].includes(season)}<div class="empty-state">
    Simulation available for 2025 and 2026 seasons.
  </div>
{:else}
  <SegmentedTabs
    items={[
      { key: 'schedule', label: 'Schedule' },
      { key: 'rankings', label: 'Rankings' },
    ]}
    activeTab={selection}
    onSelect={select}
  />
  {#if tab === 'schedule'}
    <div class="sim-top-bar">
      <button class="btn btn-primary btn-sm" onclick={predictAll}>Predict all</button><button
        class="btn btn-secondary btn-sm"
        onclick={reset}
      >
        Reset
      </button>
    </div>
    {#each matches as match (match.matchNumber)}
      <div
        class="match-row"
        class:our-match={match.teams?.some(
          (t) => Number(t.teamNumber) === Number(settings.team_number),
        )}
      >
        <div class="match-num">Q{match.matchNumber}</div>
        <div class="match-alliances">
          <div class="alliance-teams">
            {#each teamsFor(match, 'Red') as team}<TeamChip
                {team}
                alliance="red"
                ourTeam={settings.team_number}
                onOpen={onTeam}
              />{/each}
          </div>
          <div class="alliance-teams">
            {#each teamsFor(match, 'Blue') as team}<TeamChip
                {team}
                alliance="blue"
                ourTeam={settings.team_number}
                onOpen={onTeam}
              />{/each}
          </div>
          {#if match.scoreRedFinal != null}<div style="font-size:.7rem;color:var(--text2)">
              {match.scoreRedFinal}–{match.scoreBlueFinal}
            </div>
          {:else}{@const prediction = oprPrediction(
              teamsFor(match, 'Red'),
              teamsFor(match, 'Blue'),
              oprs,
            )}
            {#if prediction.hasData}<div style="font-size:.7rem;color:var(--text2)">
                {prediction.winner} favored · {prediction.confidence}%
              </div>{/if}
          {/if}
        </div>
        <div class="sim-ctrl-col">
          {#each ['red', 'blue'] as side}
            <div class="sim-rp-row">
              <button
                class="sim-rp-btn"
                aria-label={`Decrease ${side} RP`}
                onclick={() => change(match, side, -1)}
              >
                −
              </button><span
                class="sim-rp-num"
                style:color={side === 'red' ? 'var(--alliance-red)' : 'var(--alliance-blue)'}
              >
                {sim[match.matchNumber]?.[side] ?? '–'}
              </span><button
                class="sim-rp-btn"
                aria-label={`Increase ${side} RP`}
                onclick={() => change(match, side, 1)}
              >
                +
              </button>
            </div>
          {/each}
          {#if match.scoreRedFinal == null}<button
              class="sim-auto-btn"
              onclick={() => predict(match)}
            >
              Predict
            </button>{/if}
        </div>
      </div>
    {/each}
  {:else}
    <div class="projection-banner">
      <div class="projection-rank">
        #{projected.findIndex((r) => Number(r.teamNumber) === Number(settings.team_number)) + 1}
      </div>
      <div class="projection-label">Projected rank</div>
    </div>
    <div class="card">
      <table class="rank-table">
        <thead><tr><th>#</th><th>Team</th><th>RP avg</th><th>W–L–T</th></tr></thead><tbody>
          {#each projected as row, index (row.teamNumber)}<tr
              class:our-row={Number(row.teamNumber) === Number(settings.team_number)}
            >
              <td>{index + 1}</td><td>
                <button onclick={() => onTeam(row.teamNumber)}>
                  {row.teamNumber}<span style="display:block;font-size:.65rem;color:var(--text2)">
                    {row.teamName}
                  </span>
                </button>
              </td><td>{row.rpAvg.toFixed(3)}</td><td>{row.wins}–{row.losses}–{row.ties}</td>
            </tr>{/each}
        </tbody>
      </table>
    </div>
  {/if}
{/if}
