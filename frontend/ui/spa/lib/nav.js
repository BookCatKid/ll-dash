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

export function normalizeDeviceHiddenPages(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((key) => key !== 'dashboard' && Object.hasOwn(pages, key)))];
}

export function readDeviceHiddenPages() {
  try {
    return normalizeDeviceHiddenPages(
      JSON.parse(localStorage.getItem('device_hidden_tabs') || '[]'),
    );
  } catch {
    return [];
  }
}

export function writeDeviceHiddenPages(value) {
  const hidden = normalizeDeviceHiddenPages(value);
  localStorage.setItem('device_hidden_tabs', JSON.stringify(hidden));
  return hidden;
}

export function visiblePages(settings, deviceHidden = readDeviceHiddenPages()) {
  const config =
    Array.isArray(settings?.nav) && settings.nav.length
      ? settings.nav
      : Object.keys(pages).map((key) => ({ key, visible: true }));
  const hidden = new Set(normalizeDeviceHiddenPages(deviceHidden));
  return config
    .filter(
      (item) =>
        (item.visible || item.key === 'dashboard') && pages[item.key] && !hidden.has(item.key),
    )
    .map((item) => ({ key: item.key, ...pages[item.key] }));
}
