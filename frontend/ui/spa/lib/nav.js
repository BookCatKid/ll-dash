export const pages = {
  dashboard: { icon: 'layout-dashboard', label: 'Dash' },
  schedule: { icon: 'calendar-days', label: 'Schedule' },
  rankings: { icon: 'chart-no-axes-column', label: 'Rankings' },
  scouting: { icon: 'clipboard-list', label: 'Scout' },
  alliance: { icon: 'users', label: 'Alliance' },
  simulator: { icon: 'chart-line', label: 'Sim' },
  hub: { icon: 'notebook-tabs', label: 'Hub' },
  bigscreen: { icon: 'monitor', label: 'Display' },
  playoffs: { icon: 'trophy', label: 'Playoffs' },
  awards: { icon: 'medal', label: 'Awards' },
};

export function visiblePages(settings) {
  const config =
    Array.isArray(settings?.nav) && settings.nav.length
      ? settings.nav
      : Object.keys(pages).map((key) => ({ key, visible: true }));
  let hidden = [];
  try {
    hidden = JSON.parse(localStorage.getItem('device_hidden_tabs') || '[]');
  } catch {
    /* default */
  }
  return config
    .filter(
      (item) =>
        (item.visible || item.key === 'dashboard') && pages[item.key] && !hidden.includes(item.key),
    )
    .map((item) => ({ key: item.key, ...pages[item.key] }));
}
