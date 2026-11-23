<script>
  import { statHelp, statHelpUrls } from '../lib/stat-help.js';

  let { stat, context } = $props();
  const entry = $derived(statHelp[stat.id]);
  const example = $derived(entry?.example?.(context));
  const urls = $derived(statHelpUrls(context.season));
</script>

{#if entry}
  <article class="stat-help-page">
    <header class="stat-help-header">
      <div class="stat-help-current">{stat.value}</div>
      <p>{entry.description}</p>
    </header>

    <section class="stat-help-section">
      <h2>How it’s calculated</h2>
      <p>{entry.calculation}</p>
      {#if example}
        <div class="stat-help-example">{example}</div>
      {/if}
    </section>

    {#each entry.details as section (section.title)}
      <section class="stat-help-section">
        <h2>{section.title}</h2>
        <p>{section.text(context)}</p>
      </section>
    {/each}

    <nav class="stat-help-sources" aria-label="Sources">
      <a href={urls.rankings} target="_blank" rel="noopener noreferrer">FIRST Events API</a>
      {#if entry.rules}
        <a href={urls.rules} target="_blank" rel="noopener noreferrer">Competition manual</a>
      {/if}
    </nav>
  </article>
{/if}
