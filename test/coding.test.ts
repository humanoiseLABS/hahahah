import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkAll,
  checkFixture,
  commandError,
  fixturePrompt,
  loadFixtures,
  projectedCostUsd,
  runFixtureStudy,
  type AgentRun,
  type AgentRunner,
  type CodingFixture,
} from '../src/coding.ts';
import { validate } from '../src/schema.ts';

const root = process.cwd();

test('every shipped coding fixture is red in its task state and green with the solution', () => {
  const checks = checkAll(root);
  assert.ok(checks.length >= 24, `expected at least 24 fixtures, found ${checks.length}`);
  const broken = checks.filter((check) => !check.ok);
  assert.deepEqual(
    broken.map((check) => `${check.id}: ${check.detail}`),
    [],
    'a fixture that cannot be graded would waste paid model runs',
  );
  const hidden = checks.filter((check) => check.hidden);
  assert.ok(hidden.length >= 4, 'the set needs hidden holdout tasks');
  // A fixture that is red on every test is asking for a rewrite, not a fix.
  const noGreen = checks.filter((check) => check.ok && check.testsFailingWhenBroken === 0);
  assert.deepEqual(
    noGreen.map((check) => check.id),
    [],
    'every valid fixture must fail at least one test before the fix',
  );
});

test('every fixture has a brief long enough to be a task and a declared test count', () => {
  for (const fixture of loadFixtures(root)) {
    assert.ok(fixture.brief.length >= 40, `${fixture.id} brief is too thin`);
    assert.ok(fixture.tests >= 2, `${fixture.id} needs at least two tests`);
    assert.ok(fixture.tags && fixture.tags.length > 0, `${fixture.id} needs tags`);
  }
});

test('the fixture runner refuses anything but the node test runner', () => {
  assert.equal(commandError(['node', '--test']), undefined);
  assert.equal(commandError(['node', '--test', 'test']), undefined);
  assert.match(commandError(['node', '--exec-permission', 'x']) ?? '', /only --test is allowed/);
  assert.match(commandError(['node', '-e', 'process.exit()']) ?? '', /only --test is allowed/);
  assert.match(commandError(['cmd', '/c', 'dir']) ?? '', /only the node test runner is allowed/);
  assert.match(commandError(['node', '--test', '../outside']) ?? '', /relative path/);
  assert.match(
    commandError(['node', '--test', '--experimental-permission']) ?? '',
    /relative path/,
  );
});

test('a fixture whose task state already passes is rejected', () => {
  const alreadySolved: CodingFixture = {
    schema: 'hahahah.coding.fixture/v1',
    id: 'cod-trivial',
    brief: 'this fixture asks for nothing because the shipped code is already correct',
    files: [
      { path: 'src/a.js', content: 'export const a = 1;\n' },
      { path: 'test/a.test.js', content: "import test from 'node:test';\ntest('a', () => {});\n" },
    ],
    solution: [{ path: 'src/a.js', content: 'export const a = 1;\n' }],
    tests: 1,
  };

  const check = checkFixture(alreadySolved);
  assert.equal(check.ok, false);
  assert.match(check.detail, /already passes/);
});

test('a fixture cannot place files outside its own workspace', () => {
  const source = loadFixtures(root)[0];
  assert.ok(source);
  const escaping = structuredClone(source);
  escaping.files[0] = { path: '../escape.js', content: 'export const x = 1;\n' };
  assert.throws(
    () => validate('codingFixture', escaping, 'inline-test', root),
    /validation failed/i,
    'the schema must reject traversal before anything is written',
  );
});

const MINI_SOURCE = 'export const value = 1;\n';
const MINI_TESTS = [
  "import test from 'node:test';",
  "import assert from 'node:assert/strict';",
  "import { value } from '../src/a.js';",
  '',
  "test('nilai yang diminta', () => {",
  '  assert.equal(value, 2);',
  '});',
  '',
  "test('nilai lama bukan jawabannya', () => {",
  '  assert.notEqual(value, 1);',
  '});',
  '',
].join('\n');

