<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { api } from '../lib/api.js';
  import { isOurMatch } from '../lib/helpers.js';
  import { loadMatchData } from '../lib/match-data.js';
  import { onPageRefresh } from '../lib/refresh.js';
  import MatchRow from '../components/MatchRow.svelte';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';

  let { settings, onMatch, onTeam } = $props();
  let loading = $state(true);
  let error = $state('');
  let matches = $state([]);
  let metrics = $state({ scores: {}, oprs: {} });
  const filter = writable('all');
  let selected = $state('all');
  const teamNumber = $derived(Number(settings.team_number));
  const displayed = $derived(
    matches.filter((match) => {
      if (selected === 'ours') return isOurMatch(match, teamNumber);
      if (selected === 'upcoming') return match.scoreRedFinal == null;
      return true;
    }),
  );

  onMount(() => {
    let active = true;
    let request = 0;
    const load = async () => {
      const id = ++request;
      try {
        const [scheduleData, matchData] = await Promise.all([
          api.schedule(),
          loadMatchData(settings),
        ]);
        if (!active || id !== request) return;
        matches = scheduleData.schedule || [];
        metrics = matchData;
        error = '';
        loading = false;
      } catch (reason) {
        if (active && id === request) {
          error = reason.message;
          loading = false;
        }
      }
    };
    void load();
    const unsubscribe = onPageRefresh(load);
    return () => {
      active = false;
      unsubscribe();
    };
  });
</script>

{#if !settings.active_event_code}
  <div class="empty-state">Choose an event in Settings.</div>
{:else if loading}
  <div class="loading">Loading</div>
{:else if error}
  <div class="svelte-error">{error}</div>
{:else}
  <SegmentedTabs
    items={[
      { key: 'all', label: 'All' },
      { key: 'ours', label: 'Ours' },
      { key: 'upcoming', label: 'Upcoming' },
    ]}
    activeTab={filter}
    onSelect={(value) => {
      selected = value;
      filter.set(value);
    }}
  />
  {#if displayed.length}
    {#each displayed as match (match.matchNumber)}
      <MatchRow {match} {teamNumber} {onMatch} {onTeam} {metrics} />
    {/each}
  {:else}
    <div class="empty-state">No matches.</div>
  {/if}
{/if}
