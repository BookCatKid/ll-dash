<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import { api } from '../lib/api.js';
  import { onPageRefresh } from '../lib/refresh.js';
  import Icon from '../components/Icon.svelte';

  let { notify } = $props();
  let tab = $state('notes'),
    selected = writable('notes');
  let notes = $state([]),
    checklists = $state([]),
    loading = $state(true);
  let title = $state(''),
    body = $state(''),
    author = $state(''),
    category = $state('general'),
    pinned = $state(false);
  let checklistName = $state(''),
    checklistItems = $state(''),
    adding = $state(false);
  const defaults = [
    {
      id: 'pre-match',
      name: 'Pre-match checklist',
      items: [
        'Battery charged and secured',
        'Cables secured',
        'Correct robot config',
        'Driver station connected',
        'Motors and servos tested',
        'Autonomous selected',
        'Alliance station confirmed',
        'Starting position confirmed',
      ],
    },
    {
      id: 'pit',
      name: 'Pit checklist',
      items: [
        'Spare batteries charging',
        'Tools organized',
        'Backup device ready',
        'Repair parts available',
        'Match schedule visible',
        'Team roles assigned',
      ],
    },
    {
      id: 'inspection',
      name: 'Robot inspection',
      items: [
        'Robot weight legal',
        'Size legal',
        'Motors legal',
        'Battery connector correct',
        'REV firmware updated',
        'No sharp edges',
      ],
    },
  ];
  let checked = $state({});
  const lists = $derived([...defaults, ...checklists.map((cl) => ({ ...cl, id: `db-${cl.id}` }))]);
  function select(key) {
    tab = key;
    selected.set(key);
    if (key === 'notes') void reloadNotes();
    if (key === 'checklists') void reloadChecklists();
  }
  onMount(() => {
    let active = true;
    try {
      author = localStorage.getItem('hub_author') || '';
    } catch {
      /* storage */
    }
    const reload = () =>
      Promise.all([api.notes(), api.checklists()])
        .then(([n, c]) => {
          if (active) {
            notes = n || [];
            checklists = c || [];
            loading = false;
          }
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
  async function reloadNotes() {
    try {
      notes = await api.notes();
    } catch (e) {
      notify(e.message);
    }
  }
  async function reloadChecklists() {
    try {
      checklists = await api.checklists();
    } catch (e) {
      notify(e.message);
    }
  }
  async function add() {
    if (!title.trim() || !body.trim()) {
      notify('Enter title and content');
      return;
    }
    try {
      await api.addNote({
        title: title.trim(),
        author: author.trim() || 'Anonymous',
        content: body,
        category,
        pinned,
      });
      localStorage.setItem('hub_author', author);
      title = '';
      body = '';
      pinned = false;
      notify('Saved');
      select('notes');
    } catch (e) {
      notify(e.message);
    }
  }
  async function remove(id) {
    try {
      await api.deleteNote(id);
      notes = notes.filter((n) => n.id !== id);
      notify('Deleted');
    } catch (e) {
      notify(e.message);
    }
  }
  function savedItems(id) {
    if (checked[id] !== undefined) return checked[id];
    try {
      const stored = JSON.parse(localStorage.getItem(`cl_${id}`) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }
  function toggleItem(id, index) {
    const items = savedItems(id);
    checked = {
      ...checked,
      [id]: items.includes(index) ? items.filter((n) => n !== index) : [...items, index],
    };
    localStorage.setItem(`cl_${id}`, JSON.stringify(checked[id]));
  }
  async function createChecklist() {
    if (!checklistName.trim() || !checklistItems.trim()) {
      notify('Enter name and items');
      return;
    }
    try {
      await api.addChecklist({
        name: checklistName.trim(),
        items: checklistItems
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      checklistName = '';
      checklistItems = '';
      adding = false;
      await reloadChecklists();
      notify('Saved');
    } catch (e) {
      notify(e.message);
    }
  }
</script>

{#if loading}<div class="loading">Loading</div>
{:else}
  <SegmentedTabs
    items={[
      { key: 'notes', label: 'Notes' },
      { key: 'new', label: 'New' },
      { key: 'checklists', label: 'Checklists' },
    ]}
    activeTab={selected}
    onSelect={select}
  />
  {#if tab === 'notes'}
    {#if !notes.length}<div class="empty-state">No notes yet.</div>{/if}
    {#each notes as note (note.id)}
      <div class="hub-note" class:pinned={note.pinned}>
        <div class="hub-note-header">
          <span class="hub-note-title">{note.title}</span><span class="hub-note-cat">
            {note.category}
          </span>
        </div>
        <div class="hub-note-content" style="white-space:pre-wrap">{note.content}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.5rem">
          <span class="hub-note-meta">
            {note.author} · {new Date(note.created_at).toLocaleDateString()}
          </span><button
            class="icon-btn cfg-mini"
            aria-label="Delete note"
            onclick={() => remove(note.id)}
          >
            <Icon name="trash-2" size={17} />
          </button>
        </div>
      </div>
    {/each}
  {:else if tab === 'new'}
    <div class="card">
      <div class="form-group">
        <label class="form-label" for="hub-title">Title</label><input
          class="form-input"
          id="hub-title"
          bind:value={title}
        />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="hub-author">Author</label><input
            class="form-input"
            id="hub-author"
            bind:value={author}
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="hub-category">Category</label><select
            class="form-select"
            id="hub-category"
            bind:value={category}
          >
            <option>general</option><option>strategy</option><option>checklist</option><option>
              announcement
            </option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="hub-content">Content</label><textarea
          class="form-textarea"
          id="hub-content"
          bind:value={body}
          style="min-height:140px"></textarea>
      </div>
      <label class="form-group" style="display:flex;gap:.5rem;align-items:center">
        <input type="checkbox" bind:checked={pinned} />Pin to top
      </label>
      <button class="btn btn-primary btn-block" onclick={add}>Save note</button>
    </div>
  {:else}
    {#each lists as checklist (checklist.id)}
      <div class="card">
        <div class="card-header">
          <span class="card-title">{checklist.name}</span><span>
            {savedItems(checklist.id).length}/{checklist.items.length}
          </span>
        </div>
        <div style="height:3px;background:var(--bg3);border-radius:3px;margin-bottom:.75rem">
          <div
            style:width="{checklist.items.length
              ? (savedItems(checklist.id).length / checklist.items.length) * 100
              : 0}%"
            style="height:100%;background:var(--accent);transition:width .2s"
          ></div>
        </div>
        {#each checklist.items as item, index}
          <label
            style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid var(--border)"
          >
            <input
              type="checkbox"
              checked={savedItems(checklist.id).includes(index)}
              onchange={() => toggleItem(checklist.id, index)}
            /><span
              style:text-decoration={savedItems(checklist.id).includes(index)
                ? 'line-through'
                : 'none'}
            >
              {item}
            </span>
          </label>
        {/each}
        <button
          class="btn btn-secondary btn-sm"
          style="margin-top:.75rem"
          onclick={() => {
            checked = { ...checked, [checklist.id]: [] };
            localStorage.removeItem(`cl_${checklist.id}`);
          }}
        >
          Reset
        </button>
      </div>
    {/each}
    {#if adding}<div class="card">
        <label class="form-group">
          Checklist name<input class="form-input" bind:value={checklistName} />
        </label><label class="form-group">
          Items (one per line)<textarea class="form-textarea" bind:value={checklistItems}
          ></textarea>
        </label><button class="btn btn-primary" onclick={createChecklist}>Save</button>
      </div>
    {:else}<button class="btn btn-secondary btn-block" onclick={() => (adding = true)}>
        Add checklist
      </button>{/if}
  {/if}
{/if}
