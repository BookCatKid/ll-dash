<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { isOurMatch, allianceFor, computeRp, number as displayNumber } from '../lib/helpers.js';
  import TeamStatGrid from './TeamStatGrid.svelte';
  import TeamIdentity from './TeamIdentity.svelte';

  let { number, settings, notify, onScout, onMatch } = $props();
  let rank = $state(null);
  let teamCount = $state(0);
  let matches = $state([]);
  let notes = $state([]);
  let categories = $state([]);
  let fields = $state([]);
  let chosen = $state('neutral');
  let stats = $state(null);
  let history = $state([]);
  let matchScores = $state({});
  let loading = $state(true);
  let error = $state('');

  const season = $derived(Number(settings.active_season));
  const played = $derived(matches.filter((match) => match.scoreRedFinal != null));
  const globalStats = $derived([
    { label: 'Total npOPR', data: stats?.tot || stats?.totalNp },
    { label: 'Auto OPR', data: stats?.auto || stats?.autonomousNp },
    { label: 'TeleOp OPR', data: stats?.dc || stats?.teleop || stats?.driverControlled },
    { label: 'Endgame OPR', data: stats?.eg || stats?.endgame },
  ]);

  function noteSections(note) {
    /** @type {Record<string, any>} */
    let parsed = {};
    if (note.notes) {
      try {
        const content = JSON.parse(note.notes);
        if (content && typeof content === 'object' && !Array.isArray(content)) {
          parsed = content;
        } else {
          parsed = { other: note.notes };
        }
      } catch {
        parsed = { other: note.notes };
      }
    }
    if (note.auto_description && !parsed.auto) parsed.auto = note.auto_description;
    if (note.endgame_description && !parsed.park) parsed.park = note.endgame_description;
    return Object.entries(parsed)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        label: fields.find((field) => field.key === key)?.label || key.replaceAll('_', ' '),
        value: String(value),
      }));
  }

  function matchRP(match) {
    const entry = matchScores[match.matchNumber];
    if (!entry) return null;
    const side = allianceFor(match, number);
    const won = side === 'Red' ? match.redWins : match.blueWins;
    const tied = match.redWins === false && match.blueWins === false;
    return computeRp(entry[side.toLowerCase()], won, tied, season);
  }

  onMount(() => {
    let active = true;
    const seasonCode = Number(settings.active_season);
    Promise.all([
      api.rankings(),
      api.schedule(),
      api.scouting(number),
      api.flags(),
      api.flagCategories(),
      api.scoutingFields(),
      api.ftcTeam(number, seasonCode).catch(() => null),
      api.ftcTeamEvents(number, seasonCode).catch(() => []),
      api.ftcEventScores(settings.active_event_code, seasonCode).catch(() => null),
    ])
      .then(
        ([ranks, schedule, scouting, flagData, flags, fieldData, ftcData, events, scoreData]) => {
          if (!active) return;
          const rankedTeams = ranks.rankings || ranks.Rankings || [];
          rank = rankedTeams.find((row) => Number(row.teamNumber) === Number(number)) || null;
          teamCount = rankedTeams.length;
          matches = (schedule.schedule || []).filter((match) => isOurMatch(match, number));
          notes = Array.isArray(scouting) ? scouting : [];
          categories = flags || [];
          fields = fieldData || [];
          chosen = flagData?.[String(number)]?.flag || 'neutral';
          stats = ftcData;
          history = Array.isArray(events)
            ? [...events].sort(
                (a, b) => Date.parse(a.eventDate || 0) - Date.parse(b.eventDate || 0),
              )
            : [];
          matchScores = Object.fromEntries(
            (scoreData?.matches || [])
              .filter(
                (match) =>
                  !match.tournamentLevel || ['Quals', 'qual'].includes(match.tournamentLevel),
              )
              .map((match) => [match.matchNum, { red: match.red, blue: match.blue }]),
          );
          loading = false;
        },
      )
      .catch((reason) => {
        if (active) {
          error = reason.message;
          loading = false;
        }
      });
    return () => {
      active = false;
    };
  });

  async function setFlag(value) {
    try {
      await api.setFlag(number, value);
      chosen = value;
      notify('Flag updated');
    } catch (reason) {
      notify(reason.message);
    }
  }
</script>

