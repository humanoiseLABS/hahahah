import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();

test('measure command reports budgets without writing', () => {
  const result = spawnSync(process.execPath, ['src/cli.ts', 'measure', '--profile', 'rusuh-id'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /always_on:/);
  assert.match(result.stdout, /tokenizer: o200k_base/);
});

test('build command writes a manifest and artifacts', () => {
  const out = mkdtempSync(join(tmpdir(), 'hahahah-cli-'));
  try {
    const result = spawnSync(
      process.execPath,
      ['src/cli.ts', 'build', '--profile', 'rusuh-id', '--adapter', 'fake', '--out', out],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(out, 'manifest.json')));
    assert.ok(existsSync(join(out, 'always-on.md')));
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8')) as {
      adapter: string;
    };
    assert.equal(manifest.adapter, 'fake');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('install, doctor, and uninstall work through the CLI', () => {
  const target = mkdtempSync(join(tmpdir(), 'hahahah-cli-install-'));
  try {
    const installResult = spawnSync(
      process.execPath,
      ['src/cli.ts', 'install', '--profile', 'rusuh-id', '--target', target],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(installResult.status, 0, installResult.stderr);
    assert.ok(existsSync(join(target, 'CLAUDE.md')));
    assert.ok(existsSync(join(target, '.claude/skills/hahahah-rusuh/SKILL.md')));

    const doctorResult = spawnSync(process.execPath, ['src/cli.ts', 'doctor', '--target', target], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(doctorResult.status, 0, doctorResult.stderr);

    const uninstallResult = spawnSync(
      process.execPath,
      ['src/cli.ts', 'uninstall', '--target', target],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(uninstallResult.status, 0, uninstallResult.stderr);
    assert.equal(existsSync(join(target, 'CLAUDE.md')), false);
    assert.equal(existsSync(join(target, '.hahahah/manifest.json')), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test('eval rejects an unknown task id before calling the harness', () => {
  const result = spawnSync(
    process.execPath,
    ['src/cli.ts', 'eval', '--profile', 'rusuh-id', '--task', 'does-not-exist-01'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown task id/i);
});

test('unknown adapter fails clearly', () => {
  const result = spawnSync(
    process.execPath,
    ['src/cli.ts', 'measure', '--profile', 'rusuh-id', '--adapter', 'agents-md'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not declare adapter/i);
});
