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
  promptTokens,
  providerExhausted,
  routeSplitOf,
  runEval,
  tasksFingerprint,
  type EvalRun,
  type EvalTask,
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

test('the report records which suite definition produced it', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    const tasks: EvalTask[] = [
      { id: 'x-01', prompt: 'jawab', checks: { language: 'id', require: ['ada'] } },
    ];
    let calls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks,
      outDir,
      budgetUsd: 0.05,
      runner: () => {
        calls += 1;
        return answered(19134);
      },
    });
    assert.match(report.tasksSha256, /^[a-f0-9]{16}$/);
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.ok(markdown.includes(report.tasksSha256), 'report.md must print the fingerprint');

    // A screen edit must show up: the same suite name with a different ruler is not comparable.
    const edited: EvalTask[] = [
      { id: 'x-01', prompt: 'jawab', checks: { language: 'id', require: ['ada', 'kirim'] } },
    ];
    const second = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: edited,
      outDir,
      budgetUsd: 0.05,
      runner: () => answered(19134),
    });
    assert.notEqual(second.tasksSha256, report.tasksSha256);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the fingerprint ignores presentation-only fields like tags', () => {
  assert.equal(
    tasksFingerprint([{ id: 'a', prompt: 'p', tags: ['x'] }]),
    tasksFingerprint([{ id: 'a', prompt: 'p' }]),
  );
  assert.notEqual(
    tasksFingerprint([{ id: 'a', prompt: 'p' }]),
    tasksFingerprint([{ id: 'b', prompt: 'p' }]),
  );
});

// --- gap 5: a quota refusal must stop the campaign, not be paid for 72 times ---

const quotaError =
  'API Error: 503 [kiro/claude-sonnet-4.5-agentic] [402]: {"message":"You have reached the limit.","reason":"MONTHLY_REQUEST_COUNT"} (reset after 2m). — harness reported an error (success, num_turns=1)';

test('a quota refusal aborts the campaign and the partial report says so', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let calls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      suite: 'preservation',
      tasks: [
        { id: 'a-01', prompt: 'jawab' },
        { id: 'a-02', prompt: 'jawab' },
        { id: 'a-03', prompt: 'jawab' },
      ],
      outDir,
      budgetUsd: 0.05,
      repeats: 2,
      runner: () => {
        calls += 1;
        // Two good runs on the first task, then the gateway refuses forever.
        return calls <= 2 ? answered(19134) : failed(quotaError);
      },
    });
    assert.ok(report.aborted, 'the campaign must be marked aborted');
    assert.equal(calls, 3, 'must stop on the first refusal, not finish the loop');
    assert.equal(report.results.length, 1, 'only the task that ran is reported');
    assert.deepEqual(report.aborted.remainingTasks, ['a-02', 'a-03']);
    assert.equal(report.aborted.afterRuns, 3);
    assert.ok(existsSync(join(outDir, 'report.json')), 'a partial campaign still writes a report');
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /aborted after 3 run\(s\)/);
    assert.match(markdown, /a-02, a-03/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('an ordinary campaign is not aborted and reports no abort block', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'a-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      runner: () => answered(19134),
    });
    assert.equal(report.aborted, null);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('providerExhausted names refusals and nothing else', () => {
  assert.equal(providerExhausted(quotaError), true);
  assert.equal(providerExhausted('API Error: 429 Too Many Requests'), true);
  assert.equal(providerExhausted('insufficient_quota: you exceeded your current quota'), true);
  assert.equal(providerExhausted('API Error: Connection refused'), false);
  assert.equal(providerExhausted('harness exited 1 with no output'), false);
  assert.equal(providerExhausted('this reply mentions quota in an unrelated sentence'), false);
});

// --- gap 6: a hung harness is not a slow campaign ---

const timeoutError = 'spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT';

