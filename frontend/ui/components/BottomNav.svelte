<script>
  import { onMount, tick } from 'svelte';

  let { items, activePage, onNavigate } = $props();
  let dock;
  let indicator = $state(null);
  let indicatorReady = $state(false);

  function updateIndicator() {
    if (!dock) return;
    const selected = dock.querySelector('.nav-btn.active');
    if (!selected) {
      indicator = null;
      return;
    }

    indicator = { left: selected.offsetLeft, width: selected.offsetWidth };
    if (dock.scrollWidth > dock.clientWidth) {
      const target = selected.offsetLeft - (dock.clientWidth - selected.offsetWidth) / 2;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      dock.scrollTo({ left: target, behavior: reduceMotion ? 'instant' : 'smooth' });
    }
    indicatorReady = true;
  }

  $effect(() => {
    const selected = $activePage;
    const tabs = $items;
    void selected;
    void tabs;
    tick().then(updateIndicator);
  });

  onMount(() => {
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(dock);
    return () => observer.disconnect();
  });
</script>

<nav class="bottom-nav svelte-nav" id="bottom-nav" aria-label="Pages" bind:this={dock}>
  {#if indicator}
    <div
      class:ready={indicatorReady}
      class="nav-active-indicator"
      style:left="{indicator.left}px"
      style:width="{indicator.width}px"
      aria-hidden="true"
    ></div>
  {/if}

  {#each $items as item (item.key)}
    <button
      type="button"
      class:active={$activePage === item.key}
      class="nav-btn"
      data-page={item.key}
      aria-current={$activePage === item.key ? 'page' : undefined}
      onclick={() => onNavigate(item.key)}
    >
      <span
        class="nav-icon"
        aria-hidden="true"
        style:--nav-icon="url('/static/icons/nav/{item.icon}.svg')"
      ></span>
      <span class="nav-label">{item.label}</span>
    </button>
  {/each}
</nav>
