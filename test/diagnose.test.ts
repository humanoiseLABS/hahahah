import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diagnoseFixture, loadFixtures } from '../src/coding.ts';
import { summarizeStream, writeRawStream } from '../src/diagnose.ts';

const root = process.cwd();

const initLine = JSON.stringify({
  type: 'system',
  subtype: 'init',
  tools: ['Read', 'Edit', 'Bash'],
  cwd: '/tmp/x',
});

const assistantTool = (name: string) =>
  JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id: 't1', name, input: {} }] },
  });

const assistantText = (text: string) =>
  JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
  });

const toolResult = (content: unknown, isError = false) =>
  JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: 't1', content, is_error: isError }] },
  });

const resultLine = JSON.stringify({
  type: 'result',
  subtype: 'error_max_budget_usd',
  result: '',
  total_cost_usd: 0.41,
  num_turns: 12,
  usage: { input_tokens: 900, output_tokens: 80 },
});

test('the stream summary names every tool the agent tried to use', () => {
  const ndjson = [
    initLine,
    assistantTool('Read'),
    assistantTool('Read'),
    assistantTool('Edit'),
    resultLine,
  ].join('\n');
  const summary = summarizeStream(ndjson);
  assert.deepEqual(summary.tools, { Read: 2, Edit: 1 });
  assert.equal(summary.subtype, 'error_max_budget_usd');
  assert.equal(summary.numTurns, 12);
  assert.equal(summary.totalCostUsd, 0.41);
});

test('a refused edit is surfaced instead of an empty result string', () => {
  // This is the whole reason the diagnostic exists: a capped run returns no result text, and
  // the JSON reporter throws away the per-tool messages where the refusal lives.
  const ndjson = [
    initLine,
    assistantTool('Edit'),
    toolResult('Permission to use Edit has been denied', true),
    resultLine,
  ].join('\n');
  const summary = summarizeStream(ndjson);
  assert.equal(summary.denials.length, 1, summary.denials.join(' | '));
  assert.match(summary.denials[0] ?? '', /Permission to use Edit/);
  assert.equal(summary.toolErrors.length, 1);
});

test('a tool that ran but returned an error is recorded with its text', () => {
  const ndjson = [
    initLine,
    assistantTool('Bash'),
    toolResult('ENOENT: no such file', true),
    resultLine,
  ].join('\n');
  const summary = summarizeStream(ndjson);
  assert.equal(summary.toolErrors.length, 1);
  assert.match(summary.toolErrors[0] ?? '', /ENOENT/);
  assert.equal(summary.denials.length, 0, 'an ordinary error is not a permission denial');
});

test('the last assistant sentence survives, and blank output stays blank', () => {
  const withText = [
    initLine,
    assistantText('Gw edit src/token.js ya.'),
    assistantText('Beres, test udah lulus.'),
    resultLine,
  ].join('\n');
  assert.equal(summarizeStream(withText).finalText, 'Beres, test udah lulus.');
  assert.equal(summarizeStream([initLine, resultLine].join('\n')).finalText, '');
});

test('a string tool_result and non-JSON noise are both tolerated', () => {
  const ndjson = [
    'not json at all',
    '',
    initLine,
    JSON.stringify({ type: 'user', message: { content: 'plain string result' } }),
    resultLine,
  ].join('\n');
  const summary = summarizeStream(ndjson);
  assert.equal(summary.lines, 5, 'every physical line is counted, parsed or not');
  assert.equal(summary.toolErrors.length, 0);
});

