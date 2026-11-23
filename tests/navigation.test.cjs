const test = require('node:test');
const assert = require('node:assert/strict');

const getNav = () => import('../frontend/ui/spa/lib/nav.js');

test('device visibility cannot hide Dashboard, even with stale preferences', async () => {
  const { visiblePages } = await getNav();
  const config = {
    nav: [
      { key: 'dashboard', visible: false },
      { key: 'schedule', visible: true },
      { key: 'rankings', visible: false },
    ],
  };
  const visible = visiblePages(config, ['dashboard', 'schedule', 'rankings', 'unknown']);
  assert.deepEqual(
    visible.map((page) => page.key),
    ['dashboard'],
  );
});

test('device preferences retain order and known hidden pages, without duplicates', async () => {
  const { visiblePages, normalizeDeviceHiddenPages } = await getNav();
  assert.deepEqual(
    normalizeDeviceHiddenPages(['scouting', 'dashboard', 'scouting', 'unknown', 25, 'schedule']),
    ['scouting', 'schedule'],
  );
  const config = {
    nav: [
      { key: 'rankings', visible: true },
      { key: 'dashboard', visible: true },
      { key: 'schedule', visible: true },
    ],
  };
  assert.deepEqual(
    visiblePages(config, ['schedule']).map((item) => item.key),
    ['rankings', 'dashboard'],
  );
});

test('empty and malformed device preferences never suppress the whole app', async () => {
  const { visiblePages, normalizeDeviceHiddenPages } = await getNav();
  assert.deepEqual(normalizeDeviceHiddenPages({ dashboard: true }), []);
  assert.equal(visiblePages({}, []).length, 10);
  assert.equal(visiblePages({ nav: null }, []).length, 10);
  assert.equal(visiblePages({ nav: [{ key: 'dashboard', visible: false }] }, []).length, 1);
});