const miniFixture = (): CodingFixture => ({
  schema: 'hahahah.coding.fixture/v1',
  id: 'cod-study-mini',
  brief: 'Perbaiki src/a.js. Nilai yang benar untuk export const value adalah dua, bukan satu.',
  language: 'id',
  tags: ['study-harness'],
  files: [
    { path: 'src/a.js', content: MINI_SOURCE },
    { path: 'test/a.test.js', content: MINI_TESTS },
  ],
  solution: [{ path: 'src/a.js', content: 'export const value = 2;\n' }],
  tests: 2,
});

interface StudyStub {
  runner: AgentRunner;
  prompts: string[];
  seen: Array<{ cwd: string; profile: boolean }>;
}

function stubAgent(
  act: (cwd: string, call: number) => void,
  outcome?: Partial<AgentRun>,
): StudyStub {
  const stub: StudyStub = {
    prompts: [],
    seen: [],
    runner: (cwd: string, prompt: string) => {
      stub.prompts.push(prompt);
      stub.seen.push({ cwd, profile: existsSync(join(cwd, 'CLAUDE.md')) });
      act(cwd, stub.seen.length - 1);
      return {
        output: 'selesai',
        costUsd: 0.02,
        usage: { input_tokens: 120, output_tokens: 15 },
        numTurns: 2,
        ...outcome,
      };
    },
  };
  return stub;
}

function study(
  act: (cwd: string, call: number) => void,
  outcome?: Partial<AgentRun>,
  repeats = 1,
  fixture = miniFixture(),
): {
  report: ReturnType<typeof runFixtureStudy>;
  stub: StudyStub;
  outDir: string;
} {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-study-out-'));
  const stub = stubAgent(act, outcome);
  const report = runFixtureStudy({
    sourceRoot: root,
    profileId: 'rusuh-id',
    fixtures: [fixture],
    outDir,
    budgetUsd: 0.35,
    repeats,
    runner: stub.runner,
  });
  return { report, stub, outDir };
}

const fixTheFile = (cwd: string) => {
  writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 2;\n', 'utf8');
};

