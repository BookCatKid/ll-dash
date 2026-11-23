<script>
  import Modal from './Modal.svelte';
  import StatHelp from './StatHelp.svelte';
  import { statHelp } from '../lib/stat-help.js';
  import { teamStatistics } from '../lib/team-statistics.js';

  let { rank = null, matches = [], teamNumber, teamCount = 0, season, className = '' } = $props();
  let selectedStatId = $state(null);
  const data = $derived(teamStatistics({ rank, matches, teamNumber, teamCount, season }));
  const selectedStat = $derived(data.stats.find((stat) => stat.id === selectedStatId));
</script>

<div class="stat-grid stat-grid-3 {className}">
  {#each data.stats as stat (stat.id)}
    <button
      type="button"
      class="stat-box stat-box-link"
      aria-label={`Explain ${stat.label}`}
      onclick={() => (selectedStatId = stat.id)}
    >
      <span class="stat-value">{stat.value}</span>
      <span class="stat-label">{stat.label}</span>
    </button>
  {/each}
</div>

{#if selectedStat}
  <Modal open title={statHelp[selectedStat.id].title} onClose={() => (selectedStatId = null)}>
    <StatHelp stat={selectedStat} context={data.context} />
  </Modal>
{/if}
