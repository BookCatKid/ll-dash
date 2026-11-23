<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import TeamIdentity from '../components/TeamIdentity.svelte';
  import SimulationMatchCard from '../components/SimulationMatchCard.svelte';
  import { api } from '../lib/api.js';
  import { onPageRefresh } from '../lib/refresh.js';
  import { loadMatchData, estimatedMatchOutcome } from '../lib/match-data.js';
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
  const unplayed = $derived(matches.filter((match) => match.scoreRedFinal == null));
  const hasForecast = $derived(
    unplayed.some((match) => estimatedMatchOutcome(match, oprs) != null),
  );
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
    const reload = () =>
      Promise.all([api.rankings(), api.schedule(), loadMatchData(settings)])
        .then(([r, s, matchData]) => {
          if (!active) return;
          rankings = r.rankings || r.Rankings || [];
          matches = s.schedule || [];
          oprs = matchData.oprs;
          scores = matchData.scores;
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
          const merged = { ...initial };
          for (const match of matches) {
            if (match.scoreRedFinal == null && sim[match.matchNumber] !== undefined) {
              merged[match.matchNumber] = sim[match.matchNumber];
            }
          }
          sim = merged;
          loading = false;
        })
        .catch((e) => {
          if (active) {
            notify(e.message);
            loading = false;
          }
        });
    void reload();
    const unsubscribe = onPageRefresh(reload);
    return () => {
      active = false;
      unsubscribe();
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
    if (!estimatedMatchOutcome(match, oprs)) return null;
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
  function setRp(match, side, value) {
    const previous = sim[match.matchNumber] || { red: 0, blue: 0, played: false };
    sim = {
      ...sim,
      [match.matchNumber]: {
        ...previous,
        [side]: Math.max(0, Math.min(maxRp, value)),
        predictedWinner: null,
      },
    };
  }
  function predict(match) {
    const prediction = estimate(match);
    if (prediction) sim = { ...sim, [match.matchNumber]: prediction };
  }
  function predictAll() {
    const predictions = unplayed
      .map((match) => [match.matchNumber, estimate(match)])
      .filter(([, prediction]) => prediction != null);
    sim = { ...sim, ...Object.fromEntries(predictions) };
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
      <button class="btn btn-primary btn-sm" disabled={!hasForecast} onclick={predictAll}>
        Predict all
      </button><button class="btn btn-secondary btn-sm" disabled={!unplayed.length} onclick={reset}>
        Reset
      </button>
    </div>
    {#if !unplayed.length}
      <p class="sim-rp-rules">
        All qualification matches are complete. Adjust RP values to explore alternate standings.
      </p>
    {:else if !hasForecast}
      <p class="sim-rp-rules">
        Estimates are unavailable until OPR data is available. You can still enter RP values
        manually.
      </p>
    {/if}
    {#each matches as match (match.matchNumber)}
      <SimulationMatchCard
        {match}
        entry={sim[match.matchNumber]}
        teamNumber={settings.team_number}
        {oprs}
        {maxRp}
        {onTeam}
        onChange={(side, value) => setRp(match, side, value)}
        onPredict={() => predict(match)}
      />
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
                <TeamIdentity team={row} ourTeam={settings.team_number} onOpen={onTeam} />
              </td><td>{row.rpAvg.toFixed(3)}</td><td>{row.wins}–{row.losses}–{row.ties}</td>
            </tr>{/each}
        </tbody>
      </table>
    </div>
  {/if}
{/if}