test('three unanswered runs in a row abort the campaign', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let calls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      suite: 'preservation',
      tasks: [
        { id: 'a-01', prompt: 'jawab' },
        { id: 'a-02', prompt: 'jawab' },
        { id: 'a-03', prompt: 'jawab' },
      ],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: () => {
        calls += 1;
        return failed(timeoutError);
      },
    });
    // Three, not seventy-two: the opencode route burned 180 s per run and would have run 72 of them.
    assert.equal(calls, 3);
    assert.ok(report.aborted, 'the campaign must abort');
    assert.equal(report.aborted.kind, 'unresponsive');
    assert.equal(report.aborted.afterRuns, 3);
    assert.deepEqual(report.aborted.remainingTasks, ['a-02', 'a-03']);
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /3 consecutive run\(s\) were answered/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('intermittent failures do not trip the breaker, only a streak does', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let calls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'a-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: () => {
        calls += 1;
        // One failure, then an answer, then two more failures: never three in a row.
        if (calls === 1 || calls === 3 || calls === 4) return failed(timeoutError);
        return answered(19134);
      },
    });
    assert.equal(calls, 6, 'a full 3-repeat campaign ran');
    assert.equal(report.aborted, null);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a quota refusal still aborts at once and is labelled differently', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let calls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'a-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: () => {
        calls += 1;
        return failed(quotaError);
      },
    });
    assert.equal(calls, 1, 'a refusal is not worth two more attempts');
    assert.equal(report.aborted?.kind, 'quota');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

// --- gap 4: a warm provider cache reports the uncached remainder as if it were the whole prompt ---

// Real numbers from the opencode/beam-free replication on 2026-11-07. The first repeat in a
// workspace is cold (input 4453, cache read 1856); later repeats of the same prompt are warm
// (input 36, cache read 6272). Both are the same 6308-token prompt.
const cached = (input: number, read: number, write = 0): EvalRun => ({
  output: 'jawaban',
  costUsd: 0,
  usage: {
    input_tokens: input,
    output_tokens: 20,
    cache_read_input_tokens: read,
    cache_creation_input_tokens: write,
  },
});

test('routeSplitOf does not read a warm cache as a different route', () => {
  const baseline = [cached(4453, 1856), cached(36, 6272), cached(36, 6272)];
  const treatment = [cached(5100, 1856), cached(41, 6912), cached(39, 6912)];
  const split = routeSplitOf(baseline, treatment);
  assert.equal(split.deviating, 0, 'one model served all six runs; the cache state is not a route');
  assert.equal(split.extremeInputTokens, 6956);
});

test('arm medians report the whole prompt when the cache is warm', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-instr-'));
  try {
    let baselineCalls = 0;
    let treatmentCalls = 0;
    runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'x-01', prompt: 'jawab' }],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: (cwd) => {
        if (isTreatment(cwd)) {
          treatmentCalls += 1;
          return treatmentCalls === 1 ? cached(5100, 1856) : cached(41, 6912);
        }
        baselineCalls += 1;
        return baselineCalls === 1 ? cached(4453, 1856) : cached(36, 6272);
      },
    });
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.doesNotMatch(
      markdown,
      /not all served by one route/,
      'a warm cache must not publish a route warning',
    );
    assert.match(markdown, /in 6308/, `baseline prompt is 6308 tokens, not the 36 uncached ones`);
    assert.match(markdown, /in 6953/, 'treatment prompt is 6953 tokens');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('promptTokens counts the whole input side, cached or not', () => {
  // Hand-derived from the recorded parts: 36 + 6272 = 6308, 4453 + 1856 = 6309, 100 + 500 = 600.
  assert.equal(promptTokens({ input_tokens: 36, cache_read_input_tokens: 6272 }), 6308);
  assert.equal(
    promptTokens({
      input_tokens: 4453,
      cache_read_input_tokens: 1856,
      cache_creation_input_tokens: 0,
    }),
    6309,
  );
  assert.equal(
    promptTokens({
      input_tokens: 100,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 500,
    }),
    600,
    'a cache write is input the provider processed too',
  );
  // Archived reports and the Claude path carry no cache fields when nothing was cached.
  assert.equal(promptTokens({ input_tokens: 19134 }), 19134);
});

test('promptTokens stays undefined when the harness reported no input count', () => {
  // Returning 0 here would put a non-measurement into a median as a tiny prompt.
  assert.equal(promptTokens({ output_tokens: 20 }), undefined);
  assert.equal(promptTokens(null), undefined);
  assert.equal(promptTokens(undefined), undefined);
  assert.equal(promptTokens('nope'), undefined);
});
