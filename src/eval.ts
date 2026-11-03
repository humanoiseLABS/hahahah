import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { install } from './install.ts';
import { validate } from './schema.ts';
import {
  checkSuiteErrors,
  runChecks,
  summarize,
  type CheckResult,
  type CheckSummary,
  type TaskChecks,
} from './checks.ts';

export interface EvalTask {
  id: string;
  prompt: string;
  tags?: string[];
  checks?: TaskChecks;
}

export interface EvalRun {
  output: string;
  costUsd: number;
  usage?: unknown;
  numTurns?: number;
  durationMs?: number;
  error?: string;
  checks?: CheckResult[];
}

export type EvalRunner = (cwd: string, prompt: string, budgetUsd: number) => EvalRun;

export interface ArmMedians {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  numTurns: number;
}

export interface EvalArm {
  runs: EvalRun[];
  consensus: 'pass' | 'fail' | 'mixed' | 'unknown' | 'error' | 'no-checks';
  runStatuses: Array<'pass' | 'fail' | 'unknown' | 'error' | 'no-checks'>;
  median: ArmMedians;
  screens: CheckSummary;
}

export interface EvalResult {
  task: EvalTask;
  baseline: EvalArm;
  treatment: EvalArm;
}

export interface EvalReport {
  schema: 'hahahah.eval/v2';
  generated_at: string;
  profile: string;
  suite: string;
  budget_per_run_usd: number;
  repeats: number;
  model: string | null;
  total_cost_usd: number;
  results: EvalResult[];
  summary: { baseline: CheckSummary; treatment: CheckSummary; tasks_with_checks: number };
}

export interface EvalOptions {
  sourceRoot: string;
  profileId: string;
  tasks: EvalTask[];
  outDir: string;
  budgetUsd: number;
  suite?: string;
  limit?: number;
  repeats?: number;
  model?: string;
  settingSources?: string;
  runner?: EvalRunner;
}

export interface EvalSuite {
  schema: 'hahahah.eval.suite/v1';
  suite: string;
  tasks: EvalTask[];
}

export function loadSuite(root: string, name: string): EvalSuite {
  const path = join(root, 'evals', `${name}.yaml`);
  const data = parse(readFileSync(path, 'utf8')) as unknown;
  validate('evalSuite', data, `evals/${name}.yaml`, root);
  const suite = data as EvalSuite;
  const errors = checkSuiteErrors(suite.tasks);
  if (errors.length > 0) {
    throw new Error(`Invalid eval suite ${name}:\n${errors.map((line) => `- ${line}`).join('\n')}`);
  }
  return suite;
}

