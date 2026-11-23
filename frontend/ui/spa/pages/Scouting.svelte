<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import { api } from '../lib/api.js';
  import { onPageRefresh } from '../lib/refresh.js';
  import Icon from '../components/Icon.svelte';
  import { formatTime } from '../lib/helpers.js';
  let { settings, notify, onTeam, initialTeam = null } = $props();
  let selected = $state('add');
  const selection = writable('add');
  let loading = $state(true);
  let ranks = $state([]),
    schedule = $state([]),
    fields = $state([]),
    flags = $state([]),
    notes = $state([]);
  let teamInput = $state('');
  let scoutName = $state(''),
    matchNumber = $state(''),
    chosenFlag = $state('neutral');
  let values = $state({});
  let saving = $state(false);
  let query = $state('');
  const legacyKeys = new Set([
    'driver_rating',
    'auto_score',
    'teleop_score',
    'endgame_score',
    'penalties',
  ]);
  const suggestions = $derived(
    ranks
      .filter(
        (rank) =>
          String(rank.teamNumber).includes(teamInput.toLowerCase()) ||
          (rank.teamName || '').toLowerCase().includes(teamInput.toLowerCase()),
      )
      .slice(0, 8),
  );
  const searchResults = $derived(
    ranks.filter(
      (rank) =>
        String(rank.teamNumber).includes(query.toLowerCase()) ||
        (rank.teamName || '').toLowerCase().includes(query.toLowerCase()),
    ),
  );
  const upcoming = $derived(schedule.filter((match) => match.scoreRedFinal == null));
  const groupedNotes = $derived(
    Object.entries(
      notes.reduce((groups, note) => {
        (groups[note.team_number] ??= []).push(note);
        return groups;
      }, {}),
    ).sort(([a], [b]) => Number(a) - Number(b)),
  );

  function parseNotes(note) {
    try {
      const value = JSON.parse(note.notes || '{}');
      if (value && typeof value === 'object') return value;
    } catch {
      /* legacy */
    }
    return { auto: note.auto_description, park: note.endgame_description, other: note.notes };
  }
  function selectTab(value) {
    selected = value;
    selection.set(value);
    if (value === 'view') void loadNotes();
  }
  async function loadNotes() {
    try {
      notes = await api.scouting();
    } catch (e) {
      notify(e.message);
    }
  }
  onMount(() => {
    teamInput = initialTeam == null ? '' : String(initialTeam);
    let active = true;
    try {
      scoutName = localStorage.getItem('scout_name') || '';
    } catch {
      /* disabled storage */
    }
    const reload = () =>
      Promise.all([api.rankings(), api.schedule(), api.scoutingFields(), api.flagCategories()])
        .then(([rankData, schedData, scoutFields, cats]) => {
          if (!active) return;
          ranks = rankData.rankings || rankData.Rankings || [];
          schedule = schedData.schedule || [];
          fields = scoutFields || [];
          flags = cats || [];
          loading = false;
        })
        .catch((e) => {
          if (active) {
            notify(e.message);
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
  async function save() {
    const teamNumber = Number(teamInput.match(/^\d+/)?.[0]);
    if (!teamNumber) {
      notify('Enter a team number');
      return;
    }
    const missing = fields.filter(
      (field) => field.required && (values[field.key] == null || values[field.key] === ''),
    );
    if (missing.length) {
      notify(`Fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    const payload = {
      team_number: teamNumber,
      scout_name: scoutName.trim() || 'Anonymous',
      match_number: matchNumber || null,
    };
    const extra = {};
    for (const [key, value] of Object.entries(values)) {
      if (value == null || value === '') continue;
      if (legacyKeys.has(key)) payload[key] = Number(value);
      else extra[key] = value;
    }
    if (Object.keys(extra).length) payload.notes = JSON.stringify(extra);
    saving = true;
    try {
      await api.addScouting(payload);
      if (chosenFlag !== 'neutral') await api.setFlag(teamNumber, chosenFlag).catch(() => {});
      localStorage.setItem('scout_name', scoutName);
      values = {};
      teamInput = '';
      matchNumber = '';
      chosenFlag = 'neutral';
      notify('Note saved');
    } catch (e) {
      notify(e.message || 'Save failed');
    } finally {
      saving = false;
    }
  }
  async function removeNote(id) {
    try {
      await api.deleteScouting(id);
      notes = notes.filter((n) => n.id !== id);
      notify('Deleted');
    } catch (e) {
      notify(e.message);
    }
  }
  function changeStar(field, value) {
    values = { ...values, [field]: value };
  }
</script>

{#if loading}<div class="loading">Loading</div>
{:else}
  <SegmentedTabs
    items={[
      { key: 'add', label: 'Add note' },
      { key: 'view', label: 'View notes' },
      { key: 'search', label: 'Find team' },
    ]}
    activeTab={selection}
    onSelect={selectTab}
  />
  {#if selected === 'add'}
    <div class="card">
      <div class="form-group">
        <label class="form-label" for="sc-team">Team</label><input
          id="sc-team"
          class="form-input"
          bind:value={teamInput}
          placeholder="Number or name"
          autocomplete="off"
        />
        {#if teamInput && !/^\d+$/.test(teamInput)}
          <div class="event-search-results">
            {#each suggestions as rank}<button
                class="team-search-result"
                style="display:block;width:100%;text-align:left"
                onclick={() => (teamInput = String(rank.teamNumber))}
              >
                {rank.teamNumber}
                {rank.teamName}
              </button>{/each}
          </div>
        {/if}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="sc-name">Scout name</label><input
            class="form-input"
            id="sc-name"
            bind:value={scoutName}
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="sc-match">Match</label><select
            class="form-select"
            id="sc-match"
            bind:value={matchNumber}
          >
            <option value="">General</option>{#each upcoming as match}<option
                value={match.matchNumber}
              >
                Q{match.matchNumber} · {formatTime(match.startTime)}
              </option>{/each}
          </select>
        </div>
      </div>
      {#each fields as field (field.key)}
        <div class="form-group">
          <span class="form-label">{field.label}{field.required ? ' *' : ''}</span>
          {#if field.type === 'stars'}<div class="star-rating">
              {#each [1, 2, 3, 4, 5] as star}<button
                  class="star"
                  class:active={Number(values[field.key] || 0) >= star}
                  onclick={() => changeStar(field.key, star)}
                >
                  ★
                </button>{/each}
            </div>
          {:else if field.type === 'textarea'}<textarea
              class="form-textarea"
              placeholder={field.placeholder || ''}
              bind:value={values[field.key]}></textarea>
          {:else if field.type === 'number'}<input
              class="form-input"
              type="number"
              placeholder={field.placeholder || '0'}
              bind:value={values[field.key]}
            />
          {:else if field.type === 'select'}<select
              class="form-select"
              bind:value={values[field.key]}
            >
              <option value="">Select</option>{#each field.options || [] as option}<option
                  value={option}
                >
                  {option}
                </option>{/each}
            </select>
          {:else}<input
              class="form-input"
              placeholder={field.placeholder || ''}
              bind:value={values[field.key]}
            />{/if}
        </div>
      {/each}
      <div class="form-group">
        <span class="form-label">Alliance flag</span>
        <div class="flag-row">
          {#each [{ key: 'neutral', label: 'Neutral' }, ...flags] as flag (flag.key)}<button
              class="flag-btn"
              class:active={chosenFlag === flag.key}
              onclick={() => (chosenFlag = flag.key)}
            >
              {flag.label}
            </button>{/each}
        </div>
      </div>
      <button class="btn btn-primary btn-block" disabled={saving} onclick={save}>
        Save scouting note
      </button>
    </div>
  {:else if selected === 'view'}
    {#if !groupedNotes.length}<div class="empty-state">No scouting notes yet.</div>{/if}
    {#each groupedNotes as [team, entries] (team)}
      <div class="card">
        <div class="card-header">
          <button class="card-title" onclick={() => onTeam(Number(team))}>
            {team}
            {ranks.find((r) => r.teamNumber === Number(team))?.teamName || ''}
          </button><span>{entries.length}</span>
        </div>
        {#each entries as note (note.id)}
          <div style="border-top:1px solid var(--border);padding:.6rem 0;display:flex;gap:.5rem">
            <div style="flex:1">
              <span style="font-size:.73rem;color:var(--text2)">
                {note.scout_name}{note.match_number ? ` · Q${note.match_number}` : ''}
              </span>
              {#each Object.entries(parseNotes(note)) as [key, value] (key)}
                {#if value !== null && value !== '' && value !== undefined}<div
                    class="note-section"
                  >
                    <span class="note-section-label">
                      {fields.find((f) => f.key === key)?.label || key.replaceAll('_', ' ')}
                    </span><span style="white-space:pre-wrap">{value}</span>
                  </div>{/if}
              {/each}
            </div>
            <button
              class="icon-btn cfg-mini"
              aria-label="Delete note"
              onclick={() => removeNote(note.id)}
            >
              <Icon name="trash-2" size={17} />
            </button>
          </div>
        {/each}
      </div>
    {/each}
  {:else}
    <div class="card">
      <label class="form-label" for="sc-search">Find team</label><input
        class="form-input"
        id="sc-search"
        bind:value={query}
        placeholder="Number or name"
      />
      {#if query}{#each searchResults as rank (rank.teamNumber)}<button
            class="match-row"
            style="width:100%"
            onclick={() => onTeam(rank.teamNumber)}
          >
            <span class="match-num">{rank.teamNumber}</span><span>{rank.teamName}</span><span
              style="margin-left:auto"
            >
              #{rank.rank}
            </span>
          </button>{/each}{/if}
    </div>
  {/if}
{/if}
