export async function request(method, path, data) {
  const options = { method, headers: {} };
  if (data !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path.startsWith('/auth/') ? path : `/api${path}`, options);
  if (!response.ok) {
    let reason;
    try {
      reason = (await response.json()).error;
    } catch {
      reason = null;
    }
    throw new Error(reason || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  delete: (path) => request('DELETE', path),
  config: () => request('GET', '/config'),
  auth: () => request('GET', '/auth/check'),
  login: (pin) => request('POST', '/auth/login', { pin }),
  logout: () => request('POST', '/auth/logout'),
  settings: () => request('GET', '/settings'),
  saveSettings: (changes) => request('POST', '/settings', changes),
  seasons: () => request('GET', '/seasons'),
  events: (season) => request('GET', `/events?season=${season}`),
  rankings: () => request('GET', '/rankings'),
  schedule: (level = 'qual') => request('GET', `/schedule?level=${level}`),
  scheduleFields: (level = 'qual') => request('GET', `/schedule-fields?level=${level}`),
  matches: (level = 'qual') => request('GET', `/matches?level=${level}`),
  oprs: () => request('GET', '/oprs'),
  teams: () => request('GET', '/teams'),
  team: (number) => request('GET', `/team/${number}`),
  alliances: () => request('GET', '/alliances'),
  awards: () => request('GET', '/awards'),
  playoffSchedule: () => request('GET', '/playoff-schedule'),
  playoffMatches: () => request('GET', '/playoff-matches'),
  scouting: (team) => request('GET', `/scouting${team ? `?team=${team}` : ''}`),
  addScouting: (data) => request('POST', '/scouting', data),
  deleteScouting: (id) => request('DELETE', `/scouting/${id}`),
  scoutingFields: () => request('GET', '/scouting-fields'),
  saveScoutingFields: (data) => request('POST', '/scouting-fields', data),
  flagCategories: () => request('GET', '/flag-categories'),
  saveFlagCategories: (data) => request('POST', '/flag-categories', data),
  flags: () => request('GET', '/flags'),
  setFlag: (team, flag, order) => request('POST', `/flags/${team}`, { flag, pick_order: order }),
  notes: () => request('GET', '/hub/notes'),
  addNote: (data) => request('POST', '/hub/notes', data),
  deleteNote: (id) => request('DELETE', `/hub/notes/${id}`),
  checklists: () => request('GET', '/hub/checklists'),
  addChecklist: (data) => request('POST', '/hub/checklists', data),
  ftcTeam: (number, season) => request('GET', `/ftcscout/team/${number}?season=${season}`),
  ftcTeamEvents: (number, season) =>
    request('GET', `/ftcscout/team/${number}/events?season=${season}`),
  ftcEventOprs: (code, season) => request('GET', `/ftcscout/event/${code}/oprs?season=${season}`),
  ftcEventScores: (code, season) =>
    request('GET', `/ftcscout/event/${code}/match-rp?season=${season}`),
  setupValidate: (data) => request('POST', '/setup/validate', data),
  completeSetup: (data) => request('POST', '/setup', data),
};
