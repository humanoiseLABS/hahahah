import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../src/build.ts';
import { doctor, install, uninstall } from '../src/install.ts';

const root = process.cwd();

function artifacts() {
  return build({
    root,
    profileId: 'rusuh-id',
    adapterId: 'antigravity',
    write: false,
  }).artifacts;
}

test('the antigravity adapter writes AGENTS.md plus .agents/rules, never a skill tree', () => {
  const list = artifacts();
  const block = list.find((artifact) => artifact.kind === 'always_on');
  assert.equal(block?.path, 'AGENTS.md');
  assert.match(block?.content ?? '', /<!-- hahahah:begin profile=rusuh-id/);

  const paths = list.map((artifact) => artifact.path);
  assert.equal(
    paths.some((path) => path.includes('skills')),
    false,
    'Antigravity does not read a skill tree; nothing may be written there',
  );
  assert.ok(paths.includes('.agents/rules/hahahah-rusuh-voice.md'));
  assert.ok(paths.includes('.agents/rules/hahahah-rusuh-lexicon.md'));
  assert.ok(paths.includes('.agents/rules/hahahah-rusuh-core-10-safety.md'));
});

test('the voice rule is always_on and carries the adaptive engine', () => {
  const voice = artifacts().find((artifact) => artifact.path.endsWith('voice.md'));
  assert.ok(voice);
  assert.match(voice.content, /^---\ntrigger: always_on\n---\n/);
  assert.match(voice.content, /## Adaptive dynamics/);
});

test('every model_decision rule declares a description, which is what Antigravity injects', () => {
  // A model_decision rule is only useful if the description is present: that is the whole part
  // the model sees before it decides to open the file.
  for (const artifact of artifacts()) {
    if (!artifact.path.startsWith('.agents/rules/')) continue;
    if (/trigger: always_on/.test(artifact.content)) continue;
    assert.match(artifact.content, /^---\ntrigger: model_decision\ndescription: ".+"\n---\n/);
    assert.match(artifact.content, /description: "HAHahah/);
  }
});

test('--scope global moves the rules to config/rules and prunes them on uninstall', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-antigravity-global-'));
  try {
    const result = install({
      sourceRoot: root,
      targetRoot: target,
      profileId: 'rusuh-id',
      adapterId: 'antigravity',
      scope: 'global',
    });
    // With ~/.gemini as the target, the user-level rule path is config/rules/, not .agents/rules/.
    assert.equal(result.manifest.block.path, 'AGENTS.md');
    assert.ok(
      result.manifest.files.some((file) => file.path === 'config/rules/hahahah-rusuh-voice.md'),
      `manifest recorded ${JSON.stringify(result.manifest.files.map((file) => file.path))}`,
    );
    assert.equal(existsSync(join(target, 'config/rules/hahahah-rusuh-voice.md')), true);
    assert.equal(
      existsSync(join(target, '.agents/rules/hahahah-rusuh-voice.md')),
      false,
      'a global install must not also leave the workspace path behind',
    );

    assert.deepEqual(doctor({ targetRoot: target }).errors, []);

    uninstall({ targetRoot: target });
    assert.equal(existsSync(join(target, 'config')), false, 'uninstall must prune what it wrote');
    assert.equal(existsSync(join(target, 'AGENTS.md')), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test('--scope global for qoder moves skills to skills/ and prunes conflicting hahahah-* personas', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-qoder-global-'));
  try {
    // Seed a stale conflicting persona directory in skills/
    const staleSkill = join(target, 'skills', 'hahahah-terse');
    writeFileSync(join(target, 'AGENTS.md'), '', 'utf8');
    rmSync(join(target, 'AGENTS.md'));
    const result = install({
      sourceRoot: root,
      targetRoot: target,
      profileId: 'rusuh-id',
      adapterId: 'qoder',
      scope: 'global',
    });
    assert.equal(result.manifest.block.path, 'AGENTS.md');
    assert.ok(
      result.manifest.files.some((file) => file.path === 'skills/hahahah-rusuh/SKILL.md'),
      `manifest recorded ${JSON.stringify(result.manifest.files.map((file) => file.path))}`,
    );
    assert.equal(existsSync(join(target, 'skills/hahahah-rusuh/SKILL.md')), true);
    assert.equal(existsSync(staleSkill), false);
    assert.deepEqual(doctor({ targetRoot: target }).errors, []);

    uninstall({ targetRoot: target });
    assert.equal(existsSync(join(target, 'skills')), false);
    assert.equal(existsSync(join(target, 'AGENTS.md')), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test('--scope global is refused for adapters whose tree has no user-level path', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-scope-refuse-'));
  try {
    assert.throws(
      () =>
        install({
          sourceRoot: root,
          targetRoot: target,
          profileId: 'rusuh-id',
          adapterId: 'claude-code',
          scope: 'global',
        }),
      /needs a documented user-level path/,
    );
    assert.equal(existsSync(join(target, 'CLAUDE.md')), false, 'nothing may be written');
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test('the default scope still writes the workspace rules path', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-antigravity-ws-'));
  try {
    const result = install({
      sourceRoot: root,
      targetRoot: target,
      profileId: 'rusuh-id',
      adapterId: 'antigravity',
    });
    assert.ok(
      result.manifest.files.some((file) => file.path === '.agents/rules/hahahah-rusuh-voice.md'),
    );
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test('install and uninstall round-trip through the antigravity adapter', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-antigravity-'));
  writeFileSync(join(target, 'AGENTS.md'), '# Proyek gue\n\nJangan sentuh bagian ini.\n', 'utf8');
  try {
    const result = install({
      sourceRoot: root,
      targetRoot: target,
      profileId: 'rusuh-id',
      adapterId: 'antigravity',
    });
    assert.equal(result.manifest.adapter, 'antigravity');
    assert.equal(result.manifest.block.path, 'AGENTS.md');
    const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    assert.match(agents, /# Proyek gue/, 'the user file is kept, not replaced');
    assert.match(agents, /hahahah:begin/);
    assert.equal(existsSync(join(target, '.agents/rules/hahahah-rusuh-voice.md')), true);

    assert.deepEqual(doctor({ targetRoot: target }).errors, []);

    uninstall({ targetRoot: target });
    const after = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    assert.equal(after.includes('hahahah:begin'), false);
    assert.match(after, /Jangan sentuh bagian ini\./);
    assert.equal(existsSync(join(target, '.agents')), false);
    assert.equal(existsSync(join(target, '.hahahah/manifest.json')), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
