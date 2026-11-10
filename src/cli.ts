#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build, BuildError } from './build.ts';
import {
  checkAll,
  diagnoseFixture,
  loadFixtures,
  projectedCostUsd,
  runFixtureStudy,
  type FixtureStudyReport,
  type FixtureStudyResult,
} from './coding.ts';
import {
  loadSuite,
  runClaude,
  runEval,
  type ClaudeOptions,
  type EvalArm,
  type EvalTurnRecord,
} from './eval.ts';
import { buildCodeGraph, startLiveGraphServer } from './graph.ts';
import { doctor, install, uninstall, update, setupAgentIgnore, InstallError } from './install.ts';
import { checkRemoteUpdate, formatUpdateNotice } from './notifier.ts';
import { runOpencode } from './opencode.ts';

export type Harness = 'claude' | 'opencode';

// The harness that answers must also be the harness the treatment is installed for: opencode
// reads AGENTS.md, Claude Code reads CLAUDE.md. A mismatch would run the study against a file
// the model never sees and report the difference as a persona effect.
const HARNESS_ADAPTERS: Record<Harness, string> = {
  claude: 'claude-code',
  opencode: 'opencode',
};

function harnessOf(value: string | undefined): Harness {
  const kind = (value ?? 'claude') as Harness;
  if (!Object.keys(HARNESS_ADAPTERS).includes(kind)) {
    throw new Error(`unknown --harness ${String(value)}: use claude or opencode`);
  }
  return kind;
}

// The two harnesses report cost on different scales: Claude Code returns a per-run USD total,
// while a free-tier opencode model reports 0. The ceiling is therefore a declared budget for the
// runner, not a measured spend, and a non-zero measured cost above it is surfaced as an error.
export function runnerFor(
  harness: Harness | undefined,
  options: ClaudeOptions & { model?: string },
) {
  const kind = harnessOf(harness);
  if (kind === 'opencode') {
    return (cwd: string, prompt: string, budgetUsd: number, history?: EvalTurnRecord[]) =>
      runOpencode(cwd, prompt, budgetUsd, { model: options.model }, history);
  }
  return (cwd: string, prompt: string, budgetUsd: number, history?: EvalTurnRecord[]) =>
    runClaude(cwd, prompt, budgetUsd, options, history);
}

function availableSuites(): string[] {
  try {
    return readdirSync(join(process.cwd(), 'evals'))
      .filter((file) => file.endsWith('.yaml'))
      .map((file) => file.slice(0, -'.yaml'.length))
      .sort();
  } catch {
    return [];
  }
}

function printUsage(): void {
  console.log(`Anti-Yapping (+62 Terse & Surgical Diffs)

Usage:
  npx anti-yapping install [--target <repo>] [--adapter <name>] [--scope workspace|global] [--dry-run] [--force]
  npx anti-yapping graph [--target <repo>] [--view] [--live]
  npx anti-yapping ignore [--target <repo>] [--adapter <name>]
  npx anti-yapping update [--target <repo>] [--dry-run] [--force]
  npx anti-yapping uninstall [--target <repo>] [--dry-run] [--force]
  npx anti-yapping doctor [--target <repo>]
  npx anti-yapping measure [--profile <id>] [--adapter fake|claude-code|opencode|agents-md|antigravity]
  npx anti-yapping build [--profile <id>] [--adapter fake|claude-code|opencode|agents-md|antigravity] [--out <dir>] [--release]

Which --adapter to pass, by the agent you run (install into the project you want it active in):
  Claude Code          --adapter claude-code    writes CLAUDE.md + .claude/skills/
  opencode             --adapter opencode       writes AGENTS.md + .claude/skills/ (opencode reads that tree)
  Antigravity          --adapter antigravity    writes AGENTS.md + .agents/rules/*.md; add --scope global (defaults to ~/.gemini) for every project
  Qoder                --adapter qoder          writes AGENTS.md + .qoder/skills/; add --scope global (defaults to ~/.qoder) for every project & session
  Cursor / Codex / anything reading AGENTS.md
                       --adapter agents-md      writes AGENTS.md + .agents/skills/
Omitting --adapter installs for Claude Code. Uninstall needs only --target; the manifest remembers the rest.
`);
}

