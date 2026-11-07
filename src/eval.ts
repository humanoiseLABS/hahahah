import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { install } from './install.ts';
import { removeWorkspace, scratchRoot } from './workspace.ts';
import { validate } from './schema.ts';
import {
  checkSuiteErrors,
  detectInjectedStyleLayers,
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
  /** Style layers the provider leaked into its own text; see detectInjectedStyleLayers. */
  injectedLayers?: string[];
}

export interface ContaminationArm {
  runs: number;
  affected: number;
  phrases: string[];
}

/**
 * What the numbers were produced against. `baseUrlHost` is host and port only, never a credential
 * or path, because this object is committed as evidence.
 */
export interface EvalEnvironment {
  harness: string;
  harnessVersion: string | null;
  baseUrlHost: string | null;
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
  /** Runs that never answered. Excluded from every median and screen, but counted here. */
  errored: number;
  median: ArmMedians;
  screens: CheckSummary;
}

/**
 * Prompt-size spread across a campaign. A gateway that picks an upstream per request changes the
 * model underneath an A/B, and the harness reports no model name per run, so prompt size is the
 * only observable signal: an off-route run here measured 63,578 input tokens against a 19,150
 * median. Counts runs, not proof of a model swap.
 */
export interface RouteSplit {
  runs: number;
  deviating: number;
  byArm: { baseline: number; treatment: number };
  medianInputTokens: number;
  extremeInputTokens: number;
}

export interface EvalResult {
  task: EvalTask;
  baseline: EvalArm;
  treatment: EvalArm;
}

export interface EvalReport {
  // v3 added `environment` and `contamination`. Every number in a v2 report was read against a
  // baseline assumed to be neutral, and that assumption is now known to be wrong on some providers.
  // v4 adds `routing` and per-arm `errored`: the k=3 preservation run turned out to be served by
  // four different upstream models, and a dead route had previously looked like a slow campaign.
  // v5 adds `tasksSha256`, because the clean re-run also changed what the screens measure - answers
  // are graded without the reasoning blocks some gateways return inline - and a pass rate computed
  // by a different ruler must not be quoted against this one.
  // v6 adds `aborted`: a gateway that refuses on quota answers every remaining call with the same
  // error, so a campaign that continues is not measuring, and the report has to say what is missing.
  // v7 splits `aborted.kind`: a hung harness that dies at the spawn timeout is a different failure
  // from a refusal, needs a streak to prove it, and cost 33 minutes of nothing before it was named.
  schema: 'hahahah.eval/v7';
  generated_at: string;
  profile: string;
  suite: string;
  tasksSha256: string;
  aborted: EvalAbort | null;
  budget_per_run_usd: number;
  repeats: number;
  model: string | null;
  total_cost_usd: number;
  environment: EvalEnvironment;
  routing: RouteSplit;
  contamination: { baseline: ContaminationArm; treatment: ContaminationArm };
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
  // Which harness will answer decides which file tree the treatment carries: an opencode run
  // reads AGENTS.md, a Claude run reads CLAUDE.md. Installing the wrong one measures nothing.
  adapterId?: string;
  /** Recorded in the report so the numbers carry the stack they came from. */
  harness?: string;
  // Ask the route one cheap question before spending 72 paid ones on it. Auto: only when the real
  // harness is the runner, because an injected runner is in-process and cannot be unreachable.
  probe?: boolean;
}