{#if loading}
  <div class="loading">Loading</div>
{:else if error}
  <div class="svelte-error">{error}</div>
{:else}
  <div class="team-profile-heading">
    <TeamIdentity
      team={rank || { teamNumber: number, teamName: `Team ${number}` }}
      ourTeam={settings.team_number}
      interactive={false}
    />
    <a href="https://ftcscout.org/teams/{number}" target="_blank" rel="noopener noreferrer">
      FTCScout
    </a>
  </div>
  <TeamStatGrid
    {rank}
    {matches}
    teamNumber={number}
    {teamCount}
    season={settings.active_season}
    className="team-profile-stat-grid"
  />
  {#if stats && (stats.tot || stats.totalNp)}
    <section class="card" style="margin-bottom:1rem">
      <div class="card-header">
        <span class="card-title">FTCScout OPR · {season}–{String(season + 1).slice(-2)}</span>
        {#if stats.count}<span style="color:var(--text3);font-size:.65rem">
            {stats.count} events
          </span>{/if}
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        {#each globalStats as entry (entry.label)}
          <div class="stat-box">
            <div>
              <strong style="color:var(--accent2)">{displayNumber(entry.data?.value, 2)}</strong>
              {#if entry.data?.rank != null}<span style="font-size:.65rem;color:var(--text3)">
                  #{entry.data.rank}
                </span>{/if}
            </div>
            <div class="stat-label">{entry.label}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
  <div class="setting-group" style="margin-bottom:1rem">
    <span class="form-label">Alliance flag</span>
    <div class="flag-row" style="flex-wrap:wrap">
      {#each [{ key: 'neutral', label: 'Neutral', color: 'var(--text2)', icon: '' }, ...categories] as flag (flag.key)}
        <button
          class="flag-btn"
          class:active={chosen === flag.key}
          style:border-color={chosen === flag.key ? flag.color : undefined}
          onclick={() => setFlag(flag.key)}
        >
          {flag.icon ? `${flag.icon} ` : ''}{flag.label}
        </button>
      {/each}
    </div>
  </div>
  {#if played.length}
    <div class="form-label">Match results at this event</div>
    {#each [...played].slice(-4).reverse() as match (match.matchNumber)}
      {@const side = allianceFor(match, number)}
      {@const won = side === 'Red' ? match.redWins : match.blueWins}
      {@const tied = match.redWins === false && match.blueWins === false}
      <button
        class="match-detail-row"
        style="display:flex;gap:.5rem;align-items:center;width:100%;text-align:left"
        onclick={() => onMatch(match)}
      >
        <span style="color:var(--text3)">Q{match.matchNumber}</span>
        <span style:color={side === 'Red' ? 'var(--alliance-red)' : 'var(--alliance-blue)'}>
          {side}
        </span>
        <span style="flex:1">
          {side === 'Red' ? match.scoreRedFinal : match.scoreBlueFinal} pts
        </span>
        {#if matchRP(match) != null}<strong style="color:var(--accent)">
            {matchRP(match)} RP
          </strong>{/if}
        <strong style:color={won ? 'var(--green)' : tied ? 'var(--yellow)' : 'var(--red)'}>
          {won ? 'W' : tied ? 'T' : 'L'}
        </strong>
      </button>
    {/each}
  {/if}
  <div class="form-label" style="margin-top:1rem">Scouting notes ({notes.length})</div>
  {#if !notes.length}<div class="empty-state" style="padding:.6rem 0">
      No scouting notes yet.
    </div>{/if}
  {#each notes as note (note.id)}
    <div style="border-top:1px solid var(--border);padding:.65rem 0">
      <div
        style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text2);margin-bottom:.3rem"
      >
        <span>{note.scout_name}{note.match_number ? ` · Q${note.match_number}` : ''}</span>
        {#if note.driver_rating}<span style="color:var(--accent)">
            {'★'.repeat(Math.min(5, note.driver_rating))}
          </span>{/if}
      </div>
      {#if note.auto_score != null || note.teleop_score != null || note.endgame_score != null}
        <div
          style="display:flex;gap:.4rem;flex-wrap:wrap;color:var(--text2);font-size:.7rem;margin-bottom:.4rem"
        >
          {#if note.auto_score != null}<span>Auto {note.auto_score}</span>{/if}
          {#if note.teleop_score != null}<span>TeleOp {note.teleop_score}</span>{/if}
          {#if note.endgame_score != null}<span>Endgame {note.endgame_score}</span>{/if}
        </div>
      {/if}
      {#each noteSections(note) as section (section.label)}
        <div class="note-section">
          <span class="note-section-label">{section.label}</span><span style="white-space:pre-wrap">
            {section.value}
          </span>
        </div>
      {/each}
    </div>
  {/each}
  {#if history.length}
    <div class="form-label" style="margin-top:1rem">
      Season history · {season}–{String(season + 1).slice(-2)}
    </div>
    {#each history as event (event.eventCode)}
      <div class="card" style="margin-bottom:.4rem">
        <div style="display:flex;justify-content:space-between;gap:.5rem">
          <div style="font-weight:600">{event.eventName || event.eventCode}</div>
          {#if event.stats?.rank != null}<strong style="color:var(--accent)">
              #{event.stats.rank}
            </strong>{/if}
        </div>
        <div style="font-size:.68rem;color:var(--text2);margin:.2rem 0">
          {event.eventDate
            ? new Date(event.eventDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : ''}
          {#if event.eventCity}
            · {event.eventCity}{/if}
          {#if event.eventCode}
            · {event.eventCode}{/if}
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;font-size:.7rem;color:var(--text2)">
          {#if event.stats?.wins != null}<span>{event.stats.wins}W–{event.stats.losses}L</span>{/if}
          {#if event.stats?.qualMatchesPlayed != null}<span>
              {event.stats.qualMatchesPlayed} matches
            </span>{/if}
          {#if event.stats?.rp != null}<span>RP {displayNumber(event.stats.rp, 2)}/match</span>{/if}
          {#if event.stats?.tot?.value != null}<span>
              npOPR {displayNumber(event.stats.tot.value, 1)}
            </span>{/if}
        </div>
      </div>
    {/each}
  {/if}
  <button
    class="btn btn-secondary btn-block"
    style="margin-top:1rem"
    onclick={() => onScout(number)}
  >
    Add scouting note for {number}
  </button>
{/if}