function positiveInt(value: string | undefined, flag: string, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function positiveNumber(value: string, flag: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive number`);
  }
  return parsed;
}

function printStudy(report: FixtureStudyReport): void {
  // A harness error arrives verbatim, and on Windows cmd.exe puts it over several lines.
  const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
  console.log(
    `coding study: ${report.fixtures_run} fixture(s) x ${report.repeats} repeat(s) x ${report.arms.length} arm(s) [${report.arms.join('+')}], cost $${report.total_cost_usd.toFixed(4)}`,
  );
  for (const result of report.results) {
    const state = (arm: FixtureStudyResult['baseline']) => {
      if (arm.grades.length === 0) return 'not run';
      if (arm.grades.every((grade) => grade === 'error')) {
        return `error (${oneLine(arm.runs[0]?.run.error ?? 'no runs')})`;
      }
      return `${arm.grades.join(',')} solved ${arm.solved}/${arm.runs.length}`;
    };
    console.log(
      `- ${result.fixture.id}${result.fixture.hidden ? ' (hidden)' : ''}: baseline=${state(result.baseline)}, treatment=${state(result.treatment)}`,
    );
  }
  const tallyLine = (name: 'baseline' | 'treatment') => {
    const tally = report.summary[name];
    return `grades: ${name} solved ${tally.solved} failed ${tally.failed} tampered ${tally.tampered} untouched ${tally.untouched} error ${tally.error}`;
  };
  for (const arm of report.arms) {
    console.log(tallyLine(arm));
  }
  if (report.hidden_run > 0) {
    console.log(
      `hidden holdout (${report.hidden_run} fixture(s)): baseline solved ${report.summary.holdout.baseline.solved}, treatment solved ${report.summary.holdout.treatment.solved}`,
    );
  }
  const errored = report.results
    .flatMap((result) => [...result.baseline.runs, ...result.treatment.runs])
    .some((run) => run.grade === 'error');
  if (errored) process.exitCode = 1;
}

function formatReport(result: ReturnType<typeof build>): string {
  const lines = [
    `profile: ${result.manifest.profile}`,
    `persona: ${result.manifest.persona}`,
    `adapter: ${result.manifest.adapter}`,
    `tokenizer: ${result.manifest.tokenizer}`,
    `content_hash: ${result.manifest.content_hash}`,
  ];
  for (const [name, report] of Object.entries(result.manifest.budgets)) {
    lines.push(
      `${name}: ${report.tokens}/${report.target} (${report.status}; hard cap ${report.hardCap})`,
    );
  }
  if (result.warnings.length > 0) {
    lines.push('warnings:');
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  return lines.join('\n');
}

function isMainEntry(): boolean {
  const invoked = process.argv[1];
  if (!invoked) return false;
  try {
    const metaPath = realpathSync(fileURLToPath(import.meta.url)).toLowerCase();
    const invokedPath = realpathSync(resolve(invoked)).toLowerCase();
    return metaPath === invokedPath;
  } catch {
    return fileURLToPath(import.meta.url).toLowerCase() === resolve(invoked).toLowerCase();
  }
}

const packageRoot = resolve(fileURLToPath(import.meta.url), '..', '..');

function getCliVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.1.0';
  } catch {
    return '0.1.0';
  }
}

if (isMainEntry()) {
  const version = getCliVersion();
  const updateCheck = checkRemoteUpdate(version);
  try {
    const parsed = parseArgs({
      allowPositionals: true,
      strict: true,
      options: {
        profile: { type: 'string', default: 'anti-yapping' },
        adapter: { type: 'string' },
        target: { type: 'string', default: process.cwd() },
        out: { type: 'string' },
        suite: { type: 'string', default: 'smoke' },
        task: { type: 'string', multiple: true, default: [] },
        id: { type: 'string', multiple: true, default: [] },
        limit: { type: 'string' },
        repeats: { type: 'string' },
        'budget-usd': { type: 'string', default: '0.10' },
        'max-total-usd': { type: 'string' },
        model: { type: 'string' },
        harness: { type: 'string' },
        scope: { type: 'string' },
        arm: { type: 'string' },
        'setting-sources': { type: 'string' },
        release: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        strict: { type: 'boolean', default: false },
        live: { type: 'boolean', default: false },
        view: { type: 'boolean', default: false },
        dir: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });

    const command = parsed.positionals[0];
    if (!command || parsed.values.help) {
      printUsage();
      process.exitCode = command ? 0 : 1;
    } else if (command === 'build' || command === 'measure') {
      const result = build({
        root: packageRoot,
        profileId: parsed.values.profile,
        adapterId: parsed.values.adapter ?? 'fake',
        outDir: parsed.values.out,
        release: parsed.values.release,
        write: command === 'build',
      });
      console.log(formatReport(result));
      if (command === 'build') {
        console.log(`out: ${result.outDir}`);
      }
    } else if (command === 'install') {
      const scope = (parsed.values.scope ?? 'workspace') as 'workspace' | 'global';
      const adapterId = parsed.values.adapter ?? 'claude-code';
      const hasExplicitTarget = process.argv.some(
        (arg) => arg === '--target' || arg.startsWith('--target='),
      );
      const defaultGlobalTarget =
        adapterId === 'qoder'
          ? join(homedir(), '.qoder')
          : adapterId === 'antigravity'
            ? join(homedir(), '.gemini')
            : parsed.values.target;
      const targetRoot =
        scope === 'global' && !hasExplicitTarget ? defaultGlobalTarget : parsed.values.target;
      const result = install({
        sourceRoot: packageRoot,
        targetRoot,
        profileId: parsed.values.profile,
        adapterId,
        scope,
        dryRun: parsed.values['dry-run'],
        force: parsed.values.force,
      });
      console.log(
        `${result.dryRun ? 'Dry run: would install' : 'Installed'} ${result.manifest.profile} into ${result.targetRoot} (${scope} scope)`,
      );
      console.log(
        `files: ${result.manifest.files.length} managed file(s) + ${result.manifest.block.path} block`,
      );
      for (const warning of result.warnings) {
        console.log(`warning: ${warning}`);
      }
    } else if (command === 'graph') {
      const graphResult = buildCodeGraph(parsed.values.target);
      console.log(
        `Obsidian Code Graph: mapped ${graphResult.nodesEmitted}/${graphResult.filesScanned} file(s), ${graphResult.edgesCount} edge(s)`,
      );
      console.log(`index:  ${graphResult.indexPath}`);
      console.log(`memory: ${graphResult.memoryPath}`);
      console.log(`visual: ${graphResult.htmlPath}`);
      if (parsed.values.live) {
        const live = startLiveGraphServer(parsed.values.target, 4949);
        console.log(`live:   ${live.url} (streaming real-time file & token telemetry via SSE)`);
        if (parsed.values.view) {
          if (process.platform === 'win32') {
            spawn('cmd', ['/c', 'start', '', live.url], { detached: true, stdio: 'ignore' }).unref();
          } else if (process.platform === 'darwin') {
            spawn('open', [live.url], { detached: true, stdio: 'ignore' }).unref();
          } else {
            spawn('xdg-open', [live.url], { detached: true, stdio: 'ignore' }).unref();
          }
        }
      } else if (parsed.values.view) {
        if (process.platform === 'win32') {
          spawn('cmd', ['/c', 'start', '', graphResult.htmlPath], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', [graphResult.htmlPath], { detached: true, stdio: 'ignore' }).unref();
        } else {
          spawn('xdg-open', [graphResult.htmlPath], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    } else if (command === 'ignore') {
      const adapterId = parsed.values.adapter ?? 'claude-code';
      const result = setupAgentIgnore(parsed.values.target, adapterId);
      console.log(`Input Token Saver: ${result.created ? 'Wrote' : 'Already configured'} ${result.path}`);
      console.log('Protected context from: node_modules, build artifacts, keystores, binaries & logs.');
    } else if (command === 'update') {
      const result = update({
        sourceRoot: packageRoot,
        targetRoot: parsed.values.target,
        dryRun: parsed.values['dry-run'],
        force: parsed.values.force,
      });
      console.log(
        `${result.dryRun ? 'Dry run: would update' : 'Updated'} ${result.manifest.profile} (${result.manifest.adapter}) in ${result.targetRoot}`,
      );
      console.log(
        `files: ${result.manifest.files.length} managed file(s) + ${result.manifest.block.path} block`,
      );
      for (const warning of result.warnings) {
        console.log(`warning: ${warning}`);
      }
    } else if (command === 'uninstall') {
      uninstall({
        targetRoot: parsed.values.target,
        dryRun: parsed.values['dry-run'],
        force: parsed.values.force,
      });
      console.log(
        `${parsed.values['dry-run'] ? 'Dry run: would uninstall' : 'Uninstalled'} from ${parsed.values.target}`,
      );
    } else if (command === 'doctor') {
      const report = doctor({ targetRoot: parsed.values.target });
      for (const warning of report.warnings) {
        console.log(`warning: ${warning}`);
      }
      if (!report.ok) {
        for (const error of report.errors) {
          console.error(`error: ${error}`);
        }
        process.exitCode = 1;
      } else {
        console.log(`doctor: ok (${parsed.values.target})`);
      }
    } else if (command === 'fixtures') {
      const action = parsed.positionals[1] ?? 'check';
      if (action === 'check') {
        const checks = checkAll(process.cwd(), parsed.values.dir ?? 'fixtures');
        for (const check of checks) {
          const label = check.ok ? 'ok  ' : 'FAIL';
          const holdout = check.hidden ? ' (hidden)' : '';
          console.log(`${label} ${check.id}${holdout}: ${check.detail}`);
        }
        const failed = checks.filter((check) => !check.ok);
        const hidden = checks.filter((check) => check.hidden).length;
        console.log(
          `fixtures: ${checks.length - failed.length}/${checks.length} valid, ${hidden} marked hidden holdout`,
        );
        if (failed.length > 0) {
          process.exitCode = 1;
        }
      } else if (action === 'run') {
        const all = loadFixtures(process.cwd(), parsed.values.dir ?? 'fixtures');
        let fixtures = all;
        if (parsed.values.id.length > 0) {
          const known = new Set(all.map((fixture) => fixture.id));
          const unknown = parsed.values.id.filter((id) => !known.has(id));
          if (unknown.length > 0) {
            throw new Error(`Unknown fixture id(s): ${unknown.join(', ')}`);
          }
          fixtures = all.filter((fixture) => parsed.values.id.includes(fixture.id));
        }
        const limit = parsed.values.limit
          ? positiveInt(parsed.values.limit, '--limit', fixtures.length)
          : undefined;
        const repeats = positiveInt(parsed.values.repeats, '--repeats', 1);
        const budget = positiveNumber(parsed.values['budget-usd'], '--budget-usd');
        const arm = parsed.values.arm ?? 'both';
        if (arm !== 'both' && arm !== 'baseline' && arm !== 'treatment') {
          throw new Error('--arm must be both, baseline, or treatment');
        }
        const armCount = arm === 'both' ? 2 : 1;
        const ceiling = parsed.values['max-total-usd']
          ? positiveNumber(parsed.values['max-total-usd'], '--max-total-usd')
          : 0;
        const count = limit === undefined ? fixtures.length : Math.min(limit, fixtures.length);
        const harness = harnessOf(parsed.values.harness);
        const projected = projectedCostUsd(count, repeats, budget, armCount);
        const hidden = fixtures.slice(0, count).filter((fixture) => fixture.hidden).length;
        console.log(
          `plan: running ${count} of ${fixtures.length} selected fixture(s) (${hidden} marked hidden holdout), ${repeats} repeat(s), ${armCount} arm(s) [${arm}], $${budget.toFixed(2)} per run, harness ${harness}`,
        );
        console.log(
          `projected cost of the caps: $${projected.toFixed(2)} — not a ceiling: the harness checks its budget between turns, so a capped run overshoots (measured 1.17x and 1.46x of --budget-usd on 2026-11-04)`,
        );
        if (!parsed.values.live) {
          console.log(
            'dry run: no model was called and nothing was spent. Add --live with --max-total-usd to run it.',
          );
        } else {
          if (ceiling === 0) {
            throw new Error(
              `--live needs --max-total-usd: this campaign projects $${projected.toFixed(2)}, state the approved ceiling`,
            );
          }
          if (projected > ceiling) {
            throw new Error(
              `projected $${projected.toFixed(2)} exceeds the approved ceiling of $${ceiling.toFixed(2)}: lower --limit, --repeats, or --budget-usd`,
            );
          }
          if (armCount === 1) {
            console.log(
              'single arm: this run cannot compare baseline against treatment, it only answers "did the harness behave"',
            );
          }
          const report = runFixtureStudy({
            sourceRoot: process.cwd(),
            profileId: parsed.values.profile,
            fixtures,
            limit,
            repeats,
            budgetUsd: budget,
            arm,
            model: parsed.values.model,
            settingSources: parsed.values['setting-sources'],
            adapterId: HARNESS_ADAPTERS[harness],
            runner: (cwd, prompt, runBudget) =>
              harness === 'opencode'
                ? runOpencode(cwd, prompt, runBudget, { model: parsed.values.model })
                : runClaude(cwd, prompt, runBudget, {
                    model: parsed.values.model,
                    settingSources: parsed.values['setting-sources'],
                    // Edits are the one thing the agent must be able to do; shell and network
                    // stay denied, so the grade comes from the tests this tool runs afterwards.
                    agentArgs: ['--permission-mode', 'acceptEdits', '--permission-prompts', 'none'],
                  }),
            outDir: parsed.values.out ?? join(process.cwd(), '.hahahah', 'coding'),
          });
          printStudy(report);
        }
      } else if (action === 'diagnose') {
        const ids = parsed.values.id;
        if (ids.length !== 1) {
          throw new Error('fixtures diagnose needs exactly one --id <fixture>');
        }
        // A diagnostic is one arm by definition: omitting --arm means treatment, while an
        // explicit `both` is still refused rather than silently halving the cost.
        const arm = parsed.values.arm ?? 'treatment';
        if (arm !== 'baseline' && arm !== 'treatment') {
          throw new Error('--arm must be baseline or treatment for a single-arm diagnostic');
        }
        const fixture = loadFixtures(process.cwd(), parsed.values.dir ?? 'fixtures').find(
          (candidate) => candidate.id === ids[0],
        );
        if (!fixture) {
          throw new Error(`Unknown fixture id(s): ${ids[0]}`);
        }
        const budget = positiveNumber(parsed.values['budget-usd'], '--budget-usd');
        const projected = projectedCostUsd(1, 1, budget, 1);
        const ceiling = parsed.values['max-total-usd']
          ? positiveNumber(parsed.values['max-total-usd'], '--max-total-usd')
          : 0;
        console.log(
          `diagnostic: ${fixture.id}, one arm [${arm}], $${budget.toFixed(2)} per run, projected $${projected.toFixed(2)} (caps are soft, see docs/phase-3-live-suite-results.md)`,
        );
        if (!parsed.values.live) {
          console.log('dry run: no model was called. Add --live with --max-total-usd to run it.');
        } else {
          if (ceiling === 0) {
            throw new Error(
              `--live needs --max-total-usd: this diagnostic projects $${projected.toFixed(2)}`,
            );
          }
          if (projected > ceiling) {
            throw new Error(
              `projected $${projected.toFixed(2)} exceeds the approved ceiling of $${ceiling.toFixed(2)}`,
            );
          }
          const result = diagnoseFixture({
            sourceRoot: process.cwd(),
            profileId: parsed.values.profile,
            fixture,
            arm,
            budgetUsd: budget,
            model: parsed.values.model,
            settingSources: parsed.values['setting-sources'],
            outDir: parsed.values.out ?? join(process.cwd(), '.hahahah', 'diagnostic'),
          });
          const { summary, graded } = result;
          const tools = Object.entries(summary.tools)
            .map(([name, count]) => `${name} x${count}`)
            .join(', ');
          console.log(
            `stream: subtype=${summary.subtype ?? '?'} turns=${summary.numTurns ?? '?'} cost=$${(summary.totalCostUsd ?? 0).toFixed(4)} events=${summary.lines}`,
          );
          console.log(`tools attempted: ${tools || 'none'}`);
          for (const denial of summary.denials) {
            console.log(`DENIED: ${denial}`);
          }
          for (const error of summary.toolErrors) {
            console.log(`tool error: ${error}`);
          }
          console.log(
            `workspace: changed=[${graded.changedFiles.join(', ')}] new=[${graded.otherNewFiles.join(', ')}] missing=[${graded.missingFiles.join(', ')}]`,
          );
          console.log(`grade=${graded.grade} tests pass=${graded.pass} fail=${graded.fail}`);
          console.log(`raw stream kept: ${result.rawPath}`);
          console.log(`workspace kept for inspection: ${result.workspace} (delete when done)`);
          if (graded.run.error) {
            process.exitCode = 1;
          }
        }
      } else {
        printUsage();
        process.exitCode = 1;
      }
    } else if (command === 'eval') {
      const suite = loadSuite(process.cwd(), parsed.values.suite);
      const limit = parsed.values.limit ? Number.parseInt(parsed.values.limit, 10) : undefined;
      const repeats = parsed.values.repeats ? Number.parseInt(parsed.values.repeats, 10) : 1;
      const budget = Number.parseFloat(parsed.values['budget-usd']);
      if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
        throw new Error('--limit must be a positive integer');
      }
      if (!Number.isInteger(repeats) || repeats < 1) {
        throw new Error('--repeats must be a positive integer');
      }
      if (!Number.isFinite(budget) || budget <= 0) {
        throw new Error('--budget-usd must be a positive number');
      }
      let tasks = suite.tasks;
      if (parsed.values.task.length > 0) {
        const known = new Set(suite.tasks.map((task) => task.id));
        const unknown = parsed.values.task.filter((id) => !known.has(id));
        if (unknown.length > 0) {
          throw new Error(`Unknown task id(s): ${unknown.join(', ')} in suite ${suite.suite}`);
        }
        tasks = suite.tasks.filter((task) => parsed.values.task.includes(task.id));
      }
      const harness = harnessOf(parsed.values.harness);
      const report = runEval({
        sourceRoot: process.cwd(),
        profileId: parsed.values.profile,
        tasks,
        suite: suite.suite,
        limit,
        repeats,
        budgetUsd: budget,
        model: parsed.values.model,
        settingSources: parsed.values['setting-sources'],
        adapterId: HARNESS_ADAPTERS[harness],
        harness,
        runner: runnerFor(harness, {
          model: parsed.values.model,
          settingSources: parsed.values['setting-sources'],
        }),
        // The runner is injected here so the harness can be chosen, which would otherwise disable
        // the auto-probe. A real campaign always talks to a real gateway, so it must always probe.
        probe: true,
        outDir: parsed.values.out ?? join(process.cwd(), '.hahahah', 'eval'),
      });
      const runs = report.results.reduce(
        (total, result) => total + result.baseline.runs.length + result.treatment.runs.length,
        0,
      );
      console.log(
        `eval: ${report.results.length} task(s) x ${report.repeats} repeat(s) = ${runs} runs, cost $${report.total_cost_usd.toFixed(4)}`,
      );
      if (report.aborted) {
        const cause =
          report.aborted.kind === 'quota'
            ? 'the provider refused further requests'
            : 'consecutive runs were answered with nothing at all - the harness or route is not answering';
        console.log(
          `ABORTED after ${report.aborted.afterRuns} run(s): ${cause} (${report.aborted.reason.slice(0, 120)}). Not measured: ${report.aborted.remainingTasks.join(', ') || `${report.aborted.partialTask} (partial)`}. Nothing further was spent.`,
        );
      }
      for (const result of report.results) {
        const state = (arm: EvalArm) => {
          if (arm.consensus === 'error') return `ERROR: ${arm.runs[0]?.error ?? 'no runs'}`;
          const passed = arm.runStatuses.filter((status) => status === 'pass').length;
          const findings = [...new Set(arm.screens.findings)];
          const detail = findings.length > 0 ? ` (${findings.join('; ')})` : '';
          return `${arm.consensus} ${passed}/${arm.runs.length} med $${arm.median.costUsd.toFixed(4)}${detail}`;
        };
        console.log(
          `- ${result.task.id}: baseline=${state(result.baseline)}, treatment=${state(result.treatment)}`,
        );
      }
      const { baseline, treatment } = report.summary;
      if (report.summary.tasks_with_checks > 0) {
        console.log(
          `screens: baseline ${baseline.pass} pass / ${baseline.fail} fail / ${baseline.unknown} unknown; treatment ${treatment.pass} pass / ${treatment.fail} fail / ${treatment.unknown} unknown`,
        );
      }
      const failedRun = report.results
        .flatMap((result) => [...result.baseline.runs, ...result.treatment.runs])
        .find((run) => run.error);
      if (failedRun) {
        process.exitCode = 1;
      } else if (parsed.values.strict && treatment.fail > 0) {
        console.error(`strict: ${treatment.fail} treatment screen(s) failed across repeats`);
        process.exitCode = 1;
      }
    } else {
      printUsage();
      process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof BuildError || error instanceof InstallError) {
      console.error(`Command failed: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    try {
      const latest = await updateCheck;
      if (latest) {
        console.error(formatUpdateNotice(version, latest));
      }
    } catch {
      // ignore
    }
  }
}
