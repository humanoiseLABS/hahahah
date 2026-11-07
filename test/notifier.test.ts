import test from 'node:test';
import assert from 'node:assert/strict';
import { formatUpdateNotice, isNewerVersion } from '../src/notifier.ts';

test('isNewerVersion correctly compares semantic versions', () => {
  assert.equal(isNewerVersion('0.1.1', '0.1.0'), true);
  assert.equal(isNewerVersion('0.2.0', '0.1.9'), true);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
  assert.equal(isNewerVersion('v1.0.1', '1.0.0'), true);

  assert.equal(isNewerVersion('0.1.0', '0.1.0'), false);
  assert.equal(isNewerVersion('0.1.0', '0.1.1'), false);
  assert.equal(isNewerVersion('0.0.9', '0.1.0'), false);
  assert.equal(isNewerVersion('invalid', '0.1.0'), false);
});

test('formatUpdateNotice includes versions and update command', () => {
  const notice = formatUpdateNotice('0.1.0', '0.1.1');
  assert.match(notice, /v0\.1\.0 → v0\.1\.1/);
  assert.match(notice, /node src\/cli\.ts update/);
});