// Two campaigns are only comparable if the ruler was the same. A screen edit silently changes every
// pass rate in the suite, so the task definitions are fingerprinted and carried in the report; tags
// and other presentation fields are excluded because they decide nothing about a grade.
export function tasksFingerprint(tasks: EvalTask[]): string {
  const canonical = tasks.map((task) => ({
    id: task.id,
    prompt: task.prompt,
    checks: task.checks ?? null,
  }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16);
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

// A warm provider cache reports only the uncached remainder in `input_tokens`; the rest of the
// prompt arrives as a cache read. Measured on opencode/beam-free 2026-11-07: one 6308-token prompt
// reported input 4453 + read 1856 cold and input 36 + read 6272 warm, so reading `input_tokens`
// alone makes the same prompt look 175x smaller and a cache hit looks like a different route.
export function promptTokens(usage: unknown): number | undefined {
  const input = usageNumber(usage, 'input_tokens');
  if (input === undefined) return undefined;
  return (
    input +
    (usageNumber(usage, 'cache_read_input_tokens') ?? 0) +
    (usageNumber(usage, 'cache_creation_input_tokens') ?? 0)
  );
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
    // Recorded even when the task has no screens: contamination is about the reference arm, not
    // about whether this particular answer passed.
    run.injectedLayers = detectInjectedStyleLayers(run.output);
  }
  const statuses = runs.map(statusOf);
  // A run that never answered has zero cost and zero tokens, and a median over those reads as
  // "the arm was cheaper", so failures are counted separately and kept out of every median.
  const answered = runs.filter((run) => !run.error);
  return {
    runs,
    consensus: consensusOf(statuses),
    runStatuses: statuses,
    errored: runs.length - answered.length,
    median: {
      costUsd: median(answered.map((run) => run.costUsd)),
      inputTokens: median(
        answered
          .map((run) => promptTokens(run.usage))
          .filter((value): value is number => value !== undefined),
      ),
      outputTokens: median(
        answered
          .map((run) => usageNumber(run.usage, 'output_tokens'))
          .filter((value): value is number => value !== undefined),
      ),
      numTurns: median(
        answered.map((run) => run.numTurns).filter((value): value is number => value !== undefined),
      ),
    },
    screens: summarize(runs.flatMap((run) => run.checks ?? [])),
  };
}

/** Input-token ratios this far from the campaign median are called a different route. */
const ROUTE_RATIO_LO = 0.6;
const ROUTE_RATIO_HI = 1.6;

export function routeSplitOf(baseline: EvalRun[], treatment: EvalRun[]): RouteSplit {
  const answered = (runs: EvalRun[]) =>
    runs.filter((run) => !run.error && promptTokens(run.usage) !== undefined);
  const both = [...answered(baseline), ...answered(treatment)];
  const sizes = both.map((run) => promptTokens(run.usage) ?? 0);
  const center = median(sizes);
  const deviating = (runs: EvalRun[]) =>
    answered(runs).filter((run) => {
      const size = promptTokens(run.usage) ?? 0;
      return center > 0 && (size / center < ROUTE_RATIO_LO || size / center > ROUTE_RATIO_HI);
    }).length;
  return {
    runs: both.length,
    deviating: deviating(baseline) + deviating(treatment),
    byArm: { baseline: deviating(baseline), treatment: deviating(treatment) },
    medianInputTokens: center,
    extremeInputTokens: sizes.length > 0 ? Math.max(...sizes) : 0,
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

function contaminationLines(report: EvalReport): string[] {
  const lines: string[] = [];
  for (const arm of ['baseline', 'treatment'] as const) {
    const armData = report.contamination[arm];
    if (armData.affected === 0) continue;
    lines.push(
      `**${arm} is not a neutral reference**: ${armData.affected} of ${armData.runs} ${arm} run(s) name style layers the provider injected itself (${armData.phrases.join(', ')}).`,
    );
  }
  if (lines.length === 0) {
    lines.push('No provider-injected style layers were detected in either arm.');
  }
  return lines;
}

function routingLine(report: EvalReport): string[] {
  const { routing } = report;
  if (routing.deviating === 0 || routing.runs === 0) return [];
  return [
    `**these runs were not all served by one route**: ${routing.deviating} of ${routing.runs} answered runs (${routing.byArm.baseline} baseline, ${routing.byArm.treatment} treatment) sit more than ${ROUTE_RATIO_HI}x or under ${ROUTE_RATIO_LO}x away from the campaign's median prompt size (median ${Math.round(routing.medianInputTokens)} input tokens, largest ${Math.round(routing.extremeInputTokens)}). The harness reports no model per run, so this is a size signal, not a model name: a gateway that picks an upstream per request changes the model underneath an A/B, and these arm medians mix upstreams.`,
  ];
}

function erroredLine(report: EvalReport): string[] {
  const baseline = report.results.reduce((total, result) => total + result.baseline.errored, 0);
  const treatment = report.results.reduce((total, result) => total + result.treatment.errored, 0);
  if (baseline + treatment === 0) return [];
  return [
    `${baseline} baseline and ${treatment} treatment run(s) never answered and are excluded from every median and screen; those cells describe fewer than ${report.repeats} repeats per task.`,
  ];
}

function abortedLine(report: EvalReport): string[] {
  const abort = report.aborted;
  if (!abort) return [];
  const missing =
    abort.remainingTasks.length > 0
      ? `Not measured at all: ${abort.remainingTasks.join(', ')}.`
      : 'Every task was started, but the last one is incomplete.';
  const cause =
    abort.kind === 'quota'
      ? `the provider refused further requests (${abort.reason})`
      : `${UNANSWERED_STREAK} consecutive run(s) were answered with nothing at all (${abort.reason}) - the harness or the route behind it is not answering`;
  return [
    `**the campaign was aborted after ${abort.afterRuns} run(s)** by ${cause}. ${missing} ${abort.partialTask} is reported with only the repeats it actually got, so these numbers cover fewer tasks than the suite defines.`,
  ];
}

function reportMarkdown(report: EvalReport): string {
  const lines = [
    `# HAHahah eval report`,
    '',
    `- Profile: ${report.profile}`,
    `- Suite: ${report.suite}`,
    `- Suite fingerprint: ${report.tasksSha256} (prompts and screens; a different value means two reports are not comparable)`,
    `- Model: ${report.model ?? 'harness default'}`,
    `- Generated: ${report.generated_at}`,
    `- Budget per run: $${report.budget_per_run_usd.toFixed(2)}`,
    `- Repeats per task per arm: ${report.repeats} (order alternates on every second repeat)`,
    `- Total cost reported: $${report.total_cost_usd.toFixed(4)}`,
    `- Tasks with checks: ${report.summary.tasks_with_checks}`,
    `- Baseline checks: ${report.summary.baseline.pass} pass, ${report.summary.baseline.fail} fail, ${report.summary.baseline.unknown} unknown`,
    `- Treatment checks: ${report.summary.treatment.pass} pass, ${report.summary.treatment.fail} fail, ${report.summary.treatment.unknown} unknown`,
    `- Harness: ${report.environment.harness} ${report.environment.harnessVersion ?? '(version not readable)'}`,
    `- Provider base URL host: ${report.environment.baseUrlHost ?? '(not set)'}`,
    '',
    ...contaminationLines(report),
    ...routingLine(report),
    ...erroredLine(report),
    ...abortedLine(report),
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

function contaminationOf(runs: EvalRun[]): ContaminationArm {
  const phrases = new Set<string>();
  let affected = 0;
  for (const run of runs) {
    const found = run.injectedLayers ?? [];
    if (found.length > 0) affected += 1;
    for (const phrase of found) phrases.add(phrase);
  }
  return { runs: runs.length, affected, phrases: [...phrases].sort() };
}

// Provenance is best-effort: a version probe that fails must never take the paid report with it.
function probeHarnessVersion(harness: string): string | null {
  const command =
    harness === 'opencode'
      ? (process.env.HAHAHAH_OPENCODE_BIN ?? 'opencode')
      : (process.env.HAHAHAH_CLAUDE_BIN ?? 'claude');
  const args = harness === 'opencode' ? ['-v'] : ['--version'];
  const spawn = (file: string, argv: string[]) =>
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', [file, ...argv].join(' ')], {
          encoding: 'utf8',
          timeout: 20_000,
        })
      : spawnSync(file, argv, { encoding: 'utf8', timeout: 20_000 });
  try {
    const result = spawn(command, args);
    const text = `${result.stdout ?? ''}`.trim() || `${result.stderr ?? ''}`.trim();
    return text ? text.split('\n')[0]!.slice(0, 120) : null;
  } catch {
    return null;
  }
}

// Only host and port. The base URL of a self-hosted gateway can carry credentials in its userinfo
// or path, and this object is committed as evidence.
export function hostOfBaseUrl(raw: string): string | null {
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

// One key out of one file. The same settings file holds the provider's plaintext apiKey, so this
// returns the URL or nothing, and never the object it came from.
export function baseUrlFromSettings(text: string): string | null {
  try {
    const env = (JSON.parse(text) as { env?: Record<string, unknown> }).env;
    const value = env?.ANTHROPIC_BASE_URL;
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

// The shell usually does not carry ANTHROPIC_BASE_URL: the harness reads it from its own settings
// file, which is why a v3 report logged "(not set)" for a campaign that was entirely proxied.
function settingsBaseUrl(): string | null {
  try {
    return baseUrlFromSettings(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8'));
  } catch {
    return null;
  }
}

function baseUrlHost(harness: string): string | null {
  if (harness === 'opencode') return null;
  const raw = process.env.ANTHROPIC_BASE_URL ?? settingsBaseUrl();
  return raw ? hostOfBaseUrl(raw) : null;
}

// One cheap question before 72 paid ones. A stopped gateway makes every run time out at the harness
// limit and the campaign only looks slow: 13 such runs were spent this way before the route was
// checked. The probe's own cost is not folded into the report it is protecting.
export function probeRoute(runner: EvalRunner, budgetUsd: number): void {
  const dir = mkdtempSync(join(scratchRoot(), 'hahahah-eval-probe-'));
  try {
    const run = safeRun(runner, dir, 'Reply with exactly the word OK and nothing else.', budgetUsd);
    if (run.error) {
      throw new Error(
        `Route probe failed before the campaign: ${run.error}\nNothing was measured: check the harness and the provider route, then re-run.`,
      );
    }
  } finally {
    removeWorkspace(dir);
  }
}

// A gateway that has run out of request allowance answers every remaining call with the same
// refusal, at zero cost and zero information. Continuing is not persistence, it is burning the rest
// of the campaign for nothing - this is how 12 runs were lost without any of them being measured.
const EXHAUSTION_PATTERNS = [
  /\[402\]|status 402|error code 402/i,
  /\b429\b|too many requests|rate[ -]limit/i,
  /MONTHLY_REQUEST_COUNT|insufficient_quota|exceeded your current quota|reached the limit|quota[ -]?exhausted/i,
];

export function providerExhausted(error: string): boolean {
  return EXHAUSTION_PATTERNS.some((pattern) => pattern.test(error));
}

export interface EvalAbort {
  // `quota` is a refusal that predicts every later answer, so one occurrence stops the campaign.
  // `unresponsive` needs a streak: a single harness failure can be a bad task, three in a row means
  // there is nothing on the other end - the opencode route once hung for 180 s per run across 11.
  kind: 'quota' | 'unresponsive';
  reason: string;
  afterRuns: number;
  partialTask: string;
  remainingTasks: string[];
}

/** How many unanswered runs in a row count as a dead route rather than a bad task. */
const UNANSWERED_STREAK = 3;

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
  if (options.probe ?? options.runner === undefined) probeRoute(runner, options.budgetUsd);
  const results: EvalResult[] = [];
  let stopReason: string | null = null;
  let stopKind: 'quota' | 'unresponsive' | null = null;
  let unansweredStreak = 0;
  let stoppedAt = -1;
  let runCount = 0;

  for (const [taskIndex, task] of tasks.entries()) {
    if (stopReason) break;
    const baselineDir = mkdtempSync(join(scratchRoot(), 'hahahah-eval-baseline-'));
    const treatmentDir = mkdtempSync(join(scratchRoot(), 'hahahah-eval-treatment-'));
    try {
      install({
        sourceRoot: options.sourceRoot,
        targetRoot: treatmentDir,
        profileId: options.profileId,
        adapterId: options.adapterId,
      });
      const baselineRuns: EvalRun[] = [];
      const treatmentRuns: EvalRun[] = [];
      for (let index = 0; index < repeats && !stopReason; index += 1) {
        // Alternate which arm runs first so a provider-side ordering effect cannot
        // land on the same arm in every repeat.
        const order = index % 2 === 0 ? ['baseline', 'treatment'] : ['treatment', 'baseline'];
        for (const arm of order) {
          if (stopReason) break;
          const run = safeRun(
            runner,
            arm === 'baseline' ? baselineDir : treatmentDir,
            task.prompt,
            options.budgetUsd,
          );
          runCount += 1;
          if (run.error) {
            unansweredStreak += 1;
            if (providerExhausted(run.error)) {
              stopKind = 'quota';
            } else if (unansweredStreak >= UNANSWERED_STREAK) {
              stopKind = 'unresponsive';
            }
            if (stopKind) {
              stopReason = run.error;
              stoppedAt = taskIndex;
            }
          } else {
            unansweredStreak = 0;
          }
          (arm === 'baseline' ? baselineRuns : treatmentRuns).push(run);
        }
      }
      results.push({
        task,
        baseline: buildArm(baselineRuns, task.checks),
        treatment: buildArm(treatmentRuns, task.checks),
      });
    } finally {
      // Same root cause as the coding study: a locked workspace must never throw out of the
      // finally block and take the paid report with it.
      removeWorkspace(baselineDir);
      removeWorkspace(treatmentDir);
    }
  }

  const baselineSummary = summarize(
    results.flatMap((result) => result.baseline.runs.flatMap((run) => run.checks ?? [])),
  );
  const treatmentSummary = summarize(
    results.flatMap((result) => result.treatment.runs.flatMap((run) => run.checks ?? [])),
  );
  const allRuns = results.flatMap((result) => [...result.baseline.runs, ...result.treatment.runs]);
  const routing = routeSplitOf(
    results.flatMap((result) => result.baseline.runs),
    results.flatMap((result) => result.treatment.runs),
  );

  const harness = options.harness ?? 'claude';
  const report: EvalReport = {
    schema: 'hahahah.eval/v7',
    generated_at: new Date().toISOString(),
    profile: options.profileId,
    suite: options.suite ?? 'custom',
    tasksSha256: tasksFingerprint(options.tasks),
    aborted: stopReason
      ? {
          kind: stopKind ?? 'unresponsive',
          reason: stopReason.replace(/\s+/g, ' ').slice(0, 300),
          afterRuns: runCount,
          partialTask: tasks[stoppedAt]?.id ?? '',
          remainingTasks: tasks.slice(stoppedAt + 1).map((task) => task.id),
        }
      : null,
    budget_per_run_usd: options.budgetUsd,
    repeats,
    model: options.model ?? null,
    total_cost_usd: allRuns.reduce((total, run) => total + run.costUsd, 0),
    environment: {
      harness,
      harnessVersion: probeHarnessVersion(harness),
      baseUrlHost: baseUrlHost(harness),
    },
    routing,
    contamination: {
      baseline: contaminationOf(results.flatMap((result) => result.baseline.runs)),
      treatment: contaminationOf(results.flatMap((result) => result.treatment.runs)),
    },
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
