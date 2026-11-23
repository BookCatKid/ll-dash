export const initialTheme = { accent: '#a8b8e8', accent2: '#9bc6c7', bg: '#151820' };

/** Determine whether a custom background needs the light-color text palette. */
export function isLightBackground(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160;
}

function shade(hex, amount) {
  const digits = hex.replace('#', '');
  const value = parseInt(digits, 16);
  if (!Number.isFinite(value)) return hex;
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const brightness = channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114;
  return (
    '#' +
    channels
      .map((c) =>
        Math.max(0, Math.min(255, c + (brightness > 128 ? -amount : amount)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

export function applyAppearance(settings = {}) {
  const theme = settings.theme || initialTheme;
  const root = document.documentElement;
  root.classList.toggle('light', settings.theme_mode === 'light');
  root.classList.toggle('compact', settings.density === 'compact');
  for (const key of ['accent', 'accent2'])
    if (theme[key]) root.style.setProperty(`--${key}`, theme[key]);
  if (theme.bg) {
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg2', theme.bg2 || shade(theme.bg, 8));
    root.style.setProperty('--bg3', theme.bg3 || shade(theme.bg, 15));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  }
  if (settings.dashboard_name) document.title = settings.dashboard_name;
}

export const themePresets = [
  { name: 'Slate', mode: 'dark', accent: '#a8b8e8', accent2: '#9bc6c7', bg: '#151820' },
  { name: 'High contrast', mode: 'dark', accent: '#f5f6f8', accent2: '#c7cbd3', bg: '#090b0f' },
  { name: 'Light', mode: 'light', accent: '#425f9f', accent2: '#216968', bg: '#f4f5f8' },
  { name: 'Red alliance', mode: 'dark', accent: '#e799a4', accent2: '#b9b3c8', bg: '#1d171b' },
  { name: 'Blue alliance', mode: 'dark', accent: '#90bdec', accent2: '#b7c8db', bg: '#141b24' },
  { name: 'Forest', mode: 'dark', accent: '#91c0a8', accent2: '#b5c9b9', bg: '#151d1a' },
  { name: 'Lavender', mode: 'dark', accent: '#b6ade9', accent2: '#c5b4ce', bg: '#191720' },
];
