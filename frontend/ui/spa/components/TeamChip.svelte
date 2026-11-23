<script>
  let { team, alliance = '', ourTeam = null, onOpen = () => {}, interactive = true } = $props();
  const number = $derived(typeof team === 'number' ? team : team?.teamNumber);
  const name = $derived(typeof team === 'number' ? '' : team?.teamName || team?.nameShort || '');
</script>

{#if number != null}
  {#if interactive}
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
  {:else}
    <span
      class="team-chip {alliance.toLowerCase()}"
      class:our={Number(number) === Number(ourTeam)}
      title={name || `Team ${number}`}
    >
      {number}
    </span>
  {/if}
{/if}
