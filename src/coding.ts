import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { install } from './install.ts';
import { validate } from './schema.ts';
import { median, runClaude, usageNumber } from './eval.ts';

export interface FixtureFile {
  path: string;
  content: string;
}

export interface CodingFixture {
  schema: 'hahahah.coding.fixture/v1';
  id: string;
  brief: string;
  tags?: string[];
  hidden?: boolean;
  language?: 'id' | 'en';
  files: FixtureFile[];
  solution: FixtureFile[];
  tests: number;
  runner?: { command: string[] };
}

export interface FixtureCheck {
  id: string;
  ok: boolean;
  detail: string;
  hidden: boolean;
  testsFailingWhenBroken: number;
  testsPassingWithSolution: number;
}

const DEFAULT_COMMAND = ['node', '--test'];

export function commandError(command: string[]): string | undefined {
  if (command[0] !== 'node') return `${String(command[0])}: only the node test runner is allowed`;
  if (command[1] !== '--test') return `node ${String(command[1])}: only --test is allowed`;
  if (command.length > 3) return 'too many arguments for the test runner';
  const target = command[2];
  if (
    target !== undefined &&
    (target.startsWith('-') || target.includes('..') || !/^[A-Za-z0-9._/-]+$/.test(target))
  ) {
    return `test target ${target} must be a plain relative path, not an option`;
  }
  return undefined;
}

function inside(root: string, path: string): string {
  const base = resolve(root);
  const target = resolve(base, path);
  if (target !== base && !target.startsWith(base + '/') && !target.startsWith(base + '\\')) {
    throw new Error(`fixture path escapes the workspace: ${path}`);
  }
  return target;
}

function writeFiles(root: string, files: FixtureFile[]): void {
  for (const file of files) {
    const target = inside(root, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content, 'utf8');
  }
}

function structureErrors(fixture: CodingFixture): string[] {
  const problems: string[] = [];
  const taskPaths = new Set(fixture.files.map((file) => file.path));
  for (const file of fixture.solution) {
    if (!taskPaths.has(file.path)) {
      problems.push(`solution changes ${file.path}, which the task does not provide`);
    }
  }
  if (!fixture.files.some((file) => /\.test\.(js|mjs|cjs)$/.test(file.path))) {
    problems.push('no *.test.js file is provided, so the fixture cannot be graded');
  }
  return problems;
}

interface TestRun {
  passed: boolean;
  pass: number;
  fail: number;
  error?: string;
}

