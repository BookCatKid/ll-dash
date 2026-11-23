import {mount, unmount} from 'svelte';
import {writable} from 'svelte/store';
import BottomNav from './components/BottomNav.svelte';
import Toast from './components/Toast.svelte';
import SegmentedTabs from './components/SegmentedTabs.svelte';

const items = writable([]);
const activePage = writable('dashboard');
const toastMessage = writable('');
let navigation = null;
let notifications = null;
let toastTimer = null;

export function renderNavigation(target, tabs, selectedPage, onNavigate) {
  items.set(tabs);
  activePage.set(selectedPage);

  if (!navigation) {
    navigation = mount(BottomNav, {
      target,
      renderer: undefined,
      props: {items, activePage, onNavigate},
    });
  }
}

export function setActivePage(page) {
  activePage.set(page);
}

export function initNotifications(target) {
  if (!notifications) {
    notifications = mount(Toast, {target, renderer: undefined, props: {message: toastMessage}});
  }
}

export function showToast(message, duration = 2200) {
  toastMessage.set(message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastMessage.set(''), duration);
}


const pageTabs = new Set();

export function createTabs(target, tabs, selected, onSelect, options = {}) {
  const activeTab = writable(selected);
  const component = mount(SegmentedTabs, {
    target,
    renderer: undefined,
    props: {
      items: tabs,
      activeTab,
      onSelect: key => {
        activeTab.set(key);
        onSelect(key);
      },
      extraClass: options.settings ? 'settings-tabs' : '',
    },
  });

  if (!options.settings) pageTabs.add(component);

  return {
    select(key) { activeTab.set(key); },
    destroy() {
      pageTabs.delete(component);
      void unmount(component);
    },
  };
}

export function cleanupPageTabs() {
  for (const component of pageTabs) void unmount(component);
  pageTabs.clear();
}
