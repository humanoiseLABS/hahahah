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
    adapterId: 'agents-md',
    write: false,
  }).artifacts;
}

test('the agents-md adapter writes AGENTS.md and the vendor-neutral .agents skill tree', () => {
  const list = artifacts();
  const block = list.find((artifact) => artifact.kind === 'always_on');
  assert.equal(block?.path, 'AGENTS.md');
  assert.equal(
    list.some((artifact) => artifact.path === 'CLAUDE.md'),
    false,
    'a portable install must not create a Claude-specific file',
  );
  assert.match(block?.content ?? '', /<!-- hahahah:begin profile=rusuh-id/);
  assert.match(block?.content ?? '', /<!-- hahahah:end -->/);

  const paths = list.map((artifact) => artifact.path);
  assert.ok(paths.includes('.agents/skills/hahahah-rusuh/SKILL.md'));
  assert.ok(paths.includes('.agents/skills/hahahah-rusuh/references/core/10-safety.md'));
  assert.ok(paths.includes('.agents/skills/hahahah-rusuh/references/lexicon.md'));
});

test('the agents-md skill body carries the persona voice and the reference pointer', () => {
  const skill = artifacts().find((artifact) => artifact.path.endsWith('SKILL.md'));
  assert.ok(skill);
  assert.match(skill.content, /^---\nname: hahahah-rusuh\ndescription: .+\n---\n/);
  assert.match(skill.content, /## Adaptive dynamics/);
  assert.match(skill.content, /references\/core\/\*\.md/);
});

test('install and uninstall round-trip through the agents-md adapter', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-agents-md-'));
  writeFileSync(join(target, 'AGENTS.md'), '# Proyek gue\n\nJangan sentuh bagian ini.\n', 'utf8');
  try {
    const result = install({
      sourceRoot: root,
      targetRoot: target,
      profileId: 'rusuh-id',
      adapterId: 'agents-md',
    });
    assert.equal(result.manifest.adapter, 'agents-md');
    assert.equal(result.manifest.block.path, 'AGENTS.md');
    const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    assert.match(agents, /# Proyek gue/, 'the user file is kept, not replaced');
    assert.match(agents, /hahahah:begin/);
    assert.equal(existsSync(join(target, '.agents/skills/hahahah-rusuh/SKILL.md')), true);
    assert.equal(existsSync(join(target, '.claude')), false, 'no Claude tree should appear');

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
