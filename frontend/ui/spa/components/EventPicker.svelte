<script>
  import { onDestroy } from 'svelte';
  import { api } from '../lib/api.js';

  // Shared event search picker: debounced filter over the FTC events list.
  // Parent supplies the season and handles the selection via onSelect(event).
  let { season, onSelect, inputClass = 'setting-input', id = 'event-search' } = $props();

  let query = $state('');
  let events = $state([]);
  let loading = $state(false);
  let error = $state('');
  let counter = 0;
  let timer;

  function search() {
    clearTimeout(timer);
    const q = query.trim();
    const requestId = ++counter;
    if (q.length < 2) {
      events = [];
      loading = false;
      return;
    }
    timer = setTimeout(async () => {
      loading = true;
      error = '';
      try {
        const result = await api.events(Number(season) || 2026);
        if (requestId !== counter) return;
        const needle = q.toLowerCase();
        events = (result.events || [])
          .filter((event) =>
            [event.name, event.code, event.city, event.stateprov].some((value) =>
              String(value || '')
                .toLowerCase()
                .includes(needle),
            ),
          )
          .slice(0, 12);
      } catch (e) {
        if (requestId === counter) error = e.message;
      } finally {
        if (requestId === counter) loading = false;
      }
    }, 280);
  }

  // Clear stale results when the season changes.
  $effect(() => {
    void season;
    query = '';
    events = [];
    error = '';
  });

  onDestroy(() => clearTimeout(timer));
</script>

<input
  class={inputClass}
  {id}
  bind:value={query}
  oninput={search}
  placeholder="City, event name, or code"
  autocomplete="off"
/>
{#if loading}<div class="loading">Searching</div>{/if}
{#if error}<div class="svelte-error">{error}</div>{/if}
{#each events as event (event.code)}
  <button
    class="event-result"
    style="display:block;width:100%;text-align:left"
    onclick={() => {
      onSelect?.(event);
      query = '';
      events = [];
    }}
  >
    <span class="event-result-name">{event.name}</span>
    <span class="event-result-meta">
      {event.code} · {event.city || ''}{event.stateprov ? ', ' + event.stateprov : ''}
    </span>
  </button>
{/each}
