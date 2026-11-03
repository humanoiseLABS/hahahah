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

export interface EvalResult {
  task: EvalTask;
  baseline: EvalRun;
  treatment: EvalRun;
}

export interface EvalReport {
  schema: 'hahahah.eval/v1';
  generated_at: string;
  profile: string;
  suite: string;
  budget_per_run_usd: number;
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

function runClaude(
  cwd: string,
  prompt: string,
  budgetUsd: number,
  model?: string,
  settingSources?: string,
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
  if (model) {
    args.push('--model', model);
  }
  if (settingSources) {
    args.push('--setting-sources', settingSources);
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

function formatArm(run: EvalRun): string {
  if (run.error) return `ERROR: ${run.error}`;
  const output = run.output.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  if (!run.checks || run.checks.length === 0) return output;
  const failed = run.checks.filter((check) => check.status !== 'pass');
  if (failed.length === 0) return `${output} [checks pass]`;
  return `${output} [${failed.map((check) => `${check.name} ${check.status}: ${check.detail}`).join('; ')}]`;
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
    `- Total cost reported: $${report.total_cost_usd.toFixed(4)}`,
    `- Tasks with checks: ${report.summary.tasks_with_checks}`,
    `- Baseline checks: ${report.summary.baseline.pass} pass, ${report.summary.baseline.fail} fail, ${report.summary.baseline.unknown} unknown`,
    `- Treatment checks: ${report.summary.treatment.pass} pass, ${report.summary.treatment.fail} fail, ${report.summary.treatment.unknown} unknown`,
    '',
    '| Task | Baseline | Treatment | Baseline cost (turns) | Treatment cost (turns) |',
    '|---|---|---|---:|---:|',
    ...report.results.map(
      (result) =>
        `| ${result.task.id} | ${formatArm(result.baseline)} | ${formatArm(result.treatment)} | $${result.baseline.costUsd.toFixed(4)} (${String(result.baseline.numTurns ?? '?')}) | $${result.treatment.costUsd.toFixed(4)} (${String(result.treatment.numTurns ?? '?')}) |`,
    ),
    '',
    'Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.',
    'Checks are deterministic surface screens (language markers, required and forbidden patterns).',
    'A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.',
    'No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.',
    '',
  ];
  return lines.join('\n');
}

export function runEval(options: EvalOptions): EvalReport {
  const tasks = options.tasks.slice(0, options.limit ?? options.tasks.length);
  const runner =
    options.runner ??
    ((cwd: string, prompt: string, budgetUsd: number) =>
      runClaude(cwd, prompt, budgetUsd, options.model, options.settingSources));
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
      const baseline = safeRun(runner, baselineDir, task.prompt, options.budgetUsd);
      const treatment = safeRun(runner, treatmentDir, task.prompt, options.budgetUsd);
      for (const run of [baseline, treatment]) {
        if (!run.error && task.checks) {
          run.checks = runChecks(run.output, task.checks);
        }
      }
      results.push({ task, baseline, treatment });
    } finally {
      rmSync(baselineDir, { recursive: true, force: true });
      rmSync(treatmentDir, { recursive: true, force: true });
    }
  }

  const baselineSummary = summarize(results.flatMap((result) => result.baseline.checks ?? []));
  const treatmentSummary = summarize(results.flatMap((result) => result.treatment.checks ?? []));

  const report: EvalReport = {
    schema: 'hahahah.eval/v1',
    generated_at: new Date().toISOString(),
    profile: options.profileId,
    suite: options.suite ?? 'custom',
    budget_per_run_usd: options.budgetUsd,
    model: options.model ?? null,
    total_cost_usd: results.reduce(
      (total, result) => total + result.baseline.costUsd + result.treatment.costUsd,
      0,
    ),
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
