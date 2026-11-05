import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectInjectedStyleLayers } from '../src/checks.ts';
import { runEval } from '../src/eval.ts';

const root = process.cwd();

// Verbatim reasoning fragments lifted out of the recorded baseline runs
// (docs/evidence/phase-3-live-suites/decisions-report.json). The provider was later confirmed to
// inject these style layers itself, so a "baseline" run is not a neutral reference.
const CONTAMINATED_BASELINE = `The user wants:
1. One sentence clarification
2. WITHOUT using tools
3. In the terse caveman style that was just defined
4. With the lazy senior developer mindset`;

const CONTAMINATED_SAFETY =
  'Terse caveman mode active BUT Auto-Clarity applies: this is about destructive action confirmation.';

test('detectInjectedStyleLayers names the layers the provider leaks into its own reasoning', () => {
  assert.deepEqual(detectInjectedStyleLayers(CONTAMINATED_BASELINE).sort(), [
    'caveman',
    'lazy senior developer',
  ]);
  assert.deepEqual(detectInjectedStyleLayers(CONTAMINATED_SAFETY).sort(), [
    'auto-clarity',
    'caveman',
  ]);
});

test('detectInjectedStyleLayers stays quiet on an ordinary answer', () => {
  assert.deepEqual(
    detectInjectedStyleLayers('Gak bisa langsung push — test belum jalan. Ini risikonya:'),
    [],
  );
});

test('detectInjectedStyleLayers does not confuse our own persona with a provider layer', () => {
  // personas/rusuh/voice.md opens with "an Indonesian senior developer". A pattern loose enough to
  // match that would flag the treatment as contaminated by a layer it does not have.
  assert.deepEqual(
    detectInjectedStyleLayers(
      'RUSUH is the voice of an Indonesian senior developer who has seen the bug before.',
    ),
    [],
  );
});

test('the eval report records which arm was contaminated and by what', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-contam-'));
  try {
    const report = runEval({
      sourceRoot: root,
      profileId: 'rusuh-id',
      tasks: [
        { id: 'contam-01', prompt: 'Reply once.' },
        { id: 'contam-02', prompt: 'Reply twice.' },
      ],
      outDir,
      budgetUsd: 0.05,
      runner: (cwd, prompt) => {
        const treatment = cwd.includes('treatment');
        // One of two baseline runs leaks a layer, so the count has to be per run, not per arm.
        if (!treatment && prompt.includes('once')) {
          return { output: CONTAMINATED_BASELINE, costUsd: 0.01 };
        }
        return { output: treatment ? 'Siap, gw cek dulu.' : 'Oke.', costUsd: 0.01 };
      },
    });

    assert.equal(report.contamination.baseline.runs, 2);
    assert.equal(report.contamination.baseline.affected, 1);
    assert.deepEqual(report.contamination.baseline.phrases, ['caveman', 'lazy senior developer']);
    assert.equal(report.contamination.treatment.affected, 0);
    assert.deepEqual(report.contamination.treatment.phrases, []);

    const markdown = readFileSync(join(outDir, 'report.md'), 'utf8');
    assert.match(markdown, /not a neutral reference/i);
    assert.match(markdown, /1 of 2 baseline run/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});

test('the eval report states the stack the numbers came from', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'hahahah-stack-'));
  try {
    const report = runEval({
      sourceRoot: root,
      profileId: 'rusuh-id',
      tasks: [{ id: 'stack-01', prompt: 'Reply once.' }],
      outDir,
      budgetUsd: 0.05,
      runner: () => ({ output: 'Oke.', costUsd: 0.01 }),
    });

    assert.equal(typeof report.environment.harness, 'string');
    // Provenance must not become a credential leak: only the host, never a token or userinfo.
    assert.ok(
      !/@|\S{20,}/.test(report.environment.baseUrlHost ?? ''),
      `baseUrlHost looks like it carries a credential: ${report.environment.baseUrlHost}`,
    );
    const json = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8')) as {
      environment: unknown;
      contamination: unknown;
    };
    assert.ok(json.environment, 'report.json must persist the environment block');
    assert.ok(json.contamination, 'report.json must persist the contamination block');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
