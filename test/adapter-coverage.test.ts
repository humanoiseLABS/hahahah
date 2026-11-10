import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { adapterIds, build } from '../src/build.ts';
import { doctor, install, uninstall } from '../src/install.ts';

const root = process.cwd();

// These expectations are written by hand from the vendor documents named in `source`, NOT read
// back out of src/harnesses.ts. That is deliberate: a test that imports the implementation's own
// table can only prove the table equals itself. Keeping them apart is what lets this file catch a
// wrong row.
type Layout = 'skill-tree' | 'rules-dir' | 'fold';

interface HarnessSpec {
  adapter: string;
  layout: Layout;
  blockPath: string;
  onDemandRoot: string | null;
  entryFile: string | null;
  frontmatter: string | null;
  status: 'verified on this machine' | 'documented, not verified';
  source: string;
}

const HARNESS_SPECS: HarnessSpec[] = [
  {
    adapter: 'claude-code',
    layout: 'skill-tree',
    blockPath: 'CLAUDE.md',
    onDemandRoot: '.claude/skills',
    entryFile: '.claude/skills/hahahah-plus62/SKILL.md',
    frontmatter: 'name:',
    status: 'verified on this machine',
    source: 'https://code.claude.com/docs/en/skills',
  },
  {
    adapter: 'opencode',
    layout: 'skill-tree',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.claude/skills',
    entryFile: '.claude/skills/hahahah-plus62/SKILL.md',
    frontmatter: 'name:',
    status: 'verified on this machine',
    source: 'opencode 1.18.31 `debug skill` listed the installed skill locally',
  },
  {
    adapter: 'agents-md',
    layout: 'skill-tree',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.agents/skills',
    entryFile: '.agents/skills/hahahah-plus62/SKILL.md',
    frontmatter: 'name:',
    status: 'documented, not verified',
    source: 'https://agentskills.io/specification',
  },
  {
    adapter: 'antigravity',
    layout: 'rules-dir',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.agents/rules',
    entryFile: '.agents/rules/hahahah-plus62-voice.md',
    frontmatter: 'trigger:',
    status: 'documented, not verified',
    source: 'https://antigravity.google/docs/rules/',
  },
  {
    adapter: 'qoder',
    layout: 'skill-tree',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.qoder/skills',
    entryFile: '.qoder/skills/hahahah-plus62/SKILL.md',
    frontmatter: 'name:',
    status: 'documented, not verified',
    source: 'https://docs.qoder.com/cli/Skills',
  },
  {
    adapter: 'copilot',
    layout: 'fold',
    blockPath: '.github/copilot-instructions.md',
    onDemandRoot: null,
    entryFile: null,
    frontmatter: null,
    status: 'documented, not verified',
    source:
      'https://docs.github.com/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot',
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

test('the profile schema enum, the registry and the profiles agree on the adapter list', () => {
  // This is the drift that just bit during development: a row was added to the registry and the
  // profile schema rejected it, which only surfaced when something tried to build. Naming the
  // three places once, in a test, means they cannot disagree silently.
  const schema = JSON.parse(readFileSync(join(root, 'schemas/profile.schema.json'), 'utf8')) as {
    properties: { adapters: { items: { enum: string[] } } };
  };
  const allowed = schema.properties.adapters.items.enum.sort().join(',');
  const registered = adapterIds().sort().join(',');
  assert.equal(allowed, registered, 'profile.schema.json enum vs build.ts registry');

  for (const file of ['plus62']) {
    const text = readFileSync(join(root, 'profiles', `${file}.yaml`), 'utf8');
    for (const id of adapterIds()) {
      if (id === 'fake') continue;
      assert.ok(
        new RegExp(`^  - ${id}$`, 'm').test(text),
        `profiles/${file}.yaml does not declare adapter ${id}`,
      );
    }
  }
});

test('each adapter renders exactly one always-on block, and an entry file only when it has one', () => {
  for (const spec of HARNESS_SPECS) {
    const artifacts = build({
      root,
      profileId: 'plus62',
      adapterId: spec.adapter,
      write: false,
    }).artifacts;
    const blocks = artifacts.filter((artifact) => artifact.kind === 'always_on');
    assert.equal(blocks.length, 1, `${spec.adapter} must render exactly one always-on block`);
    assert.equal(blocks[0]?.path, spec.blockPath, `${spec.adapter} block path drifted`);
    if (spec.entryFile) {
      assert.ok(
        artifacts.some((artifact) => artifact.path === spec.entryFile),
        `${spec.adapter} must ship ${spec.entryFile}`,
      );
    } else {
      assert.equal(
        artifacts.length,
        1,
        `${spec.adapter} folds everything into the block; extra artifacts would be unread`,
      );
    }
  }
});

test('emitted on-demand files carry the frontmatter the vendor requires', () => {
  for (const spec of HARNESS_SPECS) {
    if (!spec.entryFile || !spec.frontmatter) continue;
    const artifacts = build({
      root,
      profileId: 'plus62',
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

test('a fold harness puts the voice where the agent will actually read it', () => {
  // Copilot documents no on-demand layer, so anything left out of the single instructions file is
  // lost. This is the whole reason the fold layout exists.
  const voice = readFileSync(join(root, 'personas/plus62/voice.md'), 'utf8').trim();
  const marker = voice
    .split('\n')
    .find((line) => line.startsWith('- **Casual greeting.'))
    ?.trim();
  assert.ok(marker, 'the voice fixture changed; update this probe');

  for (const spec of HARNESS_SPECS.filter((row) => row.layout === 'fold')) {
    const block = build({
      root,
      profileId: 'plus62',
      adapterId: spec.adapter,
      write: false,
    }).artifacts.find((artifact) => artifact.kind === 'always_on')!;
    assert.ok(
      block.content.includes(marker),
      `${spec.adapter} must fold the voice into ${spec.blockPath}`,
    );
    assert.ok(
      block.content.includes('# +62 Mode voice'),
      `${spec.adapter} folded voice must keep its section headings`,
    );
  }
});

test('a fold harness stays inside its own always-on ceiling and says so', () => {
  for (const spec of HARNESS_SPECS.filter((row) => row.layout === 'fold')) {
    const result = build({ root, profileId: 'plus62', adapterId: spec.adapter, write: false });
    const alwaysOn = result.manifest.budgets.always_on;
    // The global 600-token cap is for a card-only block. A folded block is legitimately bigger,
    // so the harness row must carry its own ceiling instead of silently passing the global one.
    assert.ok(
      alwaysOn.hardCap > 600,
      `${spec.adapter} folds the voice and must declare its own always_on ceiling`,
    );
    assert.equal(
      alwaysOn.status,
      'ok',
      `${spec.adapter} always_on ${alwaysOn.tokens}/${alwaysOn.hardCap} exceeds its declared ceiling`,
    );
    assert.ok(
      result.warnings.some((warning) => warning.includes('folded')),
      `${spec.adapter} must warn that the full voice now costs tokens every turn`,
    );
  }
});

test('every harness round-trips: install, report healthy, uninstall, leave nothing behind', () => {
  for (const spec of HARNESS_SPECS) {
    const target = mkdtempSync(join(tmpdir(), `hahahah-matrix-${spec.adapter}-`));
    const blockFile = join(target, spec.blockPath);
    mkdirSync(dirname(blockFile), { recursive: true });
    writeFileSync(blockFile, '# Proyek gue\n\nJangan sentuh.\n', 'utf8');
    try {
      install({
        sourceRoot: root,
        targetRoot: target,
        profileId: 'plus62',
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
      assert.equal(after.includes('hahahah:begin'), false, `${spec.adapter}: block left behind`);
      assert.match(after, /Jangan sentuh\./, `${spec.adapter}: user content lost`);
      if (spec.onDemandRoot) {
        const top = spec.onDemandRoot.split('/')[0] ?? spec.onDemandRoot;
        assert.equal(existsSync(join(target, top)), false, `${spec.adapter}: ${top}/ not pruned`);
      }
      assert.equal(
        existsSync(join(target, '.plus62/manifest.json')),
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
    assert.ok(row, `README has no table row for \`${spec.adapter}\`; add one with its status`);
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
