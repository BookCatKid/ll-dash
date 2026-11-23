<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import { api } from '../lib/api.js';
  import TeamIdentity from '../components/TeamIdentity.svelte';
  import { onPageRefresh } from '../lib/refresh.js';
  import { number } from '../lib/helpers.js';

  let { settings, notify, onTeam } = $props();
  let active = $state('pick'),
    selection = writable('pick');
  let loading = $state(true),
    ranks = $state([]),
    flags = $state({}),
    categories = $state([]),
    oprs = $state({}),
    notes = $state([]);
  let left = $state(''),
    right = $state('');
  const rows = $derived(
    ranks.map((rank) => ({
      ...rank,
      flag: flags[rank.teamNumber]?.flag || 'neutral',
      opr: oprs[rank.teamNumber],
      notes: notes.filter((note) => note.team_number === rank.teamNumber),
    })),
  );
  const compareTeams = $derived(
    [left, right].map((value) => rows.find((row) => String(row.teamNumber) === value)),
  );
  function choose(tab) {
    active = tab;
    selection.set(tab);
  }
  onMount(() => {
    let mounted = true;
    const reload = () =>
      Promise.all([
        api.rankings(),
        api.flags(),
        api.flagCategories(),
        api.scouting(),
        api.ftcEventOprs(settings.active_event_code, settings.active_season),
      ])
        .then(([rankData, flagData, cats, scoutData, oprData]) => {
          if (!mounted) return;
          ranks = rankData.rankings || rankData.Rankings || [];
          flags = flagData || {};
          categories = cats || [];
          notes = scoutData || [];
          oprs = Object.fromEntries((oprData?.oprList || []).map((t) => [t.teamNumber, t]));
          loading = false;
        })
        .catch((e) => {
          if (mounted) {
            loading = false;
            notify(e.message);
          }
        });
    void reload();
    const unsubscribe = onPageRefresh(reload);
    return () => {
      mounted = false;
      unsubscribe();
    };
  });
  async function toggleFlag(team, category) {
    const value = team.flag === category ? 'neutral' : category;
    try {
      await api.setFlag(team.teamNumber, value);
      flags = { ...flags, [team.teamNumber]: { ...flags[team.teamNumber], flag: value } };
      notify('Flag updated');
    } catch (e) {
      notify(e.message);
    }
  }
</script>

{#if loading}<div class="loading">Loading</div>
{:else}
  <SegmentedTabs
    items={[
      { key: 'pick', label: 'Pick list' },
      { key: 'compare', label: 'Compare' },
    ]}
    activeTab={selection}
    onSelect={choose}
  />
  {#if active === 'pick'}
    {#each [{ key: 'ours', label: 'Our team', items: rows.filter((row) => Number(row.teamNumber) === Number(settings.team_number)) }, ...categories.map( (cat) => ({ key: cat.key, label: cat.label, items: rows.filter((row) => row.flag === cat.key && Number(row.teamNumber) !== Number(settings.team_number)) }) ), { key: 'other', label: 'All teams', items: rows.filter((row) => Number(row.teamNumber) !== Number(settings.team_number) && !categories.some((cat) => cat.key === row.flag)) }] as group (group.key)}
      {#if group.items.length}
        <div class="section-label" style="margin-top:1rem">{group.label}</div>
        {#each group.items as team (team.teamNumber)}
          <div
            class="match-row"
            class:our-match={Number(team.teamNumber) === Number(settings.team_number)}
          >
            <span class="match-num">#{team.rank}</span>
            <div class="alliance-pick-team">
              <TeamIdentity {team} ourTeam={settings.team_number} onOpen={onTeam} />
              <span class="alliance-pick-metrics">
                {team.wins}W · RP {number(team.sortOrder1, 3)} · OPR {number(team.opr?.opr)} · {team
                  .notes.length} notes
              </span>
            </div>
            <div style="display:flex;gap:.25rem;flex-direction:column">
              {#each categories as category (category.key)}<button
                  class="flag-btn"
                  class:active={team.flag === category.key}
                  title={category.label}
                  onclick={() => toggleFlag(team, category.key)}
                >
                  {category.icon || category.label}
                </button>{/each}
            </div>
          </div>
        {/each}
      {/if}
    {/each}
  {:else}
    <div class="card">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="compare-a">First team</label><select
            id="compare-a"
            class="form-select"
            bind:value={left}
          >
            <option value="">Choose team</option>{#each rows as team (team.teamNumber)}<option
                value={String(team.teamNumber)}
              >
                {team.teamNumber} · {team.teamName}
              </option>{/each}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="compare-b">Second team</label><select
            id="compare-b"
            class="form-select"
            bind:value={right}
          >
            <option value="">Choose team</option>{#each rows as team (team.teamNumber)}<option
                value={String(team.teamNumber)}
              >
                {team.teamNumber} · {team.teamName}
              </option>{/each}
          </select>
        </div>
      </div>
    </div>
    {#if compareTeams.every(Boolean)}
      <div class="card">
        <table class="rank-table">
          <thead><tr><th>Metric</th><th>{left}</th><th>{right}</th></tr></thead>
          <tbody>
            {#each [{ label: 'Rank', read: (t) => t.rank }, { label: 'RP avg', read: (t) => number(t.sortOrder1, 3) }, { label: 'Avg NP', read: (t) => number(t.sortOrder2) }, { label: 'OPR', read: (t) => number(t.opr?.opr) }, { label: 'Auto OPR', read: (t) => number(t.opr?.autoOpr) }, { label: 'TeleOp OPR', read: (t) => number(t.opr?.dcOpr) }, { label: 'Wins', read: (t) => t.wins }, { label: 'Losses', read: (t) => t.losses }, { label: 'Scouting notes', read: (t) => t.notes.length }] as metric}<tr>
                <td>{metric.label}</td><td>{metric.read(compareTeams[0])}</td><td>
                  {metric.read(compareTeams[1])}
                </td>
              </tr>{/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
{/if}
