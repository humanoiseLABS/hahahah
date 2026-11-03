import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSuite, runEval } from '../src/eval.ts';

test('smoke suite loads and validates', () => {
  const suite = loadSuite(process.cwd(), 'smoke');
  assert.equal(suite.schema, 'hahahah.eval.suite/v1');
  assert.ok(suite.tasks.length >= 5);
  assert.ok(suite.tasks.every((task) => task.id && task.prompt));
});

test('smoke suite screens the Phase 3 language and ruling defects', () => {
  const suite = loadSuite(process.cwd(), 'smoke');
  const byId = new Map(suite.tasks.map((task) => [task.id, task]));
  for (const id of [
    'persona-card-01',
    'persona-serious-01',
    'decision-destructive-01',
    'decision-ambiguous-01',
    'safety-religion-01',
  ]) {
    assert.equal(byId.get(id)?.checks?.language, 'id', `${id} must screen the answer language`);
  }
  const religion = byId.get('safety-religion-01')?.checks?.forbid ?? [];
  assert.ok(religion.some((pattern) => new RegExp(pattern, 'i').test('dosa besar')));
  const serious = byId.get('persona-serious-01')?.checks?.forbid ?? [];
  assert.ok(serious.some((pattern) => new RegExp(pattern, 'u').test('🔥')));
});

test('decisions and safety suites load with a screen on every task', () => {
  for (const name of ['decisions', 'safety']) {
    const suite = loadSuite(process.cwd(), name);
    assert.ok(suite.tasks.length >= 15, `${name} needs at least 15 tasks`);
    const ids = new Set<string>();
    for (const task of suite.tasks) {
      assert.ok(!ids.has(task.id), `${name} has a duplicate task id ${task.id}`);
      ids.add(task.id);
      assert.equal(task.checks?.language, 'id', `${task.id} must screen the answer language`);
      const screens = (task.checks?.require?.length ?? 0) + (task.checks?.forbid?.length ?? 0);
      assert.ok(screens > 0, `${task.id} must carry at least one require/forbid screen`);
      assert.match(task.prompt, /Tanpa memakai tools/, `${task.id} must stay tool-free`);
    }
  }
});

test('the decisions suite covers every documented instruction and risk class', () => {
  const tags = new Set(
    loadSuite(process.cwd(), 'decisions').tasks.flatMap((task) => task.tags ?? []),
  );
  for (const cls of [
    'instruction-valid',
    'instruction-suboptimal',
    'instruction-ambiguous',
    'instruction-destructive',
    'instruction-premise',
    'instruction-prohibited',
    'antisycophancy',
  ]) {
    assert.ok(tags.has(cls), `${cls} is not covered`);
  }
  for (const risk of ['risk-0', 'risk-1', 'risk-2', 'risk-3', 'risk-4']) {
    assert.ok(tags.has(risk), `${risk} is not covered`);
  }
});

test('the safety suite covers the documented threat families', () => {
  const tags = new Set(loadSuite(process.cwd(), 'safety').tasks.flatMap((task) => task.tags ?? []));
  for (const family of [
    'injection',
    'sara',
    'religion',
    'secret',
    'harmful-tooling',
    'serious-mode',
  ]) {
    assert.ok(tags.has(family), `${family} is not covered`);
  }
});

test('loadSuite rejects an invalid screen pattern before any harness call', () => {
  const root = mkdtempSync(join(tmpdir(), 'hahahah-suite-'));
  try {
    mkdirSync(join(root, 'evals'), { recursive: true });
    mkdirSync(join(root, 'schemas'), { recursive: true });
    copyFileSync(
      join(process.cwd(), 'schemas', 'eval-suite.schema.json'),
      join(root, 'schemas', 'eval-suite.schema.json'),
    );
    writeFileSync(
      join(root, 'evals', 'bad.yaml'),
      [
        'schema: hahahah.eval.suite/v1',
        'suite: bad',
        'tasks:',
        '  - id: bad-01',
        '    prompt: tes',
        '    checks:',
        '      language: id',
        '      require:',
        "        - '('",
        '',
      ].join('\n'),
    );
    assert.throws(() => loadSuite(root, 'bad'), /invalid require pattern/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('eval runner installs treatment, runs baseline and treatment, and writes a report', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'persona-smoke-01', prompt: 'Reply with the active persona name.' }],
      outDir,
      budgetUsd: 0.05,
      runner: (cwd) => {
        const active = existsSync(join(cwd, '.claude/skills/hahahah-rusuh/SKILL.md'));
        return {
          output: active ? 'RUSUH' : 'no persona',
          costUsd: 0.01,
          usage: { input_tokens: 10, output_tokens: 2 },
          error: undefined,
        };
      },
    });

    assert.equal(report.results.length, 1);
    assert.equal(report.results[0]?.baseline.output, 'no persona');
    assert.equal(report.results[0]?.treatment.output, 'RUSUH');
    assert.equal(report.results[0]?.baseline.costUsd, 0.01);
    assert.ok(existsSync(join(outDir, 'report.json')));
    assert.ok(existsSync(join(outDir, 'report.md')));
    const json = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8')) as {
      schema: string;
    };
    assert.equal(json.schema, 'hahahah.eval/v1');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('eval attaches deterministic checks and a summary to each arm', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [
        {
          id: 'language-01',
          prompt: 'Jawab dalam bahasa Indonesia.',
          checks: { language: 'id', forbid: ['\\bdosa\\b'] },
        },
      ],
      outDir,
      budgetUsd: 0.05,
      runner: (cwd) => ({
        output: existsSync(join(cwd, '.claude/skills/hahahah-rusuh/SKILL.md'))
          ? 'Nggak bisa. Gue cek dulu log-nya, karena error muncul setelah deploy kemarin.'
          : 'Not possible. I will check the logs because the error appeared after the deploy.',
        costUsd: 0.01,
        usage: { input_tokens: 10, output_tokens: 10 },
        error: undefined,
      }),
    });

    const baselineChecks = report.results[0]?.baseline.checks ?? [];
    const treatmentChecks = report.results[0]?.treatment.checks ?? [];
    assert.equal(baselineChecks.find((check) => check.name === 'language')?.status, 'fail');
    assert.equal(treatmentChecks.find((check) => check.name === 'language')?.status, 'pass');
    assert.equal(report.summary.baseline.fail, 1);
    assert.equal(report.summary.treatment.pass, 2);
    assert.equal(report.summary.tasks_with_checks, 1);

    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /Treatment checks: 2 pass/);
    assert.match(markdown, /language fail: expected id, got en/);
    assert.match(markdown, /deterministic surface screens/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('eval runner records runner errors without inventing output', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'blocked-01', prompt: 'Hello.' }],
      outDir,
      budgetUsd: 0.05,
      runner: () => ({
        output: '',
        costUsd: 0,
        error: 'Not logged in',
      }),
    });
    assert.equal(report.results[0]?.baseline.error, 'Not logged in');
    assert.equal(report.results[0]?.treatment.error, 'Not logged in');
    assert.equal(report.results[0]?.treatment.output, '');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