test('the raw stream is kept for later reading, not just the summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hahahah-diag-'));
  try {
    const ndjson = [initLine, resultLine].join('\n');
    const path = writeRawStream(dir, 'treatment', ndjson);
    assert.equal(existsSync(path), true);
    assert.equal(readFileSync(path, 'utf8'), ndjson + '\n');
    assert.match(path, /treatment.*\.ndjson$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function stream(
  init: Record<string, unknown>,
  blocks: unknown[],
  result: Record<string, unknown>,
): string {
  return [
    JSON.stringify(init),
    ...blocks.map((block) => JSON.stringify({ type: 'assistant', message: { content: [block] } })),
    JSON.stringify({ type: 'result', ...result }),
  ].join('\n');
}

test('a diagnostic keeps the workspace, records the stream, and grades what is left', () => {
  const fixture = loadFixtures(root).find((f) => f.id === 'cod-expiry-gte');
  assert.ok(fixture, 'the real fixture set must contain cod-expiry-gte');
  const seen: Array<{ arm: string; profile: boolean }> = [];
  const runs: Array<'treatment' | 'baseline'> = ['treatment', 'baseline'];
  const kept: string[] = [];
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-diag-out-'));
  try {
    for (const arm of runs) {
      const result = diagnoseFixture({
        sourceRoot: root,
        profileId: 'rusuh-id',
        fixture,
        arm,
        budgetUsd: 0.5,
        outDir,
        runner: (cwd: string) => {
          seen.push({ arm, profile: existsSync(join(cwd, 'CLAUDE.md')) });
          for (const file of fixture.solution) {
            writeFileSync(join(cwd, file.path), file.content, 'utf8');
          }
          return {
            run: { output: 'Gw ganti < jadi <=', costUsd: 0.12, numTurns: 4 },
            ndjson: stream(
              { type: 'system', subtype: 'init' },
              [{ type: 'tool_use', name: 'Edit', id: '1', input: {} }],
              {
                subtype: 'success',
                result: 'Gw ganti < jadi <=',
                total_cost_usd: 0.12,
                num_turns: 4,
              },
            ),
          };
        },
      });
      kept.push(result.workspace);
      assert.equal(result.graded.grade, 'solved');
      assert.deepEqual(result.graded.changedFiles, ['src/token.js']);
      assert.equal(result.graded.fail, 0);
      assert.deepEqual(result.summary.tools, { Edit: 1 });
      assert.equal(result.summary.subtype, 'success');
      assert.ok(existsSync(result.rawPath), 'the raw stream is kept for reading');
      assert.ok(existsSync(result.workspace), 'the workspace survives a diagnostic');
    }
    assert.deepEqual(seen, [
      { arm: 'treatment', profile: true },
      { arm: 'baseline', profile: false },
    ]);
  } finally {
    for (const dir of kept) rmSync(dir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('a permission refusal in the stream reaches the summary, not an empty result', () => {
  const fixture = loadFixtures(root).find((f) => f.id === 'cod-expiry-gte');
  assert.ok(fixture);
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-diag-out-'));
  try {
    const result = diagnoseFixture({
      sourceRoot: root,
      profileId: 'rusuh-id',
      fixture,
      arm: 'baseline',
      budgetUsd: 0.5,
      outDir,
      runner: () => ({
        run: {
          output: '',
          costUsd: 0.41,
          numTurns: 12,
          error: 'harness reported an error (error_max_budget_usd)',
        },
        ndjson: stream(
          { type: 'system', subtype: 'init' },
          [
            { type: 'tool_use', name: 'Edit', id: '1', input: {} },
            {
              type: 'tool_result',
              tool_use_id: '1',
              is_error: true,
              content: 'Permission to use Edit has been denied',
            },
          ],
          { subtype: 'error_max_budget_usd', result: '', total_cost_usd: 0.41, num_turns: 12 },
        ),
      }),
    });
    rmSync(result.workspace, { recursive: true, force: true });
    assert.deepEqual(result.summary.denials, ['Permission to use Edit has been denied']);
    assert.deepEqual(result.summary.tools, { Edit: 1 });
    assert.equal(result.graded.grade, 'error', 'an unfinished run is still not scored');
    // The diff is still taken, so "nothing changed" stays a measurement rather than a guess.
    assert.deepEqual(result.graded.changedFiles, []);
    assert.equal(result.summary.totalCostUsd, 0.41);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
