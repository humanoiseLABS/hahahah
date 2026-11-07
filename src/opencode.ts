import { spawnSync } from 'node:child_process';
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { EvalRun, EvalTurnRecord } from './eval.ts';
import { withTranscript } from './eval.ts';
import { scratchRoot } from './workspace.ts';

// Evidence for this surface, taken on opencode 1.18.31 on this machine:
// - `opencode run --format json` emits NDJSON events, not one JSON object: text arrives as
//   `type:"text"` parts, cost and tokens on the last `type:"step_finish"`, failures as
//   `type:"error"`. A single `JSON.parse` of the whole stdout therefore always fails.
// - `permission.bash:"deny"` is enforced: a model asked to run `echo` came back with
//   "tool bash tidak tersedia" and an `invalid` tool call, while `edit`/`write` stayed available.
// - the default `build` agent resolves to `"*": allow`, which is looser than the study posture,
//   so the runner writes its own config and points OPENCODE_CONFIG at it instead of trusting
//   whatever the target repo declares.
// - free-tier models report `cost: 0`, so --budget-usd is a declared ceiling, not a measured one.

export interface OpencodeOptions {
  model?: string;
  agentArgs?: string[];
  timeoutMs?: number;
}

// `--dir` is not decoration. Measured 2026-11-04: asked to create a file with only the spawn
// `cwd` set, opencode answered "PROBE.txt dibuat" and left the graded workspace empty; the same
// request with `--dir <workspace>` put the file there. A study that graded the first run would
// have scored a wrong premise as an untouched workspace, so the flag is pinned here rather than
// left to the caller.
export function opencodeArgs(cwd: string, options: OpencodeOptions = {}): string[] {
  const args = ['run', '--format', 'json', '--dir', cwd];
  if (options.model) args.push('--model', options.model);
  if (options.agentArgs) args.push(...options.agentArgs);
  return args;
}

export function opencodeStudyConfig(): string {
  return JSON.stringify(
    {
      permission: {
        edit: 'allow',
        bash: 'deny',
        webfetch: 'deny',
        external_directory: 'deny',
        doom_loop: 'deny',
      },
    },
    null,
    2,
  );
}

// The cache fields are kept under the names Claude Code uses so one prompt-size measure works for
// both harnesses. Dropping them lost the cached prefix: a warm repeat reported 36 input tokens for
// the same 6308-token prompt a cold repeat reported as 4453 + 1856.
function tokensOf(part: Record<string, unknown>): Record<string, number> | null {
  const tokens = part.tokens;
  if (typeof tokens !== 'object' || tokens === null) return null;
  const record = tokens as Record<string, unknown>;
  if (typeof record.input !== 'number' || typeof record.output !== 'number') return null;
  const cache = (
    typeof record.cache === 'object' && record.cache !== null ? record.cache : {}
  ) as Record<string, unknown>;
  return {
    input_tokens: record.input,
    output_tokens: record.output,
    cache_read_input_tokens: typeof cache.read === 'number' ? cache.read : 0,
    cache_creation_input_tokens: typeof cache.write === 'number' ? cache.write : 0,
  };
}

interface StreamScan {
  texts: string[];
  costUsd: number;
  usage?: Record<string, number>;
  turns: number;
  error?: string;
}

function scanStream(stdout: string): StreamScan {
  const scan: StreamScan = { texts: [], costUsd: 0, turns: 0 };
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const part = (event.part ?? {}) as Record<string, unknown>;
    if (event.type === 'text' && typeof part.text === 'string') {
      scan.texts.push(part.text);
    } else if (event.type === 'step_finish') {
      scan.turns += 1;
      if (typeof part.cost === 'number') scan.costUsd = part.cost;
      const tokens = tokensOf(part);
      if (tokens) scan.usage = tokens;
    } else if (event.type === 'error') {
      const detail = event.error as Record<string, unknown> | undefined;
      const data = detail?.data as Record<string, unknown> | undefined;
      const name = typeof detail?.name === 'string' ? detail.name : 'opencode error';
      const message = typeof data?.message === 'string' ? data.message : JSON.stringify(detail);
      scan.error = `${name}: ${message}`;
    }
  }
  return scan;
}

export function parseOpencodeStream(stdout: string): EvalRun {
  const scan = scanStream(stdout);
  const output = scan.texts.join('');
  if (scan.error) return { output: '', costUsd: scan.costUsd, error: scan.error };
  if (!output) return { output: '', costUsd: scan.costUsd, error: 'opencode returned no text' };
  return { output, costUsd: scan.costUsd, usage: scan.usage, numTurns: scan.turns };
}

