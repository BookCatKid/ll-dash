const test = require('node:test');
const assert = require('node:assert/strict');

test('setup theme backgrounds choose matching light and dark text modes', async () => {
  const { isLightBackground } = await import('../frontend/ui/spa/lib/theme.js');
  assert.equal(isLightBackground('#f4f5f8'), true);
  assert.equal(isLightBackground('#ffffff'), true);
  assert.equal(isLightBackground('#151820'), false);
  assert.equal(isLightBackground('#191720'), false);
  assert.equal(isLightBackground('#000000'), false);
  assert.equal(isLightBackground('invalid'), false);
});
