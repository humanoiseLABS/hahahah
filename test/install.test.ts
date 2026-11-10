import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { install, uninstall, doctor, update } from '../src/install.ts';

const sourceRoot = process.cwd();

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), 'hahahah-install-'));
}

const originalClaude = '# Project notes\n\nKeep this line.\n';

test('installs a managed block and skill while preserving user content', () => {
  const targetRoot = tempProject();
  try {
    writeFileSync(join(targetRoot, 'CLAUDE.md'), originalClaude);
    const result = install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.equal(result.manifest.schema, 'hahahah.install/v1');
    assert.equal(result.manifest.adapter, 'claude-code');

    const claude = readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /Keep this line\./);
    assert.match(claude, /<!-- hahahah:begin profile=plus62 version=0\.1\.0 -->/);
    assert.match(claude, /\+62 Mode/);
    assert.match(claude, /<!-- hahahah:end -->/);

    assert.ok(existsSync(join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md')));
    assert.ok(existsSync(join(targetRoot, '.plus62/manifest.json')));
    assert.equal(doctor({ targetRoot }).ok, true);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('dry-run plans without writing', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62', dryRun: true });
    assert.deepEqual(readdirSync(targetRoot), []);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('reinstall keeps generated files stable and doctor detects corruption', () => {
  const targetRoot = tempProject();
  try {
    const first = install({ sourceRoot, targetRoot, profileId: 'plus62' });
    const claudeFirst = readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8');
    const skillPath = join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md');
    const skillFirst = readFileSync(skillPath, 'utf8');

    const second = install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.equal(readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8'), claudeFirst);
    assert.equal(readFileSync(skillPath, 'utf8'), skillFirst);
    assert.deepEqual(
      first.manifest.files.map((file) => file.sha256),
      second.manifest.files.map((file) => file.sha256),
    );

    writeFileSync(skillPath, 'broken\n');
    const report = doctor({ targetRoot });
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((error) => /hash|mismatch/i.test(error)));
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('update refreshes managed block and files using the existing manifest', () => {
  const targetRoot = tempProject();
  try {
    writeFileSync(join(targetRoot, 'CLAUDE.md'), originalClaude);
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.equal(doctor({ targetRoot }).ok, true);

    const updateResult = update({ sourceRoot, targetRoot });
    assert.equal(updateResult.manifest.profile, 'plus62');
    assert.equal(updateResult.manifest.adapter, 'claude-code');
    assert.equal(doctor({ targetRoot }).ok, true);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('uninstall removes managed content and preserves user files', () => {
  const targetRoot = tempProject();
  try {
    writeFileSync(join(targetRoot, 'CLAUDE.md'), originalClaude);
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    const skillPath = join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md');
    assert.ok(existsSync(skillPath));

    uninstall({ targetRoot });

    const claude = readFileSync(join(targetRoot, 'CLAUDE.md'), 'utf8');
    assert.equal(claude, originalClaude);
    assert.equal(existsSync(skillPath), false);
    assert.equal(existsSync(join(targetRoot, '.plus62/manifest.json')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('every MVP profile installs and uninstalls through the same path', () => {
  const cases: Array<[string, string]> = [['plus62', 'plus62']];
  for (const [profileId, persona] of cases) {
    const targetRoot = tempProject();
    try {
      const result = install({ sourceRoot, targetRoot, profileId });
      assert.equal(result.manifest.persona, persona);
      const skillPath = join(targetRoot, `.claude/skills/hahahah-${persona}/SKILL.md`);
      assert.ok(existsSync(skillPath), `${profileId}: missing SKILL.md`);
      assert.ok(
        existsSync(
          join(targetRoot, `.claude/skills/hahahah-${persona}/references/core/10-safety.md`),
        ),
        `${profileId}: missing core safety reference`,
      );
      assert.equal(doctor({ targetRoot }).ok, true, `${profileId}: doctor failed`);
      uninstall({ targetRoot });
      assert.equal(existsSync(join(targetRoot, '.claude')), false, `${profileId}: .claude residue`);
      assert.equal(
        existsSync(join(targetRoot, 'CLAUDE.md')),
        false,
        `${profileId}: CLAUDE.md residue`,
      );
    } finally {
      rmSync(targetRoot, { recursive: true, force: true });
    }
  }
});

test('uninstall leaves no empty managed directories behind', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.ok(existsSync(join(targetRoot, '.claude/skills/hahahah-plus62/SKILL.md')));

    uninstall({ targetRoot });

    const residue: string[] = [];
    const walk = (dir: string, depth: number) => {
      if (depth > 3) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        residue.push(entry.isDirectory() ? `${path}/` : path);
        if (entry.isDirectory()) walk(path, depth + 1);
      }
    };
    walk(targetRoot, 0);
    assert.deepEqual(residue, []);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('uninstall keeps a pre-existing .claude that holds user files', () => {
  const targetRoot = tempProject();
  try {
    mkdirSync(join(targetRoot, '.claude'), { recursive: true });
    writeFileSync(join(targetRoot, '.claude/settings.local.json'), '{"keep":true}\n');
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    uninstall({ targetRoot });
    assert.equal(existsSync(join(targetRoot, '.claude/settings.local.json')), true);
    assert.equal(existsSync(join(targetRoot, '.claude/skills')), false);
    assert.equal(existsSync(join(targetRoot, 'CLAUDE.md')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('uninstall removes a CLAUDE.md it created when nothing else remains', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    assert.ok(existsSync(join(targetRoot, 'CLAUDE.md')));
    uninstall({ targetRoot });
    assert.equal(existsSync(join(targetRoot, 'CLAUDE.md')), false);
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('modified managed block requires force to replace', () => {
  const targetRoot = tempProject();
  try {
    install({ sourceRoot, targetRoot, profileId: 'plus62' });
    const claudePath = join(targetRoot, 'CLAUDE.md');
    const claude = readFileSync(claudePath, 'utf8').replace('+62 Mode', 'EDITED');
    writeFileSync(claudePath, claude);

    assert.throws(
      () => install({ sourceRoot, targetRoot, profileId: 'plus62' }),
      /force|modified/i,
    );
    assert.doesNotThrow(() =>
      install({ sourceRoot, targetRoot, profileId: 'plus62', force: true }),
    );
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('refuses to overwrite an unmanaged skill file', () => {
  const targetRoot = tempProject();
  try {
    const skillDir = join(targetRoot, '.claude/skills/hahahah-plus62');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), 'user file\n');
    assert.throws(
      () => install({ sourceRoot, targetRoot, profileId: 'plus62' }),
      /force|unmanaged|exists/i,
    );
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
});
