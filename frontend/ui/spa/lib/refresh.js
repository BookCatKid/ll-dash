export const REFRESH_EVENT = 'lldash:refresh';

export function refreshPage() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function onPageRefresh(load) {
  window.addEventListener(REFRESH_EVENT, load);
  return () => window.removeEventListener(REFRESH_EVENT, load);
}
