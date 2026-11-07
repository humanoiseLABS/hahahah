import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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

test('decision, safety, and preservation suites load with a screen on every task', () => {
  const expected: Record<string, number> = {
    decisions: 20,
    safety: 15,
    preservation: 10,
    'rusuh-voice': 12,
  };
  for (const [name, minTasks] of Object.entries(expected)) {
    const suite = loadSuite(process.cwd(), name);
    assert.ok(suite.tasks.length >= minTasks, `${name} needs at least ${minTasks} tasks`);
    const ids = new Set<string>();
    for (const task of suite.tasks) {
      assert.ok(!ids.has(task.id), `${name} has a duplicate task id ${task.id}`);
      ids.add(task.id);
      const prompts =
        task.prompt !== undefined ? [task.prompt] : (task.turns ?? []).map((turn) => turn.prompt);
      assert.ok(prompts.length > 0, `${task.id} must carry a prompt or turns`);
      const screened = [task.checks, ...(task.turns ?? []).map((turn) => turn.checks)];
      const languageOk =
        !task.prompt || task.checks?.language === 'id'
          ? true
          : (task.turns ?? []).every((turn) => turn.checks?.language === 'id');
      assert.equal(languageOk, true, `${task.id} must screen the answer language`);
      const screens = screened.reduce(
        (total, block) => total + (block?.require?.length ?? 0) + (block?.forbid?.length ?? 0),
        0,
      );
      assert.ok(screens > 0, `${task.id} must carry at least one require/forbid screen`);
      for (const prompt of prompts) {
        assert.match(prompt, /Tanpa memakai tools/, `${task.id} must stay tool-free`);
      }
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

const idAnswer = 'Nggak bisa. Gue cek dulu log-nya, karena error muncul setelah deploy kemarin.';
const enAnswer = 'Not possible. I will check the logs because the error appeared after the deploy.';

function isTreatment(cwd: string): boolean {
  return existsSync(join(cwd, '.claude/skills/hahahah-rusuh/SKILL.md'));
}

test('the eval runner installs the harness-matched adapter tree when told which harness answers', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  // The study deletes every workspace when it finishes, so each observation has to be taken
  // while the runner is inside it.
  const seen: Array<{ agents: boolean; claude: boolean; skill: boolean }> = [];
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      adapterId: 'opencode',
      tasks: [{ id: 'adapter-opencode-01', prompt: 'Reply once.' }],
      outDir,
      budgetUsd: 0.05,
      runner: (cwd) => {
        seen.push({
          agents: existsSync(join(cwd, 'AGENTS.md')),
          claude: existsSync(join(cwd, 'CLAUDE.md')),
          skill: existsSync(join(cwd, '.claude/skills/hahahah-rusuh/SKILL.md')),
        });
        return { output: 'ok', costUsd: 0.01 };
      },
    });

    assert.equal(report.results.length, 1);
    // Baseline runs first in repeat 0: bare, then the treatment carrying AGENTS.md.
    assert.deepEqual(seen, [
      { agents: false, claude: false, skill: false },
      { agents: true, claude: false, skill: true },
    ]);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('eval runner installs treatment, runs baseline and treatment, and writes a v7 report', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  try {
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [{ id: 'persona-smoke-01', prompt: 'Reply with the active persona name.' }],
      outDir,
      budgetUsd: 0.05,
      runner: (cwd) => ({
        output: isTreatment(cwd) ? 'RUSUH' : 'no persona',
        costUsd: 0.01,
        usage: { input_tokens: 10, output_tokens: 2 },
        error: undefined,
      }),
    });

    assert.equal(report.results.length, 1);
    assert.equal(report.repeats, 1);
    assert.equal(report.results[0]?.baseline.runs.length, 1);
    assert.equal(report.results[0]?.baseline.runs[0]?.output, 'no persona');
    assert.equal(report.results[0]?.treatment.runs[0]?.output, 'RUSUH');
    assert.equal(report.results[0]?.treatment.median.costUsd, 0.01);
    assert.equal(report.total_cost_usd, 0.02);
    assert.ok(existsSync(join(outDir, 'report.json')));
    assert.ok(existsSync(join(outDir, 'report.md')));
    const json = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8')) as {
      schema: string;
    };
    assert.equal(json.schema, 'hahahah.eval/v7');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('eval attaches deterministic checks, consensus, and a summary to each arm', () => {
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
        output: isTreatment(cwd) ? idAnswer : enAnswer,
        costUsd: 0.01,
        usage: { input_tokens: 10, output_tokens: 10 },
        error: undefined,
      }),
    });

    const baseline = report.results[0]?.baseline;
    const treatment = report.results[0]?.treatment;
    assert.equal(
      baseline?.runs[0]?.checks?.find((check) => check.name === 'language')?.status,
      'fail',
    );
    assert.equal(
      treatment?.runs[0]?.checks?.find((check) => check.name === 'language')?.status,
      'pass',
    );
    assert.equal(baseline?.consensus, 'fail');
    assert.equal(treatment?.consensus, 'pass');
    assert.equal(report.summary.baseline.fail, 1);
    assert.equal(report.summary.treatment.pass, 2);
    assert.equal(report.summary.tasks_with_checks, 1);

    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /Treatment checks: 2 pass/);
    assert.match(markdown, /language fail/);
    assert.match(markdown, /medians across the repeats/);
    assert.match(markdown, /deterministic surface screens/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('repeats record k runs per arm, medians, and an alternating arm order', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  try {
    const order: Array<'baseline' | 'treatment'> = [];
    let baselineCalls = 0;
    let treatmentCalls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [
        { id: 'repeat-01', prompt: 'Jawab dalam bahasa Indonesia.', checks: { language: 'id' } },
      ],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: (cwd) => {
        const treatment = isTreatment(cwd);
        order.push(treatment ? 'treatment' : 'baseline');
        const call = treatment ? ++treatmentCalls : ++baselineCalls;
        return {
          output: treatment ? idAnswer : enAnswer,
          costUsd: call * 0.01,
          usage: { input_tokens: 10 * call, output_tokens: 2 },
          error: undefined,
        };
      },
    });

    const baseline = report.results[0]?.baseline;
    const treatment = report.results[0]?.treatment;
    assert.equal(report.repeats, 3);
    assert.equal(baseline?.runs.length, 3);
    assert.equal(treatment?.runs.length, 3);
    assert.deepEqual(order, [
      'baseline',
      'treatment',
      'treatment',
      'baseline',
      'baseline',
      'treatment',
    ]);
    // Costs are 0.01, 0.02, 0.03 per arm; the median, not the mean, is what gets reported.
    assert.equal(baseline?.median.costUsd, 0.02);
    assert.equal(treatment?.median.costUsd, 0.02);
    assert.equal(treatment?.median.inputTokens, 20);
    assert.equal(report.total_cost_usd, 0.12);
    assert.equal(treatment?.consensus, 'pass');
    assert.equal(baseline?.consensus, 'fail');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('one failing repeat downgrades consensus to mixed instead of pass', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-'));
  try {
    let treatmentCalls = 0;
    const report = runEval({
      sourceRoot: process.cwd(),
      profileId: 'rusuh-id',
      tasks: [
        { id: 'flaky-01', prompt: 'Jawab dalam bahasa Indonesia.', checks: { language: 'id' } },
      ],
      outDir,
      budgetUsd: 0.05,
      repeats: 3,
      runner: (cwd) => {
        if (isTreatment(cwd)) {
          treatmentCalls += 1;
          return {
            output: treatmentCalls === 2 ? enAnswer : idAnswer,
            costUsd: 0.01,
            usage: { input_tokens: 10, output_tokens: 10 },
          };
        }
        return { output: idAnswer, costUsd: 0.01, usage: { input_tokens: 10, output_tokens: 10 } };
      },
    });

    const treatment = report.results[0]?.treatment;
    assert.deepEqual(treatment?.runStatuses, ['pass', 'fail', 'pass']);
    assert.equal(treatment?.consensus, 'mixed');
    assert.equal(report.summary.treatment.fail, 1);
    assert.equal(report.summary.treatment.pass, 2);
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
    assert.equal(report.results[0]?.baseline.runs[0]?.error, 'Not logged in');
    assert.equal(report.results[0]?.treatment.runs[0]?.error, 'Not logged in');
    assert.equal(report.results[0]?.treatment.consensus, 'error');
    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /ERROR: Not logged in/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('every eval suite is discoverable from --help', () => {
  const suites = readdirSync(join(process.cwd(), 'evals'))
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => file.slice(0, -'.yaml'.length));
  assert.ok(suites.length >= 5, 'the eval directory must still hold the shipped suites');
  const help = spawnSync(process.execPath, ['src/cli.ts', '--help'], { encoding: 'utf8' });
  for (const suite of suites) {
    assert.ok(help.stdout.includes(suite), `evals/${suite}.yaml is not listed in --help`);
  }
});

// The rubric files are human review material: nothing executes them. Marking them keeps a second
// "suite" from looking like it was measured.
test('persona rubric files are labelled as manual, not executable', () => {
  for (const id of readdirSync(join(process.cwd(), 'personas'))) {
    const rubric = readFileSync(join(process.cwd(), 'personas', id, 'tests.yaml'), 'utf8');
    assert.match(rubric, /^status: manual-rubric$/m, `${id}: rubric status`);
  }
});

test('the CCI dataset holds three scenarios per capability, each a script', () => {
  const suite = loadSuite(process.cwd(), 'cci');
  assert.equal(suite.tasks.length, 15);
  const counts = new Map<string, number>();
  const ids = new Set<string>();
  for (const task of suite.tasks) {
    assert.ok(task.capability, `${task.id} must name a capability`);
    counts.set(task.capability, (counts.get(task.capability) ?? 0) + 1);
    assert.ok((task.turns?.length ?? 0) >= 2, `${task.id} must be a conversation`);
    assert.ok(task.objective, `${task.id} must state an objective`);
    assert.ok((task.expect?.length ?? 0) > 0, `${task.id} must list expected qualities`);
    assert.ok((task.failIf?.length ?? 0) > 0, `${task.id} must list failure conditions`);
    assert.ok(task.human, `${task.id} must carry human guidance`);
    assert.ok(!ids.has(task.id), `${task.id} duplicated`);
    ids.add(task.id);
    const screens = (task.turns ?? []).reduce(
      (total, turn) =>
        total + (turn.checks?.require?.length ?? 0) + (turn.checks?.forbid?.length ?? 0),
      0,
    );
    assert.ok(screens > 0, `${task.id} must carry a deterministic screen`);
  }
  for (const capability of [
    'cultural-awareness',
    'continuity',
    'improvisation',
    'local-language',
    'social-fluency',
  ]) {
    assert.equal(counts.get(capability), 3, `${capability} must have three scenarios`);
  }
});