test('the study grades a real fix as solved with the fixture tests', () => {
  const { report, stub, outDir } = study((cwd) => {
    writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 2;\n', 'utf8');
  });
  try {
    assert.equal(report.schema, 'hahahah.coding.study/v1');
    assert.equal(report.fixtures_run, 1);
    assert.equal(report.summary.baseline.solved, 1);
    assert.equal(report.summary.treatment.solved, 1);
    assert.equal(report.total_cost_usd, 0.04);
    assert.equal(report.budget_per_run_usd, 0.35);
    assert.equal(report.model, null);
    assert.deepEqual(
      report.results[0]?.baseline.runs.map((run) => [run.pass, run.fail]),
      [[2, 0]],
      'both repeats of the fixed file pass two tests and fail none',
    );
    assert.equal(report.results[0]?.treatment.median.inputTokens, 120);
    // The prompt is the fixture brief plus the no-tampering rule, identical in both arms.
    assert.equal(stub.prompts.length, 2);
    assert.equal(stub.prompts[0], stub.prompts[1]);
    assert.match(stub.prompts[0]!, /Perbaiki src\/a\.js/);
    assert.match(stub.prompts[0]!, /jangan menambah file test baru/);
    assert.match(readFileSync(join(outDir, 'report.md'), 'utf8'), /What this grades/);
    const json = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8')) as {
      schema: string;
      results: Array<{ treatment: { runs: Array<{ run: { output: string } }> } }>;
    };
    assert.equal(json.schema, 'hahahah.coding.study/v1');
    assert.equal(json.results[0]?.treatment.runs[0]?.run.output, 'selesai');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('only the treatment arm carries the installed profile', () => {
  const { report, stub, outDir } = study((cwd) => {
    writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 2;\n', 'utf8');
  });
  try {
    // Repeats start with the baseline, so the first call is bare and the second is not.
    assert.deepEqual(
      stub.seen.map((entry) => entry.profile),
      [false, true],
    );
    assert.equal(report.results[0]?.treatment.runs[0]?.otherNewFiles.length, 0);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

const zeroTally = { solved: 0, failed: 0, tampered: 0, untouched: 0, error: 0 };

test('a reply that never edits the workspace is untouched, not a pass', () => {
  const { report, outDir } = study(() => undefined);
  try {
    assert.deepEqual(report.summary, {
      baseline: { ...zeroTally, untouched: 1 },
      treatment: { ...zeroTally, untouched: 1 },
      holdout: { baseline: zeroTally, treatment: zeroTally },
    });
    assert.deepEqual(report.results[0]?.baseline.grades, ['untouched']);
    assert.deepEqual(report.results[0]?.treatment.grades, ['untouched']);
    assert.equal(
      report.results[0]?.baseline.runs[0]?.fail,
      2,
      'the tests still ran, and they still say the task is unsolved',
    );
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('holdout fixtures are tallied apart from the visible set', () => {
  const holdout = miniFixture();
  holdout.hidden = true;
  const { report, outDir } = study(fixTheFile, undefined, 1, holdout);
  try {
    assert.equal(report.fixtures_run, 1);
    assert.equal(report.hidden_run, 1);
    assert.deepEqual(report.summary.holdout, {
      baseline: { ...zeroTally, solved: 1 },
      treatment: { ...zeroTally, solved: 1 },
    });
    assert.match(
      readFileSync(join(outDir, 'report.md'), 'utf8'),
      /Hidden holdout \(1 of 1 fixtures\)/,
    );
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a wrong fix is graded failed, not solved', () => {
  const { report, outDir } = study((cwd) => {
    writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 3;\n', 'utf8');
  });
  try {
    assert.equal(report.summary.baseline.failed, 1);
    assert.equal(report.summary.baseline.solved, 0);
    assert.equal(report.results[0]?.baseline.runs[0]?.fail, 1);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('rewriting the test file is tampering even when the rewritten tests pass', () => {
  const { report, outDir } = study((cwd) => {
    // The naive grader would score this as solved: the suite is green and exits 0.
    writeFileSync(
      join(cwd, 'test', 'a.test.js'),
      [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "import { value } from '../src/a.js';",
        '',
        "test('nilai', () => {",
        '  assert.equal(value, 1);',
        '});',
        '',
        "test('satu itu satu', () => {",
        '  assert.equal(value, 1);',
        '});',
        '',
      ].join('\n'),
      'utf8',
    );
  });
  try {
    assert.equal(report.summary.baseline.tampered, 1);
    assert.equal(report.summary.baseline.solved, 0);
    assert.equal(report.summary.treatment.solved, 0);
    const run = report.results[0]?.baseline.runs[0];
    assert.equal(run?.fail, 0, 'evidence that the tampered suite really was green');
    assert.equal(run?.pass, 2);
    assert.deepEqual(run?.changedFiles, ['test/a.test.js']);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('adding a new test file is tampering', () => {
  const { report, outDir } = study((cwd) => {
    writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 2;\n', 'utf8');
    writeFileSync(
      join(cwd, 'test', 'extra.test.js'),
      "import test from 'node:test';\ntest('extra', () => {});\n",
      'utf8',
    );
  });
  try {
    assert.equal(report.summary.baseline.tampered, 1);
    assert.deepEqual(report.results[0]?.baseline.runs[0]?.extraTestFiles, ['test/extra.test.js']);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a run that never completed is an error and is never scored', () => {
  const { report, outDir } = study(() => undefined, {
    output: '',
    costUsd: 0,
    usage: undefined,
    numTurns: undefined,
    // Verbatim shape of what cmd.exe returns for a missing binary: it wraps over lines.
    error:
      "'hahahah-no-such-binary' is not recognized as an internal or external command,\noperable program or batch file.",
  });
  try {
    assert.equal(report.summary.baseline.error, 1);
    assert.equal(report.summary.baseline.failed, 0, 'an error is not a model failure');
    assert.equal(report.total_cost_usd, 0);
    const run = report.results[0]?.baseline.runs[0];
    assert.equal(run?.grade, 'error');
    assert.equal(run?.pass, 0);
    assert.equal(run?.fail, 0);
    // A multi-line harness error would tear the markdown table row apart.
    const tableRow = readFileSync(join(outDir, 'report.md'), 'utf8')
      .split('\n')
      .find((line) => line.startsWith('| cod-study-mini'));
    assert.ok(tableRow?.endsWith('|'), `row rendered as: ${JSON.stringify(tableRow)}`);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('repeats run both arms and keep per-fixture medians', () => {
  const { report, stub, outDir } = study(
    (cwd) => {
      writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 2;\n', 'utf8');
    },
    undefined,
    3,
  );
  try {
    assert.equal(report.repeats, 3);
    assert.equal(stub.prompts.length, 6);
    assert.equal(report.total_cost_usd.toFixed(2), '0.12');
    assert.equal(report.results[0]?.baseline.solved, 3);
    assert.equal(report.results[0]?.treatment.median.costUsd, 0.02);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('every repeat starts from the broken task state', () => {
  // Only the very first run fixes the file. If a workspace were reused across repeats,
  // the second sample of that arm would inherit the fix and read as a second success.
  let fixed = 0;
  const { report, outDir } = study(
    (cwd, call) => {
      if (call === 0) {
        writeFileSync(join(cwd, 'src', 'a.js'), 'export const value = 2;\n', 'utf8');
        fixed += 1;
      }
    },
    undefined,
    2,
  );
  try {
    assert.equal(fixed, 1);
    assert.equal(report.repeats, 2);
    assert.deepEqual(report.results[0]?.baseline.grades, ['solved', 'untouched']);
    assert.deepEqual(report.results[0]?.treatment.grades, ['untouched', 'untouched']);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the projection counts every arm so the ceiling is not a surprise', () => {
  assert.equal(projectedCostUsd(12, 1, 0.35).toFixed(2), '8.40');
  assert.equal(projectedCostUsd(60, 3, 0.35).toFixed(2), '126.00');
  assert.equal(projectedCostUsd(1, 1, 0.1), 0.2);
});

test('the task prompt keeps the fixture language and states the grading rule', () => {
  const fixture = miniFixture();
  const id = fixturePrompt(fixture);
  assert.ok(id.startsWith(fixture.brief.trim()), 'the brief leads, the rules follow');
  assert.match(id, /Kerjakan di direktori kerja ini/);
  assert.match(id, /Jangan mengubah file test/);
  assert.match(id, /jangan menambah file test baru/);

  fixture.language = 'en';
  assert.match(fixturePrompt(fixture), /Do not modify a test file/);

  // A fixture that does not declare a language is an Indonesian task.
  delete fixture.language;
  assert.match(fixturePrompt(fixture), /Kerjakan di direktori kerja ini/);
});

function cli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  // A bogus binary path is the safety belt: even if the ceiling logic regressed, no
  // request could reach a real account from these tests.
  const result = spawnSync(process.execPath, ['src/cli.ts', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HAHAHAH_CLAUDE_BIN: 'hahahah-test-no-such-binary' },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('fixtures run plans without calling a model', () => {
  const one = cli(['fixtures', 'run', '--id', 'cod-expiry-gte', '--budget-usd', '0.35']);
  assert.equal(one.status, 0, one.stderr);
  assert.match(one.stdout, /running 1 of 1 selected fixture\(s\) \(0 marked hidden holdout\)/);
  assert.match(one.stdout, /projected worst case: \$0\.70/);
  assert.match(one.stdout, /no model was called and nothing was spent/);

  const holdout = cli(['fixtures', 'run', '--id', 'cod-alg-none', '--budget-usd', '0.35']);
  assert.match(holdout.stdout, /running 1 of 1 selected fixture\(s\) \(1 marked hidden holdout\)/);

  const wholeSet = cli(['fixtures', 'run', '--budget-usd', '0.35']);
  assert.match(wholeSet.stdout, /running \d+ of \d+ selected fixture\(s\)/);
});

test('--live refuses until the ceiling is stated, then refuses an over-projection', () => {
  const noCeiling = cli(['fixtures', 'run', '--live', '--limit', '1', '--budget-usd', '0.35']);
  assert.equal(noCeiling.status, 1);
  assert.match(noCeiling.stderr, /--live needs --max-total-usd/);

  const overCeiling = cli([
    'fixtures',
    'run',
    '--live',
    '--limit',
    '1',
    '--budget-usd',
    '0.35',
    '--max-total-usd',
    '0.01',
  ]);
  assert.equal(overCeiling.status, 1);
  assert.match(overCeiling.stderr, /exceeds the approved ceiling/);
});

test('fixtures run rejects an unknown fixture id before doing anything', () => {
  const result = cli(['fixtures', 'run', '--id', 'cod-does-not-exist']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown fixture id/);
});
