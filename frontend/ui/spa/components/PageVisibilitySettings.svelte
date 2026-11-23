<script>
  import { writable } from 'svelte/store';
  import SegmentedTabs from '../../components/SegmentedTabs.svelte';
  import SettingSwitch from './SettingSwitch.svelte';
  import Icon from './Icon.svelte';
  import { pages } from '../lib/nav.js';

  let { nav, deviceHidden, onMove, onSharedChange, onDeviceChange } = $props();
  const scopes = [
    { key: 'shared', label: 'All devices' },
    { key: 'device', label: 'This device' },
  ];
  const scope = writable('shared');
  const availableOnDevice = $derived(
    nav.filter((item) => item.visible && item.key !== 'dashboard' && pages[item.key]),
  );
</script>

<section class="setting-group page-visibility-settings" aria-label="Navigation pages">
  <div class="settings-section-heading">
    <h3 class="setting-label">Navigation</h3>
    <span class="settings-section-count">
      {#if $scope === 'shared'}
        {nav.filter((item) => item.visible && pages[item.key]).length} pages enabled
      {:else}
        {1 + availableOnDevice.filter((item) => !deviceHidden.includes(item.key)).length} shown here
      {/if}
    </span>
  </div>
  <SegmentedTabs
    items={scopes}
    activeTab={scope}
    onSelect={(value) => scope.set(value)}
    extraClass="settings-scope-tabs"
  />

  {#if $scope === 'shared'}
    <p class="setting-hint settings-scope-hint">
      Page visibility and order across all devices. Save to apply.
    </p>
    <div class="settings-page-list">
      {#each nav as item, index (item.key)}
        {@const page = pages[item.key]}
        {#if page}
          <div class="settings-page-row" data-page-key={item.key}>
            <SettingSwitch
              id={`shared-page-${item.key}`}
              label={page.label}
              icon={page.icon}
              checked={item.visible || item.key === 'dashboard'}
              disabled={item.key === 'dashboard'}
              onChange={(checked) => onSharedChange(item.key, checked)}
            />
            <div class="settings-page-reorder">
              <button
                type="button"
                class="icon-btn cfg-mini"
                aria-label={`Move ${page.label} up`}
                title={`Move ${page.label} up`}
                disabled={index === 0}
                onclick={() => onMove(index, -1)}
              >
                <Icon name="arrow-up" size={16} />
              </button>
              <button
                type="button"
                class="icon-btn cfg-mini"
                aria-label={`Move ${page.label} down`}
                title={`Move ${page.label} down`}
                disabled={index === nav.length - 1}
                onclick={() => onMove(index, 1)}
              >
                <Icon name="arrow-down" size={16} />
              </button>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="setting-hint settings-scope-hint">
      Hide pages only on this device. Changes apply immediately.
    </p>
    <div class="settings-page-list">
      {#each availableOnDevice as item (item.key)}
        <div class="settings-page-row" data-page-key={item.key}>
          <SettingSwitch
            id={`device-page-${item.key}`}
            label={pages[item.key].label}
            icon={pages[item.key].icon}
            checked={!deviceHidden.includes(item.key)}
            onChange={(checked) => onDeviceChange(item.key, checked)}
          />
        </div>
      {/each}
    </div>
  {/if}
</section>
