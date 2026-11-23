<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { groupPlayoffRounds, resolveBracket } from '../lib/playoffs.js';
  import { teamsFor, isOurMatch } from '../lib/helpers.js';
  import MatchRow from '../components/MatchRow.svelte';
  import TeamChip from '../components/TeamChip.svelte';

  let { settings, onTeam, onMatch } = $props();
  let loading = $state(true),
    error = $state(''),
    matches = $state([]),
    alliances = $state([]);
  const bracket = $derived(resolveBracket(alliances, matches));
  const rounds = $derived(groupPlayoffRounds(matches));
  const orderedSlots = $derived(bracket ? Object.values(bracket.slots) : []);
  const upper = $derived(orderedSlots.filter((slot) => slot.t.bracket === 'upper'));
  const lower = $derived(orderedSlots.filter((slot) => slot.t.bracket === 'lower'));
  const rosterFor = (n) => bracket?.rosters?.[n] || [];
  const matchFor = (slot) => slot.match?.m;
  onMount(() => {
    let active = true;
    Promise.all([api.playoffSchedule(), api.alliances()])
      .then(([result, allianceData]) => {
        if (!active) return;
        matches = result.schedule || [];
        alliances = allianceData.alliances || allianceData.Alliances || [];
        loading = false;
      })
      .catch((e) => {
        if (active) {
          error = e.message;
          loading = false;
        }
      });
    return () => {
      active = false;
    };
  });
</script>

{#if loading}<div class="loading">Loading</div>
{:else if error}<div class="svelte-error">{error}</div>
{:else}
  {#if alliances.length}
    <div class="card">
      <div class="card-header"><span class="card-title">Alliances</span></div>
      <div class="po-alliance-grid">
        {#each alliances as alliance (alliance.number)}
          {@const members = rosterFor(alliance.number).length
            ? rosterFor(alliance.number)
            : [
                alliance.captain,
                alliance.round1,
                alliance.round2,
                alliance.round3,
                alliance.backup,
              ].filter((n) => n > 0)}
          <div
            class="po-alliance"
            class:po-ours={members.some((n) => Number(n) === Number(settings.team_number))}
          >
            <div class="po-alliance-num">A{alliance.number}</div>
            <div class="po-alliance-members">
              {#if !members.length}<div class="po-member">TBD</div>{/if}
              {#each members as member, index (member)}
                <div class="po-member" class:our={Number(member) === Number(settings.team_number)}>
                  <button class="po-member-num" onclick={() => onTeam(member)}>
                    {member}
                  </button>{#if index === 0}<span class="po-member-role">Captain</span>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  {#if bracket}
    <div class="bk-root">
      {#each [{ key: 'upper', label: 'Upper bracket', slots: upper }, { key: 'lower', label: 'Lower bracket', slots: lower }] as section (section.key)}
        {#if section.slots.length}
          <section class="bk-section">
            <div class="section-label">{section.label}</div>
            <div class="bk-round">
              {#each section.slots as slot (slot.t.m)}
                <div class="card bk-match">
                  <div class="card-header">
                    <span class="card-title">M{slot.t.m}</span>{#if matchFor(slot)}<span>
                        {matchFor(slot).description || ''}
                      </span>{/if}
                  </div>
                  <div class="match-scoring-row">
                    <span>Red</span><span>
                      {slot.redA != null ? `Alliance ${slot.redA}` : slot.redLabel}
                    </span><span>{matchFor(slot)?.scoreRedFinal ?? '–'}</span>
                  </div>
                  <div class="match-scoring-row">
                    <span>Blue</span><span>
                      {slot.blueA != null ? `Alliance ${slot.blueA}` : slot.blueLabel}
                    </span><span>{matchFor(slot)?.scoreBlueFinal ?? '–'}</span>
                  </div>
                  {#if slot.winnerA}<div style="color:var(--green);font-size:.75rem">
                      Winner: Alliance {slot.winnerA}
                    </div>{/if}
                  {#if matchFor(slot)}<button
                      class="btn btn-secondary btn-sm"
                      onclick={() => onMatch(matchFor(slot))}
                    >
                      Details
                    </button>{/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}
      {/each}
      <section class="bk-section">
        <div class="section-label">Finals</div>
        <div class="card">
          <div>
            {bracket.finals.redA != null
              ? `Alliance ${bracket.finals.redA}`
              : bracket.finals.redLabel} vs {bracket.finals.blueA != null
              ? `Alliance ${bracket.finals.blueA}`
              : bracket.finals.blueLabel}
          </div>
          {#each bracket.finals.games as game}<button
              class="match-row"
              style="width:100%"
              onclick={() => onMatch(game.m)}
            >
              M{game.m.matchNumber}<span style="margin-left:auto">
                {game.m.scoreRedFinal ?? '–'}–{game.m.scoreBlueFinal ?? '–'}
              </span>
            </button>{/each}
          {#if bracket.finals.championA}<div class="card-title">
              Champion: Alliance {bracket.finals.championA}
            </div>{/if}
        </div>
      </section>
    </div>
  {:else if rounds.length}
    {#each rounds as round (round.label)}
      <div class="section-label">{round.label}</div>
      {#each round.matches as match (match.matchNumber)}<MatchRow
          {match}
          teamNumber={settings.team_number}
          {onTeam}
          {onMatch}
        />{/each}
    {/each}
  {:else}<div class="empty-state">No playoff matches yet.</div>{/if}
{/if}
