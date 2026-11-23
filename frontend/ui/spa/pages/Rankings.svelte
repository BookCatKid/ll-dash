<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import TeamIdentity from '../components/TeamIdentity.svelte';
  import { onPageRefresh } from '../lib/refresh.js';
  import { number } from '../lib/helpers.js';
  let { settings, onTeam } = $props();
  let loading = $state(true),
    error = $state(''),
    ranks = $state([]),
    oprs = $state([]);
  let scope = $state('global'),
    sort = $state('rank'),
    direction = $state('asc');
  const is2026 = $derived(Number(settings.active_season) === 2026);
  const rows = $derived.by(() => {
    const map = Object.fromEntries(oprs.map((o) => [o.teamNumber, o]));
    const merged = ranks.map((r) => ({ ...r, o: map[r.teamNumber] || {} }));
    const getValue = (r) => {
      if (sort === 'team') return r.teamNumber;
      if (sort === 'wl') return (r.wins || 0) - (r.losses || 0);
      if (sort === 'opr') return (scope === 'global' ? r.o.opr : r.o.localOpr) ?? -Infinity;
      if (sort === 'auto')
        return (scope === 'global' ? r.o.autoOpr : r.o.localAutoOpr) ?? -Infinity;
      if (sort === 'teleop') return (scope === 'global' ? r.o.dcOpr : r.o.localDcOpr) ?? -Infinity;
      return r[sort] ?? 0;
    };
    return merged.sort((a, b) => {
      const x = getValue(a),
        y = getValue(b);
      return (x < y ? -1 : x > y ? 1 : 0) * (direction === 'asc' ? 1 : -1);
    });
  });
  function selectSort(column) {
    direction =
      sort === column
        ? direction === 'asc'
          ? 'desc'
          : 'asc'
        : column === 'rank' || column === 'team'
          ? 'asc'
          : 'desc';
    sort = column;
  }
  onMount(() => {
    let active = true;
    const reload = () =>
      Promise.all([
        api.rankings(),
        api.ftcEventOprs(settings.active_event_code, settings.active_season),
      ])
        .then(([r, o]) => {
          if (!active) return;
          ranks = r.rankings || r.Rankings || [];
          oprs = o?.oprList || [];
          loading = false;
        })
        .catch((e) => {
          if (active) {
            error = e.message;
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
</script>

{#if loading}
  <div class="loading">Loading</div>
{:else if error}
  <div class="svelte-error">{error}</div>
{:else if !rows.length}
  <div class="empty-state">No rankings yet.</div>
{:else}
  <div
    style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.8rem"
  >
    <span style="color:var(--text2);font-size:.75rem">{rows.length} teams</span>
    <div class="opr-scope-control">
      <button
        class:active={scope === 'global'}
        class="opr-scope-btn"
        onclick={() => {
          scope = 'global';
        }}
      >
        Global OPR
      </button>
      <button
        class:active={scope === 'local'}
        class="opr-scope-btn"
        onclick={() => {
          scope = 'local';
        }}
      >
        Event OPR
      </button>
    </div>
  </div>
  <div style="overflow-x:auto">
    <table class="rank-table">
      <thead>
        <tr>
          {#each [{ key: 'rank', label: '#' }, { key: 'team', label: 'Team' }, { key: 'wl', label: 'W–L' }, { key: 'sortOrder1', label: 'RP' }, { key: 'sortOrder2', label: 'Avg NP' }, ...(is2026 ? [{ key: 'sortOrder3', label: 'Avg tips' }] : []), { key: 'opr', label: 'OPR' }, { key: 'auto', label: 'Auto' }, { key: 'teleop', label: 'TeleOp' }] as column}
            <th>
              <button type="button" style="color:inherit" onclick={() => selectSort(column.key)}>
                {column.label}{sort === column.key ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as team (team.teamNumber)}
          <tr class:our-row={Number(team.teamNumber) === Number(settings.team_number)}>
            <td>{team.rank}</td>
            <td>
              <TeamIdentity {team} ourTeam={settings.team_number} onOpen={onTeam} />
            </td>
            <td>{team.wins}–{team.losses}</td>
            <td>{number(team.sortOrder1, 3)}</td>
            <td>{number(team.sortOrder2)}</td>
            {#if is2026}<td>{number(team.sortOrder3, 2)}</td>{/if}
            <td>{number(scope === 'global' ? team.o.opr : team.o.localOpr)}</td>
            <td>{number(scope === 'global' ? team.o.autoOpr : team.o.localAutoOpr)}</td>
            <td>{number(scope === 'global' ? team.o.dcOpr : team.o.localDcOpr)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
