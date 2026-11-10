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
    profileId: 'plus62',
    adapterId: 'opencode',
    write: false,
  }).artifacts;
}

test('the opencode adapter puts the always-on block in AGENTS.md, not CLAUDE.md', () => {
  const list = artifacts();
  const block = list.find((artifact) => artifact.kind === 'always_on');
  assert.equal(block?.path, 'AGENTS.md');
  assert.equal(
    list.some((artifact) => artifact.path === 'CLAUDE.md'),
    false,
    'an opencode install must not create a Claude-specific file',
  );
  assert.match(block?.content ?? '', /<!-- hahahah:begin profile=plus62/);
  assert.match(block?.content ?? '', /<!-- hahahah:end -->/);
});

test('the opencode skill tree matches what opencode was observed loading', () => {
  // Measured on opencode 1.18.31: `opencode debug skill` lists
  // .claude/skills/hahahah-plus62/SKILL.md with our description, so this layout is the one that
  // works without inventing a second copy under .opencode/.
  const paths = artifacts().map((artifact) => artifact.path);
  assert.ok(paths.includes('.claude/skills/hahahah-plus62/SKILL.md'));
  assert.ok(paths.includes('.claude/skills/hahahah-plus62/references/core/10-safety.md'));
  assert.ok(paths.includes('.claude/skills/hahahah-plus62/references/lexicon.md'));
});

test('install and uninstall round-trip through the opencode adapter', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-opencode-'));
  writeFileSync(join(target, 'AGENTS.md'), '# Proyek gue\n\nJangan sentuh bagian ini.\n', 'utf8');
  try {
    const result = install({
      sourceRoot: root,
      targetRoot: target,
      profileId: 'plus62',
      adapterId: 'opencode',
    });
    assert.equal(result.manifest.adapter, 'opencode');
    assert.equal(result.manifest.block.path, 'AGENTS.md');
    const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    assert.match(agents, /# Proyek gue/, 'the user file is kept, not replaced');
    assert.match(agents, /hahahah:begin/);
    assert.equal(existsSync(join(target, '.claude/skills/hahahah-plus62/SKILL.md')), true);

    assert.deepEqual(doctor({ targetRoot: target }).errors, []);

    uninstall({ targetRoot: target });
    const after = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    assert.equal(after.includes('hahahah:begin'), false);
    assert.match(after, /Jangan sentuh bagian ini\./);
    assert.equal(existsSync(join(target, '.claude/skills')), false);
    assert.equal(existsSync(join(target, '.plus62/manifest.json')), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test('an unknown adapter is still refused for profiles that do not declare it', () => {
  assert.throws(
    () => build({ root, profileId: 'plus62', adapterId: 'not-a-harness', write: false }),
    /does not declare adapter|not implemented/,
  );
});
