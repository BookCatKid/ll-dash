<script>
  import { tick } from 'svelte';
  import { Tabs } from 'bits-ui';

  let { items, activeTab, onSelect, extraClass = '' } = $props();
  let container = $state(null);
  let indicator = $state(null);
  let indicatorReady = $state(false);

  function updateIndicator() {
    if (!container) return;
    const selected = container.querySelector('[data-state="active"]');
    if (!selected) {
      indicator = null;
      return;
    }

    indicator = { left: selected.offsetLeft, width: selected.offsetWidth };
    indicatorReady = true;

    if (container.scrollWidth > container.clientWidth) {
      const target = selected.offsetLeft - (container.clientWidth - selected.offsetWidth) / 2;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({ left: target, behavior: reduceMotion ? 'instant' : 'smooth' });
    }
  }

  $effect(() => {
    const selected = $activeTab;
    const tabs = items;
    void selected;
    void tabs;
    void tick().then(updateIndicator);
  });
</script>

<Tabs.Root value={$activeTab} onValueChange={onSelect}>
  <Tabs.List class="tabs svelte-tabs {extraClass}" bind:ref={container}>
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
      <Tabs.Trigger
        value={item.key}
        class={$activeTab === item.key ? 'tab active' : 'tab'}
        data-tab={item.key}
      >
        {item.label}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
</Tabs.Root>
