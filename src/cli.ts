import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { build, BuildError } from './build.ts';
import { loadSuite, runEval, type EvalArm } from './eval.ts';
import { doctor, install, uninstall, InstallError } from './install.ts';

function printUsage(): void {
  console.log(`HAHahah Phase 3

Usage:
  node src/cli.ts build --profile <id> [--adapter fake|claude-code] [--out <dir>] [--release]
  node src/cli.ts measure --profile <id> [--adapter fake|claude-code]
  node src/cli.ts install --profile <id> [--target <repo>] [--dry-run] [--force]
  node src/cli.ts uninstall [--target <repo>] [--dry-run] [--force]
  node src/cli.ts doctor [--target <repo>]
  node src/cli.ts eval --profile <id> [--suite smoke] [--task <id>]... [--limit <n>] [--repeats <n>] [--budget-usd <n>] [--model <name>] [--setting-sources <sources>] [--out <dir>] [--strict]

Eval checks are deterministic surface screens, not semantic judges. --strict exits non-zero when a treatment check fails.
`);
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

try {
  const parsed = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      profile: { type: 'string', default: 'rusuh-id' },
      adapter: { type: 'string', default: 'fake' },
      target: { type: 'string', default: process.cwd() },
      out: { type: 'string' },
      suite: { type: 'string', default: 'smoke' },
      task: { type: 'string', multiple: true, default: [] },
      limit: { type: 'string' },
      repeats: { type: 'string' },
      'budget-usd': { type: 'string', default: '0.10' },
      model: { type: 'string' },
      'setting-sources': { type: 'string' },
      release: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      strict: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const command = parsed.positionals[0];
  if (!command || parsed.values.help) {
    printUsage();
    process.exitCode = command ? 0 : 1;
  } else if (command === 'build' || command === 'measure') {
    const result = build({
      root: process.cwd(),
      profileId: parsed.values.profile,
      adapterId: parsed.values.adapter,
      outDir: parsed.values.out,
      release: parsed.values.release,
      write: command === 'build',
    });
    console.log(formatReport(result));
    if (command === 'build') {
      console.log(`out: ${result.outDir}`);
    }
  } else if (command === 'install') {
    const result = install({
      sourceRoot: process.cwd(),
      targetRoot: parsed.values.target,
      profileId: parsed.values.profile,
      dryRun: parsed.values['dry-run'],
      force: parsed.values.force,
    });
    console.log(
      `${result.dryRun ? 'Dry run: would install' : 'Installed'} ${result.manifest.profile} into ${result.targetRoot}`,
    );
    console.log(`files: ${result.manifest.files.length} managed file(s) + CLAUDE.md block`);
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
      outDir: parsed.values.out ?? join(process.cwd(), '.hahahah', 'eval'),
    });
    const runs = report.results.reduce(
      (total, result) => total + result.baseline.runs.length + result.treatment.runs.length,
      0,
    );
    console.log(
      `eval: ${report.results.length} task(s) x ${report.repeats} repeat(s) = ${runs} runs, cost $${report.total_cost_usd.toFixed(4)}`,
    );
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
}
