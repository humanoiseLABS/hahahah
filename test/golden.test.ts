import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/build.ts';

test('always-on output matches the golden file', () => {
  const out = mkdtempSync(join(tmpdir(), 'hahahah-golden-'));
  try {
    build({ root: process.cwd(), profileId: 'rusuh-id', adapterId: 'fake', outDir: out });
    const actual = readFileSync(join(out, 'always-on.md'), 'utf8');
    const expected = readFileSync(join(process.cwd(), 'test/golden/always-on.md'), 'utf8');
    assert.equal(actual, expected);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
