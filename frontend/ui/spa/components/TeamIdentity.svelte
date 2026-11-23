<script>
  import TeamChip from './TeamChip.svelte';

  let {
    team,
    alliance = '',
    ourTeam = null,
    onOpen = () => {},
    interactive = true,
    variant = '',
    children = null,
  } = $props();
  const number = $derived(typeof team === 'number' ? team : team?.teamNumber);
  const name = $derived(typeof team === 'number' ? '' : team?.teamName || team?.nameShort || '');
</script>

{#if number != null}
  <span class="team-identity {variant}">
    <TeamChip {team} {alliance} {ourTeam} {onOpen} {interactive} />
    {#if name || children}
      <span class="team-identity-detail">
        {#if name}
          {#if interactive}
            <button
              type="button"
              class="team-identity-name"
              title={name}
              onclick={(event) => {
                event.stopPropagation();
                onOpen(number);
              }}
            >
              {name}
            </button>
          {:else}
            <span class="team-identity-name" title={name}>{name}</span>
          {/if}
        {/if}
        {@render children?.()}
      </span>
    {/if}
  </span>
{/if}
