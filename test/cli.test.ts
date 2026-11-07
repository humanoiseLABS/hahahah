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

test('the harness flag selects the runner and refuses an unknown one', async () => {
  const { runnerFor } = await import('../src/cli.ts');
  assert.equal(typeof runnerFor('opencode', { model: 'a/b' }), 'function');
  assert.equal(typeof runnerFor(undefined, {}), 'function');
  assert.throws(() => runnerFor('qoder' as never, {}), /unknown --harness/);
});

test('the usage text lists the harness flag and the agents-md adapter', () => {
  const result = spawnSync(process.execPath, ['src/cli.ts'], { cwd: root, encoding: 'utf8' });
  assert.match(result.stdout, /\[--harness claude\|opencode\]/);
  assert.match(result.stdout, /fake\|claude-code\|opencode\|agents-md/);
  assert.match(result.stdout, /fixtures diagnose .*Claude-only/i);
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

    const updateResult = spawnSync(process.execPath, ['src/cli.ts', 'update', '--target', target], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(updateResult.status, 0, updateResult.stderr);
    assert.match(updateResult.stdout, /Updated rusuh-id/);

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
    ['src/cli.ts', 'measure', '--profile', 'rusuh-id', '--adapter', 'not-a-harness'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not declare adapter|not implemented/i);
});

test('an unknown --harness is refused before any model call', () => {
  const result = spawnSync(
    process.execPath,
    ['src/cli.ts', 'eval', '--profile', 'rusuh-id', '--suite', 'smoke', '--harness', 'qoder'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown --harness/i);
});

test('the agents-md adapter is declared and measures like the others', () => {
  const result = spawnSync(
    process.execPath,
    ['src/cli.ts', 'measure', '--profile', 'rusuh-id', '--adapter', 'agents-md'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /adapter: agents-md/);
  assert.match(result.stdout, /always_on: \d+\/\d+ \(ok/);
});
