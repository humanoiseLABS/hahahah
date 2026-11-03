import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { install } from './install.ts';
import { validate } from './schema.ts';
import { median, runClaude, usageNumber } from './eval.ts';
import { removeWorkspace } from './workspace.ts';

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

// The grade must not depend on the host. TZ is pinned because a local-day getter is a
// defensible fix, and without this it measures 3/3 in Jakarta and 1/3 in Los Angeles.
// NODE_OPTIONS stays out so a fixture cannot inherit anything from the calling shell.
export const GRADE_ENV: NodeJS.ProcessEnv = {
  PATH: process.env.PATH ?? '',
  HOME: tmpdir(),
  SYSTEMROOT: process.env.SYSTEMROOT ?? '',
  TEMP: tmpdir(),
  TMP: tmpdir(),
  TMPDIR: tmpdir(),
  TZ: 'UTC',
};

// Node walks up from the workspace looking for a package.json, so a manifest sitting
// outside the temp dir — or one the agent wrote as CommonJS — decides whether the ESM
// test files load at all. The graded workspace states its own module type.
export function ensureModuleMarker(dir: string): void {
  const marker = join(dir, 'package.json');
  if (existsSync(marker) && !statSync(marker).isFile()) {
    return;
  }
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(readFileSync(marker, 'utf8')) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (parsed === null) {
    writeFileSync(marker, '{\n  "type": "module"\n}\n', 'utf8');
    return;
  }
  if (parsed.type === 'module') {
    return;
  }
  // Keep what the agent declared; only the field that decides module loading is corrected.
  writeFileSync(marker, `${JSON.stringify({ ...parsed, type: 'module' }, null, 2)}\n`, 'utf8');
}

export function testTargets(fixture: CodingFixture, command: string[]): string[] {
  if (command.length > 2) {
    return command.slice(2);
  }
  // Pinned to the fixture's own test files. Bare `node --test` also discovers `*_test.js`,
  // `*-test.js` and `test-*.js`, so a scratch file the agent left behind could add passes
  // that were never declared, or fail the grade for a reason unrelated to the fix.
  return fixture.files.filter((file) => TEST_FILE.test(file.path)).map((file) => file.path);
}

export function runTests(cwd: string, command: string[], targets: string[] = []): TestRun {
  // The reporter is pinned to TAP so the counts below are stable regardless of the
  // terminal the tool happens to run in; the fixture cannot choose it.
  const args = ['--test', '--test-reporter=tap', ...targets];
  ensureModuleMarker(cwd);
  // commandError only ever allows `node`, and grading with the interpreter that is running
  // this tool takes PATH off the list of things that can move a grade.
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    shell: false,
    env: GRADE_ENV,
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
    const targets = testTargets(fixture, command);
    writeFiles(workspace, fixture.files);
    const broken = runTests(workspace, command, targets);
    writeFiles(workspace, fixture.solution);
    const fixed = runTests(workspace, command, targets);

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
    removeWorkspace(workspace);
  }
}

export function checkAll(root: string, dir = 'fixtures'): FixtureCheck[] {
  return loadFixtures(root, dir).map(checkFixture);
}

const TEST_FILE = /\.test\.(cjs|js|mjs)$/;
// Paths this tool owns inside a graded workspace: the installed profile and the module
// manifest that pins ESM loading. They must not read as "files the agent created".
const RUNNER_OWNED = new Set(['CLAUDE.md', 'package.json']);

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
      if (!RUNNER_OWNED.has(path)) found.push(path);
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
    // Line endings are normalised: an editor that rewrites the whole file with CRLF is not
    // tampering, and treating it as such would blame the persona for a git checkout setting.
    else if (text.replace(/\r\n/g, '\n') !== content.replace(/\r\n/g, '\n'))
      changedFiles.push(path);
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
  const command = fixture.runner?.command ?? DEFAULT_COMMAND;
  // The tests always run, including on a tampered workspace: the counts are the evidence
  // that shows what the tampering bought the agent.
  const result = runTests(workspace, command, testTargets(fixture, command));
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
  // A grader that timed out or could not spawn says nothing about the agent's work, so it
  // must not be recorded as a failed task.
  else if (result.error) grade = 'error';
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
  arms: Array<'baseline' | 'treatment'>;
  fixtures_run: number;
  hidden_run: number;
  total_cost_usd: number;
  harness: { permission_mode: 'acceptEdits'; permission_prompts: 'none' };
  residue: string[];
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
  // A preflight only needs to know whether one arm behaves, and running both costs twice.
  arm?: 'both' | 'baseline' | 'treatment';
  // Injectable so the case that actually destroyed the first live run — a workspace the OS
  // refuses to delete while the harness still holds it — is testable on any platform.
  remove?: (dir: string) => boolean;
}

export function projectedCostUsd(
  count: number,
  repeats: number,
  budgetUsd: number,
  arms = 2,
): number {
  return count * repeats * arms * budgetUsd;
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
  const residue =
    report.residue.length === 0
      ? 'none'
      : `${report.residue.length} workspace dir(s) were still held open by the harness and are left behind: ${report.residue.join(', ')}`;
  const lines = [
    '# HAHahah coding fixture study',
    '',
    `- Profile: ${report.profile}`,
    `- Model: ${report.model ?? 'harness default'}`,
    `- Generated: ${report.generated_at}`,
    `- Fixtures run: ${report.fixtures_run} (${report.hidden_run} hidden holdout)`,
    `- Repeats per fixture per arm: ${report.repeats}`,
    `- Arms run: ${report.arms.join(' + ')}${report.arms.length === 1 ? ' (single arm — no baseline/treatment comparison is available from this run)' : ''}`,
    `- Budget per run: $${report.budget_per_run_usd.toFixed(2)}`,
    `- Total cost reported: $${report.total_cost_usd.toFixed(4)}`,
    `- Harness: headless, --permission-mode ${report.harness.permission_mode}, --permission-prompts ${report.harness.permission_prompts}`,
    `- Workspace residue after the run: ${residue}`,
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
  const residue: string[] = [];
  const remove = options.remove ?? removeWorkspace;
  const arms: Array<'baseline' | 'treatment'> =
    options.arm && options.arm !== 'both' ? [options.arm] : ['baseline', 'treatment'];
  for (const fixture of fixtures) {
    const prompt = fixturePrompt(fixture);
    const baseline: FixtureArmRun[] = [];
    const treatment: FixtureArmRun[] = [];
    for (let index = 0; index < repeats; index += 1) {
      let order: Array<'baseline' | 'treatment'> = ['baseline', 'treatment'];
      if (arms.length === 1) {
        order = arms;
      } else if (index % 2 === 1) {
        order = ['treatment', 'baseline'];
      }
      for (const arm of order) {
        // A fresh workspace per repeat: if the previous run's edits carried over, the
        // second sample would be measuring the first one.
        const dir = mkdtempSync(join(tmpdir(), `hahahah-study-${arm}-`));
        try {
          writeFiles(dir, fixture.files);
          // Seeded before the agent runs, so both arms get the same workspace and the
          // manifest never shows up as something the agent created.
          ensureModuleMarker(dir);
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
          if (!remove(dir)) residue.push(dir);
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
    arms,
    fixtures_run: results.length,
    hidden_run: holdout.length,
    total_cost_usd: allRuns.reduce((total, arm) => total + arm.run.costUsd, 0),
    harness: { permission_mode: 'acceptEdits', permission_prompts: 'none' },
    residue,
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
