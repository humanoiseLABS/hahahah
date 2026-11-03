import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentRun } from './coding.ts';
import type { ClaudeOptions } from './eval.ts';

// Why this file exists: a run that dies on the harness budget cap returns `result: ""`, and the
// single-result JSON format throws away the per-message events where a permission refusal lives.
// `stream-json` keeps them, so the refusal can be read instead of guessed at.

export interface StreamSummary {
  lines: number;
  tools: Record<string, number>;
  toolErrors: string[];
  denials: string[];
  finalText: string;
  subtype: string | null;
  numTurns: number | null;
  totalCostUsd: number | null;
}

const DENIAL = /permission|denied|not allowed|rejected|blocked/i;
const MAX_TEXT = 240;

function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_TEXT ? `${flat.slice(0, MAX_TEXT)}…` : flat;
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(textOf).filter(Boolean).join(' ');
  if (typeof content === 'object' && content !== null) {
    const block = content as Record<string, unknown>;
    if (typeof block.text === 'string') return block.text;
    if (block.content !== undefined) return textOf(block.content);
  }
  return '';
}

export function summarizeStream(ndjson: string): StreamSummary {
  const physical = ndjson.split('\n');
  const tools: Record<string, number> = {};
  const toolErrors: string[] = [];
  const denials: string[] = [];
  let finalText = '';
  let subtype: string | null = null;
  let numTurns: number | null = null;
  let totalCostUsd: number | null = null;

  for (const line of physical) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (event.type === 'result') {
      subtype = typeof event.subtype === 'string' ? event.subtype : null;
      numTurns = typeof event.num_turns === 'number' ? event.num_turns : null;
      totalCostUsd = typeof event.total_cost_usd === 'number' ? event.total_cost_usd : null;
      const result = typeof event.result === 'string' ? event.result : '';
      if (result !== '') finalText = clip(result);
      continue;
    }
    const message = event.message as Record<string, unknown> | undefined;
    const blocks = Array.isArray(message?.content) ? (message!.content as unknown[]) : [];
    for (const raw of blocks) {
      if (typeof raw !== 'object' || raw === null) continue;
      const block = raw as Record<string, unknown>;
      if (block.type === 'tool_use' && typeof block.name === 'string') {
        tools[block.name] = (tools[block.name] ?? 0) + 1;
      } else if (
        block.type === 'text' &&
        typeof block.text === 'string' &&
        block.text.trim() !== ''
      ) {
        finalText = clip(block.text);
      } else if (block.type === 'tool_result') {
        const text = clip(textOf(block.content));
        if (text === '') continue;
        // A refusal is also a failing tool result, so it belongs in both lists: `denials` is the
        // subset that says why, `toolErrors` is everything the agent tried that did not work.
        if (block.is_error === true || DENIAL.test(text)) {
          toolErrors.push(text);
          if (DENIAL.test(text)) denials.push(text);
        }
      }
    }
  }

  return {
    lines: physical.length,
    tools,
    toolErrors,
    denials,
    finalText,
    subtype,
    numTurns,
    totalCostUsd,
  };
}

export function writeRawStream(dir: string, arm: string, ndjson: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${arm}-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson`);
  writeFileSync(path, `${ndjson}\n`, 'utf8');
  return path;
}

export function runClaudeStream(
  cwd: string,
  prompt: string,
  budgetUsd: number,
  options: ClaudeOptions = {},
): { run: AgentRun; ndjson: string } {
  const command = process.env.HAHAHAH_CLAUDE_BIN ?? 'claude';
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    // Without this the harness emits only the final result, which is the format that hid the
    // refusal this run exists to find.
    '--verbose',
    '--max-budget-usd',
    budgetUsd.toFixed(2),
    '--no-session-persistence',
    '--permission-mode',
    'acceptEdits',
    '--permission-prompts',
    'none',
  ];
  if (options.model) args.push('--model', options.model);
  if (options.settingSources) args.push('--setting-sources', options.settingSources);

  // No env override: the diagnostic must see the same auth and settings the study run sees,
  // or it proves nothing about that run.
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

  const ndjson = (result.stdout ?? '').trim();
  if (result.error) return { run: { output: '', costUsd: 0, error: result.error.message }, ndjson };
  const summary = summarizeStream(ndjson);
  if (ndjson === '') {
    return {
      run: {
        output: '',
        costUsd: 0,
        error:
          (result.stderr ?? '').trim() || `harness exited ${String(result.status)} with no output`,
      },
      ndjson,
    };
  }
  return {
    run: {
      output: summary.finalText,
      costUsd: summary.totalCostUsd ?? 0,
      numTurns: summary.numTurns ?? undefined,
      error:
        summary.subtype && summary.subtype !== 'success'
          ? `harness reported an error (${[summary.subtype, summary.numTurns === null ? undefined : `num_turns=${summary.numTurns}`, summary.denials.length > 0 ? `${summary.denials.length} permission denial(s)` : undefined].filter(Boolean).join(', ')})`
          : undefined,
    },
    ndjson,
  };
}
