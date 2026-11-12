import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/build.ts';

test('Claude Code adapter renders a managed block and skill layout', () => {
  const result = build({
    root: process.cwd(),
    profileId: 'plus62',
    adapterId: 'claude-code',
    write: false,
  });

  assert.equal(result.manifest.adapter, 'claude-code');
  const byPath = new Map(result.artifacts.map((artifact) => [artifact.path, artifact.content]));
  const block = byPath.get('CLAUDE.md');
  assert.ok(block);
  assert.match(block, /^<!-- hahahah:begin profile=plus62 version=0\.1\.0 -->/);
  assert.match(block, /<!-- hahahah:end -->\n$/);

  const skillPath = '.claude/skills/hahahah-plus62/SKILL.md';
  const skill = byPath.get(skillPath);
  assert.ok(skill);
  assert.match(skill, /^---\nname: hahahah-plus62\ndescription: .+\n---\n/);
  assert.match(skill, /\+62 Mode/);

  assert.ok(
    [...byPath.keys()].some((path) => path.startsWith('.claude/skills/hahahah-plus62/references/')),
  );

  // The expanded core policies must be reachable at runtime, not only in the source repo.
  const referenceRoot = '.claude/skills/hahahah-plus62/references/core/';
  for (const name of ['00-identity.md', '10-safety.md', '20-decision.md', '30-efficiency.md']) {
    const content = byPath.get(`${referenceRoot}${name}`);
    assert.ok(content, `${name} must ship as a skill reference`);
    assert.match(content, /^# \+62 Mode /);
  }
  assert.match(skill ?? '', /references\/core\/\*\.md/);

  assert.equal(result.manifest.budgets.always_on.status, 'ok');
  assert.equal(result.manifest.budgets.skill_metadata.status, 'ok');
  assert.equal(result.manifest.budgets.skill_body.status, 'ok');
  assert.equal(result.manifest.budgets.references.status, 'ok');
});
