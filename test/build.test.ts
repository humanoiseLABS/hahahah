import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  writeFileSync,
  cpSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/build.ts';
import { validate } from '../src/schema.ts';

const root = process.cwd();

function tempOut(): string {
  return mkdtempSync(join(tmpdir(), 'hahahah-build-'));
}

test('builds a deterministic fake-adapter plan with the persona card', () => {
  const outA = tempOut();
  const outB = tempOut();
  try {
    const a = build({ root, profileId: 'rusuh-id', adapterId: 'fake', outDir: outA });
    const b = build({ root, profileId: 'rusuh-id', adapterId: 'fake', outDir: outB });

    assert.equal(a.manifest.content_hash, b.manifest.content_hash);
    assert.ok(a.manifest.files.some((file) => file.path === 'always-on.md'));
    assert.ok(a.manifest.files.some((file) => file.path === 'references/voice.md'));
    assert.ok(a.manifest.files.some((file) => file.path === 'references/lexicon.md'));
    assert.ok(a.manifest.files.some((file) => file.path === 'skill-metadata.json'));

    const alwaysOn = readFileSync(join(outA, 'always-on.md'), 'utf8');
    assert.match(alwaysOn, /RUSUH/);
    assert.doesNotMatch(alwaysOn, /\bADAB\b/);

    const spoken = readFileSync(join(outA, 'references/voice.md'), 'utf8');
    assert.ok(spoken.includes('RUSUH'));

    assert.doesNotThrow(() => validate('manifest', a.manifest));
    assert.ok(existsSync(join(outA, 'manifest.json')));
  } finally {
    rmSync(outA, { recursive: true, force: true });
    rmSync(outB, { recursive: true, force: true });
  }
});

test('release build refuses pending reviews', () => {
  const out = tempOut();
  try {
    assert.throws(
      () => build({ root, profileId: 'rusuh-id', adapterId: 'fake', outDir: out, release: true }),
      /review|approved|release/i,
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('refuses to write into a non-empty unmanaged directory', () => {
  const out = tempOut();
  try {
    writeFileSync(join(out, 'unrelated.txt'), 'keep me\n');
    assert.throws(
      () => build({ root, profileId: 'rusuh-id', adapterId: 'fake', outDir: out }),
      /unmanaged directory/,
    );
    assert.equal(readFileSync(join(out, 'unrelated.txt'), 'utf8'), 'keep me\n');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('release build succeeds once all reviews are approved', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'hahahah-release-'));
  try {
    for (const dir of ['core', 'culture', 'personas', 'profiles', 'schemas']) {
      cpSync(join(root, dir), join(fixtureRoot, dir), { recursive: true });
    }
    cpSync(join(root, 'package.json'), join(fixtureRoot, 'package.json'));
    const personaPath = join(fixtureRoot, 'personas/rusuh/persona.yaml');
    writeFileSync(
      personaPath,
      readFileSync(personaPath, 'utf8')
        .replace(/linguistic: pending/g, 'linguistic: approved')
        .replace(/cultural: pending/g, 'cultural: approved')
        .replace(/safety: pending/g, 'safety: approved'),
    );
    for (const culturePath of [
      join(fixtureRoot, 'culture/id/genz-lexicon.yaml'),
      join(fixtureRoot, 'culture/id/memes.yaml'),
    ]) {
      writeFileSync(
        culturePath,
        readFileSync(culturePath, 'utf8').replace(/reviewed_by: pending/g, 'reviewed_by: approved'),
      );
    }
    mkdirSync(join(fixtureRoot, 'out'));
    const result = build({
      root: fixtureRoot,
      profileId: 'rusuh-id',
      adapterId: 'fake',
      outDir: join(fixtureRoot, 'out'),
      release: true,
    });
    assert.equal(result.manifest.release, true);
    assert.equal(
      result.warnings.filter((warning) => warning.startsWith('pending review')).length,
      0,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('removes stale manifest-owned artifacts but keeps unrelated files', () => {
  const out = tempOut();
  try {
    const stalePath = join(out, 'references/culture/id/stale.txt');
    mkdirSync(join(out, 'references/culture/id'), { recursive: true });
    writeFileSync(stalePath, 'old\n');
    writeFileSync(join(out, 'keep.txt'), 'keep\n');
    writeFileSync(
      join(out, 'manifest.json'),
      JSON.stringify({
        schema: 'hahahah.manifest/v1',
        files: [{ path: 'references/culture/id/stale.txt' }],
      }),
    );

    build({ root, profileId: 'rusuh-id', adapterId: 'fake', outDir: out });

    assert.equal(existsSync(stalePath), false);
    assert.equal(readFileSync(join(out, 'keep.txt'), 'utf8'), 'keep\n');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('measure-only build does not write artifacts', () => {
  const out = join(tempOut(), 'not-written');
  try {
    build({ root, profileId: 'rusuh-id', adapterId: 'fake', outDir: out, write: false });
    assert.equal(existsSync(out), false);
  } finally {
    rmSync(join(out, '..'), { recursive: true, force: true });
  }
});
