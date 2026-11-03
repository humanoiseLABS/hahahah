import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { validate } from './schema.ts';

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
    if (broken.pass + broken.fail === 0) problems.push('the test command produced no results');

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
