// Instrumentation, not behaviour: these tests pin the three ways a campaign used to lie about
// itself. Each one reproduces a defect actually observed on this machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  baseUrlFromSettings,
  hostOfBaseUrl,
  routeSplitOf,
  runEval,
  type EvalRun,
} from '../src/eval.ts';

// Which arm a call belongs to is a fact about the workspace the runner is handed, not about call
// order: the runner alternates arms between repeats.
const isTreatment = (cwd: string): boolean =>
  existsSync(join(cwd, '.claude/skills/hahahah-rusuh/SKILL.md'));

const answered = (inputTokens: number, costUsd = 0.1): EvalRun => ({
  output: 'jawaban',
  costUsd,
  usage: { input_tokens: inputTokens, output_tokens: 20 },
});
// A refused call still reports a usage object, with zeros: that is what the dead-route probe
// returned on this machine, and a zero-token run reads as a "small prompt" if errors are counted.
const failed = (error: string): EvalRun => ({
  output: '',
  costUsd: 0,
  usage: { input_tokens: 0, output_tokens: 0 },
  error,
});

// --- gap 1: the gateway routes per request, and the harness reports no model per run ---

test('routeSplitOf names the prompt-size signature of an off-route run', () => {
  // Real numbers from the k=3 preservation run: 68 runs near 19.1k, 4 at 62-64k.
  const baseline = [answered(19134), answered(19105), answered(63578, 0.3192)];
  const treatment = [answered(19802), answered(19758), answered(19864)];
  const split = routeSplitOf(baseline, treatment);
  assert.equal(split.deviating, 1);
  assert.deepEqual(split.byArm, { baseline: 1, treatment: 0 });
  assert.equal(split.runs, 6);
  assert.equal(split.extremeInputTokens, 63578);
});

test('routeSplitOf stays silent when one route served everything', () => {
  const runs = [answered(19134), answered(19200), answered(18900)];
  assert.equal(routeSplitOf(runs, runs).deviating, 0);
});

test('routeSplitOf does not read a run that never answered as a different route', () => {
  // A dead route reports zero tokens. Counting that as "smaller prompt" would blame the model
  // for an outage.
  const split = routeSplitOf(
    [answered(19134), answered(19200), failed('connection refused')],
    [answered(19150), answered(19180), answered(19160)],
  );
  assert.equal(split.deviating, 0);
  assert.equal(split.runs, 5);
});

// --- gap 2: provenance was read from the shell, the harness reads its own settings file ---

test('baseUrlFromSettings takes the URL and nothing else out of the settings file', () => {
  const text = JSON.stringify({
    env: { ANTHROPIC_BASE_URL: 'http://127.0.0.1:20128/v1', ANTHROPIC_API_KEY: 'secret-token' },
    model: 'haiku',
  });
  assert.equal(baseUrlFromSettings(text), 'http://127.0.0.1:20128/v1');
  assert.ok(!JSON.stringify(baseUrlFromSettings(text)).includes('secret-token'));
});

test('baseUrlFromSettings returns null for a file that does not describe a base URL', () => {
  assert.equal(baseUrlFromSettings('{not json'), null);
  assert.equal(baseUrlFromSettings('{}'), null);
  assert.equal(baseUrlFromSettings('{"env": {"ANTHROPIC_BASE_URL": 42}}'), null);
});

test('hostOfBaseUrl keeps host and port and drops credentials and path', () => {
  assert.equal(hostOfBaseUrl('http://user:pass@127.0.0.1:20128/v1?token=abc'), '127.0.0.1:20128');
  assert.equal(hostOfBaseUrl('https://gateway.example.com/v1'), 'gateway.example.com');
  assert.equal(hostOfBaseUrl('not a url'), null);
});

// --- gap 3: a campaign that answered nothing used to look like a cheap campaign ---

test('arm medians exclude runs that never answered', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let baselineCalls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'x-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: (cwd) => {
        if (isTreatment(cwd)) return answered(19000, 0.6);
        baselineCalls += 1;
        // The refused run would be the median cell of [0, 0.25, 0.75] if it were counted.
        if (baselineCalls === 1) return failed('API Error: Connection refused');
        return baselineCalls === 2 ? answered(19134, 0.25) : answered(19400, 0.75);
      },
    });
    const arm = report.results[0]!;
    assert.equal(arm.baseline.errored, 1);
    assert.equal(arm.baseline.median.costUsd, 0.5);
    assert.equal(arm.baseline.median.inputTokens, 19267);
    assert.equal(arm.treatment.errored, 0);
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /1 baseline and 0 treatment run\(s\) never answered/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the report names a route split instead of hiding it', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    const script: EvalRun[] = [
      answered(63578, 0.32),
      answered(19134),
      answered(19200),
      answered(19300),
      answered(19400),
      answered(19500),
    ];
    let index = 0;
    runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'x-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: () => script[index++]!,
    });
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /not all served by one route/);
    assert.match(markdown, /63578/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a failing route probe stops the campaign before any paid task runs', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let calls = 0;
    assert.throws(
      () =>
        runEval({
          sourceRoot: process.cwd(),
          profileId: 'rusuh-id',
          tasks: [
            { id: 'x-01', prompt: 'jawab' },
            { id: 'x-02', prompt: 'jawab' },
          ],
          outDir,
          budgetUsd: 0.05,
          probe: true,
          runner: () => {
            calls += 1;
            return failed('API Error: Connection refused');
          },
        }),
      /Route probe failed before the campaign/,
    );
    assert.equal(calls, 1);
    assert.ok(!existsSync(join(outDir, 'report.json')), 'no report for a campaign that never ran');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('an injected runner is not probed: one call per arm, no warm-up request', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let calls = 0;
    runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'x-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      runner: () => {
        calls += 1;
        return answered(19134);
      },
    });
    assert.equal(calls, 2);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
