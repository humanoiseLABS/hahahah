import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adapterIds, build } from '../src/build.ts';
import { doctor, install, uninstall } from '../src/install.ts';

const root = process.cwd();

// What each vendor documents, and separately what we have proven here. The two fields are kept
// apart on purpose: a harness can be spec-conformant and still never have been observed loading,
// and pretending otherwise is how "supports all agents" becomes a false claim.
interface HarnessSpec {
  adapter: string;
  blockPath: string;
  onDemandRoot: string;
  entryFile: string;
  frontmatter: string;
  status: 'verified on this machine' | 'documented, not verified';
  source: string;
}

const HARNESS_SPECS: HarnessSpec[] = [
  {
    adapter: 'claude-code',
    blockPath: 'CLAUDE.md',
    onDemandRoot: '.claude/skills',
    entryFile: '.claude/skills/hahahah-rusuh/SKILL.md',
    frontmatter: 'name:',
    status: 'verified on this machine',
    source: 'https://code.claude.com/docs/en/skills',
  },
  {
    adapter: 'opencode',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.claude/skills',
    entryFile: '.claude/skills/hahahah-rusuh/SKILL.md',
    frontmatter: 'name:',
    status: 'verified on this machine',
    source: 'opencode 1.18.31 `debug skill` listed the installed skill locally',
  },
  {
    adapter: 'agents-md',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.agents/skills',
    entryFile: '.agents/skills/hahahah-rusuh/SKILL.md',
    frontmatter: 'name:',
    status: 'documented, not verified',
    source: 'https://agentskills.io/specification',
  },
  {
    adapter: 'antigravity',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.agents/rules',
    entryFile: '.agents/rules/hahahah-rusuh-voice.md',
    frontmatter: 'trigger:',
    status: 'documented, not verified',
    source: 'https://antigravity.google/docs/rules/',
  },
];

test('every registered adapter is specced or explicitly exempt', () => {
  const registered = adapterIds();
  const specced = HARNESS_SPECS.map((spec) => spec.adapter);
  // fake is the compiler's own contract surface: nothing installs with it, so it has no harness
  // to document. An exemption must be named here, never inferred by leaving a row out.
  const exempt = ['fake'];

  const undocumented = registered.filter((id) => !specced.includes(id) && !exempt.includes(id));
  assert.deepEqual(
    undocumented,
    [],
    `adapter(s) added to the registry with no harness spec and no exemption: ${undocumented.join(', ')}. Add a row to HARNESS_SPECS with its documented paths and verification status.`,
  );

  const stale = specced.filter((id) => !registered.includes(id));
  assert.deepEqual(
    stale,
    [],
    `harness spec names an adapter that no longer exists: ${stale.join(', ')}`,
  );
});

test('each adapter renders exactly one always-on block and one entry file', () => {
  for (const spec of HARNESS_SPECS) {
    const artifacts = build({
      root,
      profileId: 'rusuh-id',
      adapterId: spec.adapter,
      write: false,
    }).artifacts;
    const blocks = artifacts.filter((artifact) => artifact.kind === 'always_on');
    assert.equal(blocks.length, 1, `${spec.adapter} must render exactly one always-on block`);
    assert.equal(blocks[0]?.path, spec.blockPath, `${spec.adapter} block path drifted`);
    assert.ok(
      artifacts.some((artifact) => artifact.path === spec.entryFile),
      `${spec.adapter} must ship ${spec.entryFile}`,
    );
  }
});

test('emitted on-demand files carry the frontmatter the vendor requires', () => {
  for (const spec of HARNESS_SPECS) {
    const artifacts = build({
      root,
      profileId: 'rusuh-id',
      adapterId: spec.adapter,
      write: false,
    }).artifacts;
    const entry = artifacts.find((artifact) => artifact.path === spec.entryFile);
    assert.ok(entry, `${spec.adapter} produced no ${spec.entryFile}`);
    assert.ok(
      entry.content.startsWith('---\n') && entry.content.includes(spec.frontmatter),
      `${spec.entryFile} must start with frontmatter containing "${spec.frontmatter}"`,
    );
  }
});

test('every harness round-trips: install, report healthy, uninstall, leave nothing behind', () => {
  for (const spec of HARNESS_SPECS) {
    const target = mkdtempSync(join(tmpdir(), `hahahah-matrix-${spec.adapter}-`));
    writeFileSync(join(target, spec.blockPath), '# Proyek gue\n\nJangan sentuh.\n', 'utf8');
    try {
      install({
        sourceRoot: root,
        targetRoot: target,
        profileId: 'rusuh-id',
        adapterId: spec.adapter,
      });
      assert.match(
        readFileSync(join(target, spec.blockPath), 'utf8'),
        /# Proyek gue/,
        `${spec.adapter}: install destroyed the user's file`,
      );
      assert.deepEqual(
        doctor({ targetRoot: target }).errors,
        [],
        `${spec.adapter}: doctor unhappy`,
      );

      uninstall({ targetRoot: target });
      const after = readFileSync(join(target, spec.blockPath), 'utf8');
      const onDemandTop = spec.onDemandRoot.split('/')[0] ?? spec.onDemandRoot;
      assert.equal(after.includes('hahahah:begin'), false, `${spec.adapter}: block left behind`);
      assert.match(after, /Jangan sentuh\./, `${spec.adapter}: user content lost`);
      assert.equal(
        existsSync(join(target, onDemandTop)),
        false,
        `${spec.adapter}: ${onDemandTop}/ not pruned`,
      );
      assert.equal(
        existsSync(join(target, '.hahahah/manifest.json')),
        false,
        `${spec.adapter}: manifest left behind`,
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  }
});

test('the README harness table documents every specced adapter with its honest status', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  for (const spec of HARNESS_SPECS) {
    const row = readme
      .split('\n')
      .find((line) => line.includes(`\`${spec.adapter}\``) && line.startsWith('|'));
    assert.ok(
      row,
      `README has no table row for \`${spec.adapter}\`; add one with its block path and status`,
    );
    assert.ok(
      row.includes(spec.blockPath),
      `README row for ${spec.adapter} omits ${spec.blockPath}`,
    );
    assert.ok(
      row.includes(spec.status),
      `README row for ${spec.adapter} must say "${spec.status}"`,
    );
    assert.ok(row.includes(spec.source), `README row for ${spec.adapter} cites no source`);
  }
});