function runTests(cwd: string, command: string[]): TestRun {
  // The reporter is pinned to TAP so the counts below are stable regardless of the
  // terminal the tool happens to run in; the fixture cannot choose it.
  const args = ['--test', '--test-reporter=tap', ...command.slice(2)];
  // No shell, no inherited NODE_OPTIONS, and the working directory is the fixture itself.
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '',
    HOME: tmpdir(),
    SYSTEMROOT: process.env.SYSTEMROOT ?? '',
    TEMP: tmpdir(),
    TMP: tmpdir(),
    TMPDIR: tmpdir(),
  };
  const result = spawnSync(command[0] as string, args, {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    shell: false,
    env,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const pass = Number(output.match(/^# pass (\d+)$/m)?.[1] ?? '0');
  const fail = Number(output.match(/^# fail (\d+)$/m)?.[1] ?? '0');
  if (result.error) return { passed: false, pass, fail, error: result.error.message };
  return { passed: result.status === 0 && fail === 0 && pass > 0, pass, fail };
}

export function loadFixtures(root: string, dir = 'fixtures'): CodingFixture[] {
  const folder = join(root, dir);
  const names = readdirSync(folder)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();
  const fixtures: CodingFixture[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    let data: unknown;
    try {
      data = parse(readFileSync(join(folder, name), 'utf8'));
      validate('codingFixture', data, `${dir}/${name}`, root);
    } catch (error) {
      problems.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const fixture = data as CodingFixture;
    if (seen.has(fixture.id)) problems.push(`${name}: duplicate fixture id ${fixture.id}`);
    seen.add(fixture.id);
    const command = commandError(fixture.runner?.command ?? DEFAULT_COMMAND);
    if (command) problems.push(`${name}: ${command}`);
    for (const problem of structureErrors(fixture)) problems.push(`${name}: ${problem}`);
    fixtures.push(fixture);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid coding fixtures:\n${problems.map((line) => `- ${line}`).join('\n')}`);
  }
  return fixtures;
}

export function checkFixture(fixture: CodingFixture): FixtureCheck {
  const workspace = mkdtempSync(join(tmpdir(), 'hahahah-fixture-'));
  try {
    const command = fixture.runner?.command ?? DEFAULT_COMMAND;
    writeFiles(workspace, fixture.files);
    const broken = runTests(workspace, command);
    writeFiles(workspace, fixture.solution);
    const fixed = runTests(workspace, command);

    const problems: string[] = [];
    if (broken.passed) problems.push('the task state already passes, so nothing is being asked');
    if (!fixed.passed)
      problems.push(`the reference solution does not pass: ${fixed.error ?? `fail=${fixed.fail}`}`);
    if (fixed.pass !== fixture.tests) {
      problems.push(`declared ${fixture.tests} tests, the runner counted ${fixed.pass}`);
    }
    // Every test must still be *discovered and run* in the task state. A broken file that
    // crashes the module reports one failure for the whole file, which is not a red
    // assertion and would let an ungradeable fixture pass validation.
    if (broken.pass + broken.fail !== fixture.tests) {
      problems.push(
        `task state ran ${broken.pass + broken.fail} of ${fixture.tests} tests, so the suite is crashing rather than asserting`,
      );
    }

    return {
      id: fixture.id,
      ok: problems.length === 0,
      detail:
        problems.length === 0
          ? `${fixed.pass} tests pass with the solution; ${broken.fail} fail in the task state`
          : problems.join('; '),
      hidden: fixture.hidden === true,
      testsFailingWhenBroken: broken.fail,
      testsPassingWithSolution: fixed.pass,
    };
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

export function checkAll(root: string, dir = 'fixtures'): FixtureCheck[] {
  return loadFixtures(root, dir).map(checkFixture);
}

const TEST_FILE = /\.test\.(cjs|js|mjs)$/;
// Paths the profile install owns. They are ours, not the agent's, so they must not
// read as "the agent created files".
const INSTALLED_PATHS = new Set(['CLAUDE.md']);

export interface AgentRun {
  output: string;
  costUsd: number;
  usage?: unknown;
  numTurns?: number;
  error?: string;
}

export type AgentRunner = (cwd: string, prompt: string, budgetUsd: number) => AgentRun;

const TASK_NOTES: Record<'id' | 'en', string[]> = {
  id: [
    'Kerjakan di direktori kerja ini.',
    'Test ada di file test/*.test.js. Buat semuanya lulus.',
    'Jangan mengubah file test dan jangan menambah file test baru.',
  ],
  en: [
    'Work in this working directory.',
    'The tests live in test/*.test.js. Make all of them pass.',
    'Do not modify a test file and do not add a new test file.',
  ],
};

export function fixturePrompt(fixture: CodingFixture): string {
  const notes = TASK_NOTES[fixture.language ?? 'id'];
  return [fixture.brief.trim(), '', ...notes].join('\n');
}

export interface WorkspaceDiff {
  changedFiles: string[];
  missingFiles: string[];
  extraTestFiles: string[];
  otherNewFiles: string[];
}

function listWorkspaceFiles(root: string, relativeDir = '.'): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(root, relativeDir), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Hidden directories hold the harness state, node_modules holds dependencies.
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      found.push(...listWorkspaceFiles(root, join(relativeDir, entry.name)));
    } else {
      const absolute = join(root, relativeDir, entry.name);
      const path = relative(root, absolute).replace(/\\/g, '/');
      if (!INSTALLED_PATHS.has(path)) found.push(path);
    }
  }
  return found;
}

export function diffWorkspace(fixture: CodingFixture, workspace: string): WorkspaceDiff {
  const declared = new Map(fixture.files.map((file) => [file.path, file.content]));
  const changedFiles: string[] = [];
  const missingFiles: string[] = [];
  for (const [path, content] of declared) {
    let text: string | undefined;
    try {
      text = readFileSync(inside(workspace, path), 'utf8');
    } catch {
      text = undefined;
    }
    if (text === undefined) missingFiles.push(path);
    else if (text !== content) changedFiles.push(path);
  }
  const extraTestFiles: string[] = [];
  const otherNewFiles: string[] = [];
  for (const path of listWorkspaceFiles(workspace)) {
    if (declared.has(path)) continue;
    if (TEST_FILE.test(path)) extraTestFiles.push(path);
    else otherNewFiles.push(path);
  }
  return { changedFiles, missingFiles, extraTestFiles, otherNewFiles };
}

export type FixtureGrade = 'solved' | 'failed' | 'tampered' | 'untouched' | 'error';

export interface FixtureArmRun {
  grade: FixtureGrade;
  run: AgentRun;
  pass: number;
  fail: number;
  changedFiles: string[];
  missingFiles: string[];
  extraTestFiles: string[];
  otherNewFiles: string[];
}

export function gradeRun(fixture: CodingFixture, workspace: string, run: AgentRun): FixtureArmRun {
  const empty = {
    changedFiles: [],
    missingFiles: [],
    extraTestFiles: [],
    otherNewFiles: [],
  };
  if (run.error) return { grade: 'error', run, pass: 0, fail: 0, ...empty };
  const diff = diffWorkspace(fixture, workspace);
  // The tests always run, including on a tampered workspace: the counts are the evidence
  // that shows what the tampering bought the agent.
  const result = runTests(workspace, fixture.runner?.command ?? DEFAULT_COMMAND);
  const tampered =
    diff.extraTestFiles.length > 0 ||
    diff.changedFiles.some((path) => TEST_FILE.test(path)) ||
    diff.missingFiles.some((path) => TEST_FILE.test(path));
  const untouched =
    diff.changedFiles.length === 0 &&
    diff.missingFiles.length === 0 &&
    diff.otherNewFiles.length === 0;
  let grade: FixtureGrade;
  if (tampered) grade = 'tampered';
  else if (untouched) grade = 'untouched';
  else grade = result.passed && result.pass >= fixture.tests ? 'solved' : 'failed';
  return { grade, run, pass: result.pass, fail: result.fail, ...diff };
}

export interface ArmSummary {
  runs: FixtureArmRun[];
  grades: FixtureGrade[];
  solved: number;
  median: {
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    numTurns: number;
  };
}

function summarizeArm(runs: FixtureArmRun[]): ArmSummary {
  const numbers = (pick: (run: AgentRun) => number | undefined) =>
    median(
      runs
        .map((arm) => arm.run)
        .map(pick)
        .filter((v): v is number => v !== undefined),
    );
  return {
    runs,
    grades: runs.map((arm) => arm.grade),
    solved: runs.filter((arm) => arm.grade === 'solved').length,
    median: {
      costUsd: numbers((run) => run.costUsd),
      inputTokens: numbers((run) => usageNumber(run.usage, 'input_tokens')),
      outputTokens: numbers((run) => usageNumber(run.usage, 'output_tokens')),
      numTurns: numbers((run) => run.numTurns),
    },
  };
}

export interface FixtureStudyResult {
  fixture: CodingFixture;
  baseline: ArmSummary;
  treatment: ArmSummary;
}

interface GradeTally {
  solved: number;
  failed: number;
  tampered: number;
  untouched: number;
  error: number;
}

function tally(results: FixtureStudyResult[], arm: 'baseline' | 'treatment'): GradeTally {
  const grades = results.flatMap((result) => result[arm].grades);
  const count = (grade: FixtureGrade) => grades.filter((value) => value === grade).length;
  return {
    solved: count('solved'),
    failed: count('failed'),
    tampered: count('tampered'),
    untouched: count('untouched'),
    error: count('error'),
  };
}

export interface FixtureStudyReport {
  schema: 'hahahah.coding.study/v1';
  generated_at: string;
  profile: string;
  model: string | null;
  suite: 'coding-fixtures';
  budget_per_run_usd: number;
  repeats: number;
  fixtures_run: number;
  hidden_run: number;
  total_cost_usd: number;
  harness: { permission_mode: 'acceptEdits'; permission_prompts: 'none' };
  summary: {
    baseline: GradeTally;
    treatment: GradeTally;
    holdout: { baseline: GradeTally; treatment: GradeTally };
  };
  results: FixtureStudyResult[];
}

export interface StudyOptions {
  sourceRoot: string;
  profileId: string;
  fixtures: CodingFixture[];
  outDir: string;
  budgetUsd: number;
  repeats?: number;
  limit?: number;
  model?: string;
  settingSources?: string;
  runner?: AgentRunner;
}

export function projectedCostUsd(count: number, repeats: number, budgetUsd: number): number {
  // Two arms per fixture per repeat.
  return count * repeats * 2 * budgetUsd;
}

function safeAgent(runner: AgentRunner, cwd: string, prompt: string, budget: number): AgentRun {
  try {
    return runner(cwd, prompt, budget);
  } catch (error) {
    return {
      output: '',
      costUsd: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function studyMarkdown(report: FixtureStudyReport): string {
  const line = (arm: ArmSummary) => {
    // A harness error can arrive over several lines, and this lands inside a table cell.
    const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
    if (arm.runs.length > 0 && arm.runs.every((run) => run.grade === 'error'))
      return `error (${oneLine(arm.runs[0]?.run.error ?? 'no runs')})`;
    return `${arm.grades.join(', ')} — solved ${arm.solved}/${arm.runs.length}`;
  };
  const cell = (arm: ArmSummary) =>
    `$${arm.median.costUsd.toFixed(4)} (in ${Math.round(arm.median.inputTokens)}, out ${Math.round(arm.median.outputTokens)}, turns ${arm.median.numTurns || '?'})`;
  const lines = [
    '# HAHahah coding fixture study',
    '',
    `- Profile: ${report.profile}`,
    `- Model: ${report.model ?? 'harness default'}`,
    `- Generated: ${report.generated_at}`,
    `- Fixtures run: ${report.fixtures_run} (${report.hidden_run} hidden holdout)`,
    `- Repeats per fixture per arm: ${report.repeats}`,
    `- Budget per run: $${report.budget_per_run_usd.toFixed(2)}`,
    `- Total cost reported: $${report.total_cost_usd.toFixed(4)}`,
    `- Harness: headless, --permission-mode ${report.harness.permission_mode}, --permission-prompts ${report.harness.permission_prompts}`,
    '',
    `Baseline: solved ${report.summary.baseline.solved}, failed ${report.summary.baseline.failed}, tampered ${report.summary.baseline.tampered}, untouched ${report.summary.baseline.untouched}, error ${report.summary.baseline.error}`,
    `Treatment: solved ${report.summary.treatment.solved}, failed ${report.summary.treatment.failed}, tampered ${report.summary.treatment.tampered}, untouched ${report.summary.treatment.untouched}, error ${report.summary.treatment.error}`,
    `Hidden holdout (${report.hidden_run} of ${report.fixtures_run} fixtures) — baseline solved ${report.summary.holdout.baseline.solved}, treatment solved ${report.summary.holdout.treatment.solved}. Read these apart: the visible set is what the fixtures were designed against, so a holdout that scores worse is the honest signal.`,
    '',
    '| Fixture | Baseline | Treatment | Baseline median | Treatment median |',
    '|---|---|---|---:|---:|',
    ...report.results.map(
      (result) =>
        `| ${result.fixture.id}${result.fixture.hidden ? ' (hidden)' : ''} | ${line(result.baseline)} | ${line(result.treatment)} | ${cell(result.baseline)} | ${cell(result.treatment)} |`,
    ),
    '',
    '## What this grades',
    '',
    "Each run is graded by executing the fixture's own tests in the workspace after the agent finished, so this is a correctness signal rather than a text screen.",
    '`solved` means the untouched tests all passed. `tampered` means a test file was edited, deleted, or added; those runs are never counted as solved even when the tests then pass.',
    '`untouched` means the workspace was byte-identical to the task state: the agent replied without changing the code.',
    '`error` is a run that did not complete. It is reported as an error and never scored as a failure of the persona.',
    '',
    '## Limits of this report',
    '',
    'The agent ran headless with file edits auto-accepted and every other permission denied, so it could not execute the test suite itself. Pass rates are conditioned on that and are not a claim about interactive use.',
    'A `tampered` or `untouched` spike may be a harness permission problem rather than a model choice; check a raw transcript before attributing either grade to the persona.',
    'Costs are medians over the repeats because this provider bills heavy-tailed spikes; one run is not a measurement.',
    'With this many fixtures the solved counts are descriptive. No non-inferiority or accuracy rate is claimed.',
    '',
  ];
  return lines.join('\n');
}

export function runFixtureStudy(options: StudyOptions): FixtureStudyReport {
  const repeats = options.repeats ?? 1;
  const fixtures = options.fixtures.slice(0, options.limit ?? options.fixtures.length);
  const runner =
    options.runner ??
    ((cwd: string, prompt: string, budgetUsd: number) =>
      runClaude(cwd, prompt, budgetUsd, {
        model: options.model,
        settingSources: options.settingSources,
        // The fixture task is to change source files, so edits are the one thing the
        // agent must be able to do. Shell and network stay denied: this host is
        // unsandboxed (TECHNICAL_RISKS R-10/R-14), and the grade comes from the tests
        // this tool runs afterwards, not from anything the agent ran.
        agentArgs: ['--permission-mode', 'acceptEdits', '--permission-prompts', 'none'],
      }));

  const results: FixtureStudyResult[] = [];
  for (const fixture of fixtures) {
    const prompt = fixturePrompt(fixture);
    const baseline: FixtureArmRun[] = [];
    const treatment: FixtureArmRun[] = [];
    for (let index = 0; index < repeats; index += 1) {
      const order = index % 2 === 0 ? ['baseline', 'treatment'] : ['treatment', 'baseline'];
      for (const arm of order) {
        // A fresh workspace per repeat: if the previous run's edits carried over, the
        // second sample would be measuring the first one.
        const dir = mkdtempSync(join(tmpdir(), `hahahah-study-${arm}-`));
        try {
          writeFiles(dir, fixture.files);
          if (arm === 'treatment') {
            install({
              sourceRoot: options.sourceRoot,
              targetRoot: dir,
              profileId: options.profileId,
            });
          }
          const run = safeAgent(runner, dir, prompt, options.budgetUsd);
          (arm === 'baseline' ? baseline : treatment).push(gradeRun(fixture, dir, run));
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      }
    }
    results.push({
      fixture,
      baseline: summarizeArm(baseline),
      treatment: summarizeArm(treatment),
    });
  }

  const allRuns = results.flatMap((result) => [...result.baseline.runs, ...result.treatment.runs]);
  const holdout = results.filter((result) => result.fixture.hidden);
  const report: FixtureStudyReport = {
    schema: 'hahahah.coding.study/v1',
    generated_at: new Date().toISOString(),
    profile: options.profileId,
    model: options.model ?? null,
    suite: 'coding-fixtures',
    budget_per_run_usd: options.budgetUsd,
    repeats,
    fixtures_run: results.length,
    hidden_run: holdout.length,
    total_cost_usd: allRuns.reduce((total, arm) => total + arm.run.costUsd, 0),
    harness: { permission_mode: 'acceptEdits', permission_prompts: 'none' },
    summary: {
      baseline: tally(results, 'baseline'),
      treatment: tally(results, 'treatment'),
      holdout: {
        baseline: tally(holdout, 'baseline'),
        treatment: tally(holdout, 'treatment'),
      },
    },
    results,
  };

  const outDir = resolve(options.outDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(outDir, 'report.md'), studyMarkdown(report), 'utf8');
  return report;
}
