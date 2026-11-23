<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import TeamIdentity from '../components/TeamIdentity.svelte';
  import { onPageRefresh } from '../lib/refresh.js';
  let { settings, onTeam } = $props();
  let loading = $state(true),
    error = $state(''),
    awards = $state([]),
    names = $state({});
  const order = [
    'inspire',
    'think',
    'connect',
    'innovate',
    'control',
    'motivate',
    'design',
    'judges',
    'promote',
    'compass',
    'reach',
    'sustain',
    'leadership',
  ];
  function strip(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function split(name) {
    const value = strip(name);
    const place = value.match(/^(.*?)\s+(2nd|3rd|4th|5th|6th)\s+Place$/i);
    if (place) return { base: place[1], place: place[2] };
    const role = value.match(/^(.*?)\s*-\s*(Captain|\d(?:st|nd|rd|th) Team Selected|Backup)$/i);
    if (role) return { base: role[1], place: role[2] };
    return { base: value, place: '' };
  }
  const groups = $derived.by(() => {
    const map = new Map();
    for (const entry of awards) {
      if (entry.teamNumber == null && !entry.person) continue;
      const detail = split(entry.name || entry.awardName);
      if (!map.has(detail.base)) map.set(detail.base, []);
      map.get(detail.base).push({ ...entry, place: detail.place });
    }
    const priority = (name) => {
      const low = name.toLowerCase();
      if (low.includes('winning alliance')) return -2;
      if (low.includes('finalist alliance')) return -1;
      const i = order.findIndex((k) => low.includes(k));
      return i < 0 ? 100 : i;
    };
    return [...map.entries()].sort(([a], [b]) => priority(a) - priority(b));
  });
  onMount(() => {
    let active = true;
    const reload = () =>
      Promise.all([api.awards(), api.rankings(), api.teams()])
        .then(([data, ranks, teams]) => {
          if (!active) return;
          awards = data.awards || data.Awards || [];
          names = Object.fromEntries([
            ...(ranks.rankings || []).map((r) => [r.teamNumber, r.teamName]),
            ...(teams.teams || []).map((t) => [t.teamNumber, t.nameShort]),
          ]);
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

{#if loading}<div class="loading">Loading</div>
{:else if error}<div class="svelte-error">{error}</div>
{:else if !groups.length}<div class="empty-state">No awards posted yet.</div>
{:else}
  {#each groups as [name, entries] (name)}
    <div class="card">
      <div class="card-header"><span class="card-title">{name}</span></div>
      {#each entries as award}
        <div
          class="award-row"
          class:award-ours={settings.awards_highlight_ours !== false &&
            Number(award.teamNumber) === Number(settings.team_number)}
        >
          {#if award.place}<span class="award-place">{award.place}</span>{/if}
          {#if award.teamNumber}
            <TeamIdentity
              team={{
                teamNumber: award.teamNumber,
                teamName: names[award.teamNumber] || strip(award.fullTeamName || award.teamName),
              }}
              ourTeam={settings.team_number}
              onOpen={onTeam}
            />
          {/if}
          {#if award.person}<span>{award.person}</span>{/if}
        </div>
      {/each}
    </div>
  {/each}
{/if}
