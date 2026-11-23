<script>
  import {onMount, tick} from 'svelte';

  let {items, activeTab, onSelect, extraClass = ''} = $props();
  let container;
  let indicator = $state(null);
  let indicatorReady = $state(false);

  function updateIndicator() {
    if (!container) return;
    const selected = container.querySelector('.tab.active');
    if (!selected) {
      indicator = null;
      return;
    }

    indicator = {left: selected.offsetLeft, width: selected.offsetWidth};
    indicatorReady = true;

    if (container.scrollWidth > container.clientWidth) {
      const target = selected.offsetLeft - (container.clientWidth - selected.offsetWidth) / 2;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({left: target, behavior: reduceMotion ? 'instant' : 'smooth'});
    }
  }

  $effect(() => {
    const selected = $activeTab;
    const tabs = items;
    void selected;
    void tabs;
    tick().then(updateIndicator);
  });

  onMount(() => {
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(container);
    return () => observer.disconnect();
  });
</script>

<div class="tabs svelte-tabs {extraClass}" role="tablist" bind:this={container}>
  {#if indicator}
    <span
      class:ready={indicatorReady}
      class="segmented-indicator"
      style:left="{indicator.left}px"
      style:width="{indicator.width}px"
      aria-hidden="true"
    ></span>
  {/if}

  {#each items as item (item.key)}
    <button
      type="button"
      role="tab"
      class:active={$activeTab === item.key}
      class="tab"
      data-tab={item.key}
      aria-selected={$activeTab === item.key}
      onclick={() => onSelect(item.key)}
    >{item.label}</button>
  {/each}
</div>