/** The log tail is read on failure only, so the cap is about bounding a bad read, not a hot path. */
const LOG_TAIL_BYTES = 512 * 1024;

export function opencodeLogPath(): string {
  return join(homedir(), '.local', 'share', 'opencode', 'log', 'opencode.log');
}

/** What opencode logged for the run started in `directory` - the only place a refusal reaches us. */
export function loggedErrorForRun(logText: string, directory: string): string | null {
  const quotedDirectory = `directory="${directory.replace(/\\/g, '\\\\')}"`;
  const lines = logText.split('\n');
  const created = lines.find(
    (line) => line.includes('message=created') && line.includes(quotedDirectory),
  );
  const runId = created === undefined ? undefined : / run=(\S+)/.exec(created)?.[1];
  if (runId === undefined) return null;
  const errors = lines.filter(
    (line) => line.includes(` run=${runId} `) && line.includes('message="stream error"'),
  );
  // The answer stream, not the title agent retrying the same failure behind it.
  const answer = errors.find((line) => line.includes('small=false')) ?? errors[0];
  if (answer === undefined) return null;
  return /error\.error="(.*)"\s*$/.exec(answer)?.[1] ?? null;
}

function readLogTail(): string {
  try {
    const path = opencodeLogPath();
    const size = statSync(path).size;
    if (size <= LOG_TAIL_BYTES) return readFileSync(path, 'utf8');
    const fd = openSync(path, 'r');
    try {
      const buffer = Buffer.alloc(LOG_TAIL_BYTES);
      readSync(fd, buffer, 0, LOG_TAIL_BYTES, size - LOG_TAIL_BYTES);
      const text = buffer.toString('utf8');
      // The window starts mid-line; that first partial line is not a parseable entry.
      return text.slice(text.indexOf('\n') + 1);
    } finally {
      closeSync(fd);
    }
  } catch {
    return '';
  }
}

export function runOpencode(
  cwd: string,
  prompt: string,
  budgetUsd: number,
  options: OpencodeOptions = {},
  history?: EvalTurnRecord[],
): EvalRun {
  const command = process.env.HAHAHAH_OPENCODE_BIN ?? 'opencode';
  const input = withTranscript(history, prompt);
  const startedAt = Date.now();
  const configDir = mkdtempSync(join(scratchRoot(), 'hahahah-opencode-cfg-'));
  const configPath = join(configDir, 'opencode.json');
  writeFileSync(configPath, opencodeStudyConfig(), 'utf8');

  const args = opencodeArgs(cwd, options);

  const invocation =
    process.platform === 'win32'
      ? // opencode on this machine is a .cmd shim, which spawnSync cannot exec directly
        // (measured: `spawnSync opencode ENOENT`). Same wrapper runClaude uses.
        spawnSync(
          process.env.ComSpec ?? 'cmd.exe',
          ['/d', '/s', '/c', [command, ...args].join(' ')],
          {
            cwd,
            input,
            encoding: 'utf8',
            timeout: options.timeoutMs ?? 180_000,
            env: { ...process.env, OPENCODE_CONFIG: configPath },
          },
        )
      : spawnSync(command, args, {
          cwd,
          input,
          encoding: 'utf8',
          timeout: options.timeoutMs ?? 180_000,
          env: { ...process.env, OPENCODE_CONFIG: configPath },
        });

  const elapsed = (): number => Date.now() - startedAt;
  if (invocation.error) {
    // A spawn timeout used to throw away both the partial stream and the harness's own log, which is
    // how a refusal became an unexplained hang. The last thing opencode actually said wins.
    const reported = scanStream(invocation.stdout ?? '').error;
    const logged = loggedErrorForRun(readLogTail(), cwd);
    const said = reported ?? logged;
    return {
      output: '',
      costUsd: 0,
      durationMs: elapsed(),
      error: said === null || said === undefined ? invocation.error.message : said,
    };
  }
  const stdout = (invocation.stdout ?? '').trim();
  if (invocation.status !== 0 && !stdout) {
    return {
      output: '',
      costUsd: 0,
      durationMs: elapsed(),
      error: (invocation.stderr ?? '').trim() || `opencode exited ${String(invocation.status)}`,
    };
  }
  const run = parseOpencodeStream(stdout);
  run.durationMs = elapsed();
  // The ceiling is declared by the caller and enforced by the harness; opencode reports 0 on the
  // free tier, so a non-zero measured cost above the ceiling means the cap did not hold.
  if (!run.error && run.costUsd > budgetUsd) {
    return {
      ...run,
      error: `run cost $${run.costUsd.toFixed(4)} exceeded the $${budgetUsd} ceiling`,
    };
  }
  return run;
}
