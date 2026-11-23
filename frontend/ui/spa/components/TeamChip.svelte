<script>
  let { team, alliance = '', ourTeam = null, onOpen = () => {} } = $props();
  const number = $derived(typeof team === 'number' ? team : team?.teamNumber);
  const name = $derived(typeof team === 'number' ? '' : team?.teamName || team?.nameShort || '');
</script>

{#if number != null}
  <button
    type="button"
    class="team-chip {alliance.toLowerCase()}"
    class:our={Number(number) === Number(ourTeam)}
    title={name || `Team ${number}`}
    onclick={(event) => {
      event.stopPropagation();
      onOpen(number);
    }}
  >
    {number}
  </button>
{/if}
