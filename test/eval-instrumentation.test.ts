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
  parseClaudeResult,
  promptTokens,
  providerExhausted,
  routeSplitOf,
  withTranscript,
  runEval,
  tasksFingerprint,
  type EvalRun,
  type EvalTask,
} from '../src/eval.ts';

// Which arm a call belongs to is a fact about the workspace the runner is handed, not about call
// order: the runner alternates arms between repeats.
const isTreatment = (cwd: string): boolean =>
  existsSync(join(cwd, '.claude/skills/hahahah-plus62/SKILL.md')) ||
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

test('the fingerprint covers a turn script and its per-turn screens', () => {
  const base = {
    id: 'mt',
    turns: [{ prompt: 'a', checks: { language: 'id' as const } }, { prompt: 'b' }],
  };
  assert.equal(
    tasksFingerprint([base]),
    tasksFingerprint([{ ...base, tags: ['voice'] }]),
    'tags are presentation-only',
  );
  // Editing a turn's screen changes the ruler, so the two reports must not be compared.
  assert.notEqual(
    tasksFingerprint([base]),
    tasksFingerprint([
      { id: 'mt', turns: [{ prompt: 'a', checks: { forbid: ['wkwk'] } }, { prompt: 'b' }] },
    ]),
  );
  assert.notEqual(
    tasksFingerprint([base]),
    tasksFingerprint([{ id: 'mt', turns: [{ prompt: 'a', checks: { language: 'id' } }] }]),
    'a removed turn changes the script',
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
    // Both opencode campaigns were labelled this way while the provider was actually refusing. The
    // refusal reached the harness log in 0.4 s and never reached our stdout, so the label cannot claim
    // to know the cause - it has to send the reader to the log instead of asserting a dead route.
    assert.match(markdown, /harness's own log/i);
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

test('providerExhausted recognises the opencode free-tier refusal', () => {
  // Verbatim from ~/.local/share/opencode/log/opencode.log on 2026-11-07. opencode logged this 0.4 s
  // after sending the request and then hung instead of exiting, so the runner saw a 180 s spawn
  // timeout and the campaign was labelled unresponsive when the provider had actually refused.
  assert.equal(
    providerExhausted(
      'AI_APICallError: Free usage limit reached. Free models work in OpenCode (https://opencode.ai); subscribe to OpenCode Go to keep going: https://opencode.ai/go',
    ),
    true,
  );
  assert.equal(
    providerExhausted(
      'AI_RetryError: Failed after 3 attempts. Last error: Free usage limit reached.',
    ),
    true,
  );
});

// --- multi-turn: continuity is measured, not assumed ---

test('a multi-turn task sends each turn in order with the turns before it', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-turn-'));
  try {
    const seen: Array<{ prompt: string; history: string[] }> = [];
    runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [
        {
          id: 'mt-order-01',
          turns: [{ prompt: 'turn satu' }, { prompt: 'turn dua' }, { prompt: 'turn tiga' }],
        },
      ],
      outDir,
      budgetUsd: 0.05,
      repeats: 1,
      runner: (_cwd, prompt, _budget, history) => {
        seen.push({ prompt, history: (history ?? []).map((turn) => turn.text) });
        return answered(19134);
      },
    });
    // Two arms, one repeat: three calls each, and history never crosses an arm boundary.
    assert.deepEqual(
      seen.map((entry) => entry.prompt),
      ['turn satu', 'turn dua', 'turn tiga', 'turn satu', 'turn dua', 'turn tiga'],
    );
    assert.deepEqual(
      seen.map((entry) => entry.history.length),
      [0, 2, 4, 0, 2, 4],
    );
    assert.deepEqual(seen[2]?.history, ['turn satu', 'jawaban', 'turn dua', 'jawaban']);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the repeat check fails when two turns answer with the same line', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-turn-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'mt-repeat-01', turns: [{ prompt: 'turn satu' }, { prompt: 'turn dua' }] }],
      outDir,
      budgetUsd: 0.05,
      repeats: 1,
      runner: () => ({ output: 'WADUH KENAPA LAGI sini gw cek log-nya', costUsd: 0.01 }),
    });
    const checks = report.results[0]?.baseline.runs[0]?.checks ?? [];
    const repeat = checks.find((check) => check.name === 'repeat');
    assert.ok(repeat, 'a multi-turn run must carry a repeat check');
    assert.equal(repeat.status, 'fail');
    assert.match(repeat.detail, /waduh kenapa lagi/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the repeat check passes when the second turn is rephrased', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-turn-'));
  try {
    const replies = ['WADUH KENAPA LAGI sini gw cek log-nya', 'Oke, kirim stack trace-nya dulu ya'];
    let call = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'mt-repeat-02', turns: [{ prompt: 'turn satu' }, { prompt: 'turn dua' }] }],
      outDir,
      budgetUsd: 0.05,
      repeats: 1,
      runner: () => ({ output: replies[call++ % 2]!, costUsd: 0.01 }),
    });
    const checks = report.results[0]?.baseline.runs[0]?.checks ?? [];
    assert.equal(checks.find((check) => check.name === 'repeat')?.status, 'pass');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('per-turn screens judge the turn they belong to', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-turn-'));
  try {
    const replies = ['ini jawaban indonesia', 'this is an english answer'];
    let call = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [
        {
          id: 'mt-screens-01',
          turns: [{ prompt: 'turn satu' }, { prompt: 'turn dua', checks: { language: 'id' } }],
        },
      ],
      outDir,
      budgetUsd: 0.05,
      repeats: 1,
      runner: () => ({ output: replies[call++ % 2]!, costUsd: 0.01 }),
    });
    const checks = report.results[0]?.baseline.runs[0]?.checks ?? [];
    const language = checks.filter((check) => check.name === 'language');
    // Only the second turn declares a language screen, so exactly one result exists and it fails.
    assert.equal(language.length, 1);
    assert.equal(language[0]?.status, 'fail');
    assert.match(language[0]?.detail ?? '', /turn 2/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a multi-turn run reports the sum of its turns', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-turn-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'mt-sum-01', turns: [{ prompt: 'satu' }, { prompt: 'dua' }] }],
      outDir,
      budgetUsd: 0.05,
      repeats: 1,
      runner: () => ({
        output: 'jawaban',
        costUsd: 0.25,
        usage: { input_tokens: 1000, output_tokens: 10 },
        numTurns: 1,
      }),
    });
    const run = report.results[0]?.baseline.runs[0];
    assert.equal(run?.costUsd, 0.5);
    assert.deepEqual(run?.usage, { input_tokens: 2000, output_tokens: 20 });
    assert.equal(run?.numTurns, 2);
    assert.equal((run?.output ?? '').length > 0, true);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('single-turn tasks keep their prompt and pass no history', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-turn-'));
  try {
    const seen: Array<{ prompt: string; history: unknown[] }> = [];
    runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'st-01', prompt: 'jawab satu kata' }],
      outDir,
      budgetUsd: 0.05,
      repeats: 1,
      runner: (_cwd, prompt, _budget, history) => {
        seen.push({ prompt, history: history ?? [] });
        return answered(19134);
      },
    });
    assert.deepEqual(
      seen.map((entry) => entry.prompt),
      ['jawab satu kata', 'jawab satu kata'],
    );
    assert.equal(
      seen.every((entry) => entry.history.length === 0),
      true,
    );
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the transcript a runner receives carries every earlier turn', () => {
  const history = [
    { role: 'user' as const, text: 'halo' },
    { role: 'assistant' as const, text: 'yow, ada apaan' },
  ];
  const rendered = withTranscript(history, 'lanjut');
  assert.match(rendered, /User: halo/);
  assert.match(rendered, /Assistant: yow, ada apaan/);
  assert.match(rendered, /Current message:\nlanjut$/);
  // A single-turn run must reach the harness byte-for-byte unchanged.
  assert.equal(withTranscript(undefined, 'jawab'), 'jawab');
  assert.equal(withTranscript([], 'jawab'), 'jawab');
});

// --- the Claude CLI can preface its JSON with a warning line ---

test('the Claude result is found after a stray warning line', () => {
  const stdout = [
    '[claude-code:unrecognized_model] {"model":"tes","query_source":"sdk"}',
    '{"type":"result","subtype":"success","is_error":false,"result":"OK","total_cost_usd":0.075,"num_turns":1,"usage":{"input_tokens":28163,"output_tokens":158}}',
  ].join('\n');
  const parsed = parseClaudeResult(stdout);
  assert.ok(parsed, 'the result object must be found after the warning');
  assert.equal(parsed.result, 'OK');
  assert.equal(parsed.total_cost_usd, 0.075);
  assert.equal(parseClaudeResult('[claude-code:unrecognized_model] {"model":"tes"}'), null);
  assert.equal(parseClaudeResult(''), null);
});