function safeRun(runner: EvalRunner, cwd: string, prompt: string, budgetUsd: number): EvalRun {
  try {
    return runner(cwd, prompt, budgetUsd);
  } catch (error) {
    return {
      output: '',
      costUsd: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type RunStatus = 'pass' | 'fail' | 'unknown' | 'error' | 'no-checks';

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function usageNumber(usage: unknown, key: string): number | undefined {
  if (typeof usage !== 'object' || usage === null) return undefined;
  const value = (usage as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : undefined;
}

function statusOf(run: EvalRun): RunStatus {
  if (run.error) return 'error';
  if (!run.checks || run.checks.length === 0) return 'no-checks';
  if (run.checks.some((check) => check.status === 'fail')) return 'fail';
  if (run.checks.some((check) => check.status === 'unknown')) return 'unknown';
  return 'pass';
}

function consensusOf(statuses: RunStatus[]): EvalArm['consensus'] {
  const meaningful = statuses.filter((status) => status !== 'no-checks');
  if (meaningful.length === 0) return 'no-checks';
  if (meaningful.every((status) => status === 'error')) return 'error';
  if (meaningful.every((status) => status === 'pass')) return 'pass';
  if (meaningful.every((status) => status === 'fail')) return 'fail';
  // Undecidable is not a failure: report it as itself instead of blending it into mixed.
  if (!meaningful.includes('fail') && meaningful.includes('unknown')) return 'unknown';
  return 'mixed';
}

function buildArm(runs: EvalRun[], checks?: TaskChecks): EvalArm {
  for (const run of runs) {
    if (!run.error && checks) run.checks = runChecks(run.output, checks);
  }
  const statuses = runs.map(statusOf);
  return {
    runs,
    consensus: consensusOf(statuses),
    runStatuses: statuses,
    median: {
      costUsd: median(runs.map((run) => run.costUsd)),
      inputTokens: median(
        runs
          .map((run) => usageNumber(run.usage, 'input_tokens'))
          .filter((value): value is number => value !== undefined),
      ),
      outputTokens: median(
        runs
          .map((run) => usageNumber(run.usage, 'output_tokens'))
          .filter((value): value is number => value !== undefined),
      ),
      numTurns: median(
        runs.map((run) => run.numTurns).filter((value): value is number => value !== undefined),
      ),
    },
    screens: summarize(runs.flatMap((run) => run.checks ?? [])),
  };
}

export interface ClaudeOptions {
  model?: string;
  settingSources?: string;
  agentArgs?: string[];
}

export function runClaude(
  cwd: string,
  prompt: string,
  budgetUsd: number,
  options: ClaudeOptions = {},
): EvalRun {
  const command = process.env.HAHAHAH_CLAUDE_BIN ?? 'claude';
  const args = [
    '-p',
    '--output-format',
    'json',
    '--max-budget-usd',
    budgetUsd.toFixed(2),
    '--no-session-persistence',
  ];
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.settingSources) {
    args.push('--setting-sources', options.settingSources);
  }
  if (options.agentArgs) {
    args.push(...options.agentArgs);
  }
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.ComSpec ?? 'cmd.exe',
          ['/d', '/s', '/c', [command, ...args].join(' ')],
          {
            cwd,
            input: prompt,
            encoding: 'utf8',
            timeout: 180_000,
          },
        )
      : spawnSync(command, args, {
          cwd,
          input: prompt,
          encoding: 'utf8',
          timeout: 180_000,
        });
  if (result.error) {
    return { output: '', costUsd: 0, error: result.error.message };
  }
  const stdout = (result.stdout ?? '').trim();
  if (!stdout) {
    return {
      output: '',
      costUsd: 0,
      error:
        (result.stderr ?? '').trim() || `Harness exited ${String(result.status)} with no output`,
    };
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    return {
      output: stdout,
      costUsd: 0,
      error: `Harness output was not JSON (exit ${String(result.status)})`,
    };
  }
  const output = typeof parsed.result === 'string' ? parsed.result : '';
  const costUsd = typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd : 0;
  const numTurns = typeof parsed.num_turns === 'number' ? parsed.num_turns : undefined;
  const durationMs = typeof parsed.duration_ms === 'number' ? parsed.duration_ms : undefined;
  const isError = parsed.is_error === true;
  if (!isError) {
    return { output, costUsd, usage: parsed.usage, numTurns, durationMs };
  }
  const subtype = typeof parsed.subtype === 'string' ? parsed.subtype : 'unknown subtype';
  const detail = [subtype, numTurns === undefined ? undefined : `num_turns=${numTurns}`]
    .filter(Boolean)
    .join(', ');
  return {
    output,
    costUsd,
    usage: parsed.usage,
    numTurns,
    durationMs,
    error: `${output ? `${output} — ` : ''}harness reported an error (${detail})`,
  };
}

function formatArm(arm: EvalArm): string {
  const passing = arm.runs.filter((run) => !run.error);
  if (passing.length === 0) return `ERROR: ${arm.runs[0]?.error ?? 'no runs'}`;
  const output = passing[0]!.output.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  const passCount = arm.runStatuses.filter((status) => status === 'pass').length;
  const detail = `${arm.consensus} ${passCount}/${arm.runs.length}`;
  const flagged = passing
    .flatMap((run) => run.checks ?? [])
    .filter((check) => check.status !== 'pass')
    .map((check) => `${check.name} ${check.status}`);
  const unique = [...new Set(flagged)];
  return unique.length === 0
    ? `${output} [${detail}]`
    : `${output} [${detail}: ${unique.join(', ')}]`;
}

function medianCell(arm: EvalArm): string {
  const turns = arm.median.numTurns || '?';
  return `$${arm.median.costUsd.toFixed(4)} (in ${Math.round(arm.median.inputTokens)}, out ${Math.round(arm.median.outputTokens)}, turns ${turns})`;
}

function reportMarkdown(report: EvalReport): string {
  const lines = [
    `# HAHahah eval report`,
    '',
    `- Profile: ${report.profile}`,
    `- Suite: ${report.suite}`,
    `- Model: ${report.model ?? 'harness default'}`,
    `- Generated: ${report.generated_at}`,
    `- Budget per run: $${report.budget_per_run_usd.toFixed(2)}`,
    `- Repeats per task per arm: ${report.repeats} (order alternates on every second repeat)`,
    `- Total cost reported: $${report.total_cost_usd.toFixed(4)}`,
    `- Tasks with checks: ${report.summary.tasks_with_checks}`,
    `- Baseline checks: ${report.summary.baseline.pass} pass, ${report.summary.baseline.fail} fail, ${report.summary.baseline.unknown} unknown`,
    `- Treatment checks: ${report.summary.treatment.pass} pass, ${report.summary.treatment.fail} fail, ${report.summary.treatment.unknown} unknown`,
    '',
    'Cost and token figures are medians across the repeats: this provider bills heavy-tailed spikes, so a single run is not a measurement.',
    '',
    '| Task | Baseline | Treatment | Baseline median | Treatment median |',
    '|---|---|---|---:|---:|',
    ...report.results.map(
      (result) =>
        `| ${result.task.id} | ${formatArm(result.baseline)} | ${formatArm(result.treatment)} | ${medianCell(result.baseline)} | ${medianCell(result.treatment)} |`,
    ),
    '',
    'Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.',
    'Checks are deterministic surface screens (language markers, required and forbidden patterns).',
    'A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.',
    'Consensus is pass only when every repeat passes; one failing repeat makes the task mixed or fail.',
    'No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.',
    '',
  ];
  return lines.join('\n');
}

export function runEval(options: EvalOptions): EvalReport {
  const tasks = options.tasks.slice(0, options.limit ?? options.tasks.length);
  const repeats = options.repeats ?? 1;
  const runner =
    options.runner ??
    ((cwd: string, prompt: string, budgetUsd: number) =>
      runClaude(cwd, prompt, budgetUsd, {
        model: options.model,
        settingSources: options.settingSources,
      }));
  const results: EvalResult[] = [];

  for (const task of tasks) {
    const baselineDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-baseline-'));
    const treatmentDir = mkdtempSync(join(tmpdir(), 'hahahah-eval-treatment-'));
    try {
      install({
        sourceRoot: options.sourceRoot,
        targetRoot: treatmentDir,
        profileId: options.profileId,
      });
      const baselineRuns: EvalRun[] = [];
      const treatmentRuns: EvalRun[] = [];
      for (let index = 0; index < repeats; index += 1) {
        // Alternate which arm runs first so a provider-side ordering effect cannot
        // land on the same arm in every repeat.
        const order = index % 2 === 0 ? ['baseline', 'treatment'] : ['treatment', 'baseline'];
        for (const arm of order) {
          const run = safeRun(
            runner,
            arm === 'baseline' ? baselineDir : treatmentDir,
            task.prompt,
            options.budgetUsd,
          );
          (arm === 'baseline' ? baselineRuns : treatmentRuns).push(run);
        }
      }
      results.push({
        task,
        baseline: buildArm(baselineRuns, task.checks),
        treatment: buildArm(treatmentRuns, task.checks),
      });
    } finally {
      rmSync(baselineDir, { recursive: true, force: true });
      rmSync(treatmentDir, { recursive: true, force: true });
    }
  }

  const baselineSummary = summarize(
    results.flatMap((result) => result.baseline.runs.flatMap((run) => run.checks ?? [])),
  );
  const treatmentSummary = summarize(
    results.flatMap((result) => result.treatment.runs.flatMap((run) => run.checks ?? [])),
  );
  const allRuns = results.flatMap((result) => [...result.baseline.runs, ...result.treatment.runs]);

  const report: EvalReport = {
    schema: 'hahahah.eval/v2',
    generated_at: new Date().toISOString(),
    profile: options.profileId,
    suite: options.suite ?? 'custom',
    budget_per_run_usd: options.budgetUsd,
    repeats,
    model: options.model ?? null,
    total_cost_usd: allRuns.reduce((total, run) => total + run.costUsd, 0),
    results,
    summary: {
      baseline: baselineSummary,
      treatment: treatmentSummary,
      tasks_with_checks: results.filter((result) => result.task.checks).length,
    },
  };

  const outDir = resolve(options.outDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(outDir, 'report.md'), reportMarkdown(report), 'utf8');
  return report;
}
