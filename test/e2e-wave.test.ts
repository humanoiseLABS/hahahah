import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { parse } from 'yaml';
import { validate } from '../src/schema.ts';
import { build } from '../src/build.ts';

const root = process.cwd();
const read = (relPath: string): string => readFileSync(join(root, relPath), 'utf8');
const loadYaml = <T = Record<string, unknown>>(relPath: string): T => parse(read(relPath)) as T;
const escapeRegExp = (s: string): string => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

interface CultureEntry {
  id: string;
  term: string;
  gloss: string;
  register: 'informal' | 'neutral' | 'formal';
  regions: string[];
  decay_class: string;
  offensiveness: string;
  contexts: string[];
  avoid_when: string[];
  max_per_response: number;
  expires: string;
  confidence: string;
  sources: Array<{ url: string; note: string }>;
  purpose?: string;
  [key: string]: unknown;
}

interface CultureDataset {
  schema: string;
  locale: string;
  version: string;
  reviewed_by: string;
  next_review: string;
  entries: CultureEntry[];
}

interface MemeEntry {
  id: string;
  pattern: string;
  context: string | string[];
  avoid_when: string[];
  expires: string;
  note: string;
  sources?: unknown;
  [key: string]: unknown;
}

interface MemesDataset {
  schema: string;
  version: string;
  reviewed_by: string;
  next_review: string;
  entries: MemeEntry[];
}

interface LexiconEntry {
  culture_ref: string;
  usage: string;
  [key: string]: unknown;
}

interface LexiconDataset {
  schema: string;
  persona: string;
  version: string;
  entries: LexiconEntry[];
}

interface PackageJson {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  files?: string[];
  repository?: { type?: string; url?: string } | string;
  [key: string]: unknown;
}

// Canonical 152 items from Feature Inventory in PROJECT.md and TEST_INFRA.md
const MASTER_TERMS: readonly string[] = [
  'stecu',
  'aura-points',
  'brainrot',
  'delulu',
  'canon-event',
  'npc',
  'mid',
  'touch-grass',
  'no-cap',
  'rizz',
  'mogging',
  'slay',
  'ate',
  'bussin',
  'its-giving',
  'menyala-abangku',
  'gak-bisa-yura',
  'mbak-taylor',
  'orang-have',
  'skena',
  'minimal-roast',
  'bercyandya',
  'cepu',
  'gamon',
  'pick-me',
  'ygy',
  'ytta',
  'tbl-nbl',
  'ovt',
  'nt',
  'jj',
  'salfok',
  'nolep',
  'code-831',
  'code-224',
  'code-530',
  'bjir',
  'anjay',
  'anjrit',
  'buset',
  'astaganaga',
  'wkwk',
  'awokawok',
  'mleyot',
  'bengek',
  'gacor',
  'rungkad',
  'boncos',
  'zonk',
  'kureng',
  'ambyar',
  'goks',
  'pecah',
  'gaje',
  'blunder',
  'sat-set',
  'gercep',
  'wacana',
  'ngab',
  'bray',
  'cuy',
  'lur',
  'rek',
  'sepuh',
  'suhu',
  'bosku',
  'bestie',
  'gan',
  'ra-mashok',
  'ora-urus',
  'atuh',
  'euy',
  'gaskeun',
  'kuy',
  'sabi',
  'santuy',
  'jancok',
  'kalcer',
  'jamet',
  'mendang-mending',
  'budak-korporat',
  'jbjb',
  'menfess',
  'sender',
  'mutualan',
  'ava-telur',
  'spill',
  'gatekeep',
  'flexing',
  'flop',
  'ratio',
  'opfol',
  'cancel-culture',
  'fomo-jomo',
  'doomscrolling',
  'red-flag',
  'green-flag',
  'playing-victim',
  'gaslighting',
  'silent-treatment',
  'call-out',
  'tone-deaf',
  'valid-no-debat',
  'fiks',
  'skip',
  'tbh',
  'cmiiw',
  'tren-anomali',
  'dark-system',
  'skill-issue',
  'kuli-ketik',
  'cegil-cogil',
  'coquette-era',
  'velocity',
  'kaum-rebahan',
  'kena-ulti',
  'kena-mental',
  'carry',
  'sigma',
  'skibidi',
  'atapu',
  'partikel-sih',
  'partikel-dong',
  'partikel-deh',
  'partikel-tuh',
  'partikel-nih',
  'partikel-lah',
  'partikel-kok',
  'partikel-kan',
  'partikel-mah',
  'partikel-loh',
  'partikel-dah',
  'shorthand-yg',
  'shorthand-gak',
  'shorthand-bgt',
  'shorthand-gatau',
  'shorthand-otw',
  'shorthand-btw',
  'shorthand-cmn',
  'shorthand-jg',
  'shorthand-kyk',
  'shorthand-udh',
  'shorthand-skrg',
  'shorthand-klo',
  'shorthand-knp',
  'shorthand-sapa',
  'shorthand-gpp',
  'shorthand-bntr',
  'shorthand-tbtb',
  'shorthand-plis',
  'shorthand-pap',
  'shorthand-yaudah',
] as const;

// Awareness-only terms that must NEVER be proactively generated (quota 0)
const AWARENESS_TERMS: readonly string[] = [
  'cepu',
  'pick-me',
  'nolep',
  'jancok',
  'jamet',
  'playing-victim',
  'gaslighting',
] as const;

// Sensitive & taboo terms requiring non-none offensiveness and avoid_when safeguards
const SENSITIVE_TERMS: readonly string[] = ['jancok', 'jamet', 'cepu'] as const;

// ISO 8601 YYYY-MM-DD pattern
const ISO_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

// ============================================================================
// TIER 1: Feature Coverage & Schema Conformance
// ============================================================================

test('Tier 1: TC-E2E-T1-01 - 152 Feature Inventory terms completeness across culture datasets', () => {
  const lexicon = loadYaml<CultureDataset>('culture/id/genz-lexicon.yaml');
  const memes = loadYaml<MemesDataset>('culture/id/memes.yaml');

  const lexiconEntries = lexicon.entries || [];
  const memeEntries = memes.entries || [];

  const lexiconIds = new Set(lexiconEntries.map((e) => e.id.toLowerCase()));
  const lexiconTerms = new Set(lexiconEntries.map((e) => (e.term || '').toLowerCase()));
  const memeIds = new Set(memeEntries.map((e) => e.id.toLowerCase()));
  const memePatterns = memeEntries.map((e) => (e.pattern || '').toLowerCase());

  const missing: string[] = [];

  for (const item of MASTER_TERMS) {
    const itemLower = item.toLowerCase();
    const isPrefixed =
      itemLower.startsWith('partikel-') ||
      itemLower.startsWith('shorthand-') ||
      itemLower.startsWith('code-');
    const strippedItem = itemLower
      .replace(/^partikel-/, '')
      .replace(/^shorthand-/, '')
      .replace(/^code-/, '');

    const inLexicon =
      lexiconIds.has(itemLower) ||
      lexiconIds.has(`id-${itemLower}`) ||
      lexiconIds.has(strippedItem) ||
      lexiconIds.has(`id-${strippedItem}`) ||
      lexiconTerms.has(itemLower) ||
      lexiconTerms.has(strippedItem);

    const inMemeId =
      memeIds.has(itemLower) ||
      memeIds.has(`meme-${itemLower}`) ||
      memeIds.has(strippedItem) ||
      memeIds.has(`meme-${strippedItem}`);

    let inMemePattern = false;
    if (!isPrefixed) {
      const phrasePattern = itemLower.replace(/-/g, ' ');
      const wordRegex = new RegExp(
        `\\b${escapeRegExp(itemLower)}\\b|\\b${escapeRegExp(phrasePattern)}\\b`,
        'i',
      );
      inMemePattern = memePatterns.some((pattern) => wordRegex.test(pattern));
    }

    const found = inLexicon || inMemeId || inMemePattern;

    if (!found) {
      missing.push(item);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `Missing ${missing.length} terms from Wave 1 & 2 integration: ${missing.join(', ')}`,
  );
});

test('Tier 1: TC-E2E-T1-02 - culture lexicon AJV schema compliance (13 required fields)', () => {
  const cultureData = loadYaml('culture/id/genz-lexicon.yaml');
  assert.doesNotThrow(() => {
    validate('culture', cultureData, 'culture', root);
  }, 'culture/id/genz-lexicon.yaml failed AJV schema validation');

  const parsed = cultureData as unknown as CultureDataset;
  assert.ok(Array.isArray(parsed.entries), 'culture entries must be an array');
  assert.ok(parsed.entries.length >= 1, 'culture entries must not be empty');

  const requiredFields: Array<keyof CultureEntry> = [
    'id',
    'term',
    'gloss',
    'register',
    'regions',
    'decay_class',
    'offensiveness',
    'contexts',
    'avoid_when',
    'max_per_response',
    'expires',
    'confidence',
    'sources',
  ];

  for (const entry of parsed.entries) {
    for (const field of requiredFields) {
      assert.ok(
        entry[field] !== undefined,
        `Entry '${entry.id}' is missing required schema field: '${field}'`,
      );
    }
  }
});

test('Tier 1: TC-E2E-T1-03 - meme dataset AJV schema compliance (6 required fields, no sources)', () => {
  const memesData = loadYaml('culture/id/memes.yaml');
  assert.doesNotThrow(() => {
    validate('memes', memesData, 'memes', root);
  }, 'culture/id/memes.yaml failed AJV schema validation');

  const parsed = memesData as unknown as MemesDataset;
  assert.ok(Array.isArray(parsed.entries), 'memes entries must be an array');
  assert.ok(parsed.entries.length >= 1, 'memes entries must not be empty');

  const requiredMemeFields: Array<keyof MemeEntry> = [
    'id',
    'pattern',
    'context',
    'avoid_when',
    'expires',
    'note',
  ];

  for (const entry of parsed.entries) {
    for (const field of requiredMemeFields) {
      assert.ok(
        entry[field] !== undefined,
        `Meme entry '${entry.id}' is missing required schema field: '${field}'`,
      );
    }
    assert.equal(
      entry.sources,
      undefined,
      `Meme entry '${entry.id}' has forbidden 'sources' field (memes must not carry sources)`,
    );
  }
});

test('Tier 1: TC-E2E-T1-04 - persona lexicon AJV schema compliance', () => {
  const lexiconData = loadYaml('personas/plus62/lexicon.yaml');
  assert.doesNotThrow(() => {
    validate('lexicon', lexiconData, 'lexicon', root);
  }, 'personas/plus62/lexicon.yaml failed AJV schema validation');

  const parsed = lexiconData as unknown as LexiconDataset;
  assert.ok(Array.isArray(parsed.entries), 'persona lexicon entries must be an array');
  for (const entry of parsed.entries) {
    assert.ok(entry.culture_ref, `Lexicon entry missing culture_ref: ${JSON.stringify(entry)}`);
    assert.ok(entry.usage, `Lexicon entry missing usage description: ${JSON.stringify(entry)}`);
  }
});

// ============================================================================
// TIER 2: Boundary, Safety & Provenance Constraints
// ============================================================================

test('Tier 2: TC-E2E-T2-01 - awareness-only terms enforce max_per_response: 0 quota invariant', () => {
  const culture = loadYaml<CultureDataset>('culture/id/genz-lexicon.yaml');

  for (const entry of culture.entries) {
    const isExplicitAwareness = entry.purpose === 'awareness';
    const isRecognizedAwarenessTerm = AWARENESS_TERMS.some(
      (t) => entry.id === t || entry.id === `id-${t}` || entry.term.toLowerCase() === t,
    );

    if (isExplicitAwareness || isRecognizedAwarenessTerm) {
      assert.equal(
        entry.max_per_response,
        0,
        `Awareness term '${entry.id}' MUST have max_per_response: 0, found: ${entry.max_per_response}`,
      );
    }
  }
});

test('Tier 2: TC-E2E-T2-02 - sensitive and taboo words have non-none offensiveness & avoid_when safeguards', () => {
  const culture = loadYaml<CultureDataset>('culture/id/genz-lexicon.yaml');

  for (const sensitive of SENSITIVE_TERMS) {
    const entry = culture.entries.find(
      (e) => e.id === sensitive || e.id === `id-${sensitive}` || e.term.toLowerCase() === sensitive,
    );
    assert.ok(
      entry,
      `Sensitive term '${sensitive}' must be present in culture/id/genz-lexicon.yaml`,
    );
    assert.notEqual(
      entry.offensiveness,
      'none',
      `Sensitive term '${entry.id}' must not have offensiveness 'none'`,
    );
    assert.ok(
      Array.isArray(entry.avoid_when) && entry.avoid_when.length >= 1,
      `Sensitive term '${entry.id}' must provide at least 1 avoid_when restriction`,
    );
  }
});

test('Tier 2: TC-E2E-T2-03 - ISO 8601 date formatting and future review/expiry deadlines', () => {
  const culture = loadYaml<CultureDataset>('culture/id/genz-lexicon.yaml');
  const memes = loadYaml<MemesDataset>('culture/id/memes.yaml');

  const baselineDate = '2026-11-13';

  assert.match(
    culture.next_review,
    ISO_DATE_PATTERN,
    `culture.next_review '${culture.next_review}' must match YYYY-MM-DD`,
  );
  assert.ok(
    !Number.isNaN(Date.parse(culture.next_review)),
    `culture.next_review '${culture.next_review}' is not a valid calendar date`,
  );
  assert.ok(
    culture.next_review >= baselineDate,
    `culture.next_review '${culture.next_review}' has expired (must be >= ${baselineDate})`,
  );

  assert.match(
    memes.next_review,
    ISO_DATE_PATTERN,
    `memes.next_review '${memes.next_review}' must match YYYY-MM-DD`,
  );
  assert.ok(
    !Number.isNaN(Date.parse(memes.next_review)),
    `memes.next_review '${memes.next_review}' is not a valid calendar date`,
  );
  assert.ok(
    memes.next_review >= baselineDate,
    `memes.next_review '${memes.next_review}' has expired (must be >= ${baselineDate})`,
  );

  for (const entry of culture.entries) {
    assert.match(
      entry.expires,
      ISO_DATE_PATTERN,
      `Culture entry '${entry.id}' expires date '${entry.expires}' is not valid ISO 8601 YYYY-MM-DD`,
    );
    assert.ok(
      !Number.isNaN(Date.parse(entry.expires)),
      `Culture entry '${entry.id}' expires date '${entry.expires}' is not a valid calendar date`,
    );
    assert.ok(
      entry.expires >= baselineDate,
      `Culture entry '${entry.id}' has past/stale expiry date: '${entry.expires}' (must be >= ${baselineDate})`,
    );
  }

  for (const meme of memes.entries) {
    assert.match(
      meme.expires,
      ISO_DATE_PATTERN,
      `Meme entry '${meme.id}' expires date '${meme.expires}' is not valid ISO 8601 YYYY-MM-DD`,
    );
    assert.ok(
      !Number.isNaN(Date.parse(meme.expires)),
      `Meme entry '${meme.id}' expires date '${meme.expires}' is not a valid calendar date`,
    );
    assert.ok(
      meme.expires >= baselineDate,
      `Meme entry '${meme.id}' has past/stale expiry date: '${meme.expires}' (must be >= ${baselineDate})`,
    );
  }
});

test('Tier 2: TC-E2E-T2-04 - source provenance and URL protocol hygiene', () => {
  const culture = loadYaml<CultureDataset>('culture/id/genz-lexicon.yaml');

  for (const entry of culture.entries) {
    assert.ok(
      Array.isArray(entry.sources) && entry.sources.length >= 1,
      `Culture entry '${entry.id}' must have at least one audit citation source`,
    );

    for (const source of entry.sources) {
      assert.match(
        source.url,
        /^https?:\/\//,
        `Culture entry '${entry.id}' has invalid source URL protocol: '${source.url}' (must start with http:// or https://)`,
      );
      assert.doesNotMatch(
        source.url,
        /^file:\/\/|[a-zA-Z]:\\|\.\./,
        `Culture entry '${entry.id}' leaked local file path in source: '${source.url}'`,
      );
      assert.ok(
        typeof source.note === 'string' && source.note.trim().length > 0,
        `Culture entry '${entry.id}' has empty source note`,
      );
    }
  }
});

test('Tier 2: TC-E2E-T2-05 - clean meme notes: zero bare URLs in pattern and note fields', () => {
  const memes = loadYaml<MemesDataset>('culture/id/memes.yaml');

  for (const meme of memes.entries) {
    assert.equal(meme.sources, undefined, `Meme '${meme.id}' must not contain 'sources' property`);
    assert.doesNotMatch(
      meme.note || '',
      /https?:\/\//,
      `Meme '${meme.id}' note contains bare URL; move citation to culture/id/sources.md`,
    );
    assert.doesNotMatch(
      meme.pattern || '',
      /https?:\/\//,
      `Meme '${meme.id}' pattern contains bare URL`,
    );
    if (Array.isArray(meme.context)) {
      for (const ctx of meme.context) {
        assert.doesNotMatch(
          ctx,
          /https?:\/\//,
          `Meme '${meme.id}' context item '${ctx}' contains bare URL`,
        );
      }
    } else if (typeof meme.context === 'string') {
      assert.doesNotMatch(
        meme.context,
        /https?:\/\//,
        `Meme '${meme.id}' context contains bare URL`,
      );
    }
    if (Array.isArray(meme.avoid_when)) {
      for (const avoid of meme.avoid_when) {
        assert.doesNotMatch(
          avoid,
          /https?:\/\//,
          `Meme '${meme.id}' avoid_when item '${avoid}' contains bare URL`,
        );
      }
    }
  }
});

// ============================================================================
// TIER 3: Cross-Feature Integration & Hard Token Caps
// ============================================================================

test('Tier 3: TC-E2E-T3-01 - persona lexicon mounting referential integrity', () => {
  const culture = loadYaml<CultureDataset>('culture/id/genz-lexicon.yaml');
  const personaLexicon = loadYaml<LexiconDataset>('personas/plus62/lexicon.yaml');

  const cultureIds = new Set(culture.entries.map((e) => e.id));

  const orphaned: string[] = [];
  for (const item of personaLexicon.entries) {
    if (!cultureIds.has(item.culture_ref)) {
      orphaned.push(item.culture_ref);
    }
  }

  assert.deepEqual(
    orphaned,
    [],
    `Persona lexicon references unmounted culture terms: ${orphaned.join(', ')}`,
  );
});

test('Tier 3: TC-E2E-T3-02 & TC-E2E-T3-03 - multi-adapter compilation pipeline and token budget hard caps compliance', () => {
  const adapters = ['antigravity', 'claude-code'] as const;

  for (const adapterId of adapters) {
    const result = build({
      root,
      profileId: 'plus62',
      adapterId,
      write: false,
    });

    assert.ok(result.manifest, `Build failed to produce manifest for adapter: ${adapterId}`);
    const budgets = result.manifest.budgets;

    // Hard caps specified in ORIGINAL_REQUEST.md and src/build.ts
    // always_on <= 600, skill_body <= 2000, references <= 5000
    assert.ok(
      budgets.always_on.tokens <= 600,
      `Adapter '${adapterId}' always_on tokens (${budgets.always_on.tokens}) exceeded hard cap (600)`,
    );
    assert.ok(
      budgets.skill_body.tokens <= 2000,
      `Adapter '${adapterId}' skill_body tokens (${budgets.skill_body.tokens}) exceeded hard cap (2000)`,
    );
    assert.ok(
      budgets.references.tokens <= 5000,
      `Adapter '${adapterId}' references tokens (${budgets.references.tokens}) exceeded hard cap (5000)`,
    );

    assert.notEqual(
      budgets.always_on.status,
      'error',
      `Adapter '${adapterId}' always_on budget status is 'error'`,
    );
    assert.notEqual(
      budgets.skill_body.status,
      'error',
      `Adapter '${adapterId}' skill_body budget status is 'error'`,
    );
    assert.notEqual(
      budgets.references.status,
      'error',
      `Adapter '${adapterId}' references budget status is 'error'`,
    );
  }
});

// ============================================================================
// TIER 4: Real-World Build, Package & Public Guardrails
// ============================================================================

test('Tier 4: TC-E2E-T4-01 - CLI distribution bundle verification (dist/cli.js build & exec)', () => {
  // Verify bundle builds cleanly via esbuild
  execSync('npm run bundle', { cwd: root, stdio: 'pipe' });

  const bundlePath = join(root, 'dist/cli.js');
  assert.ok(existsSync(bundlePath), 'dist/cli.js was not generated by npm run bundle');

  const bundleStat = statSync(bundlePath);
  assert.ok(
    bundleStat.size > 50000,
    `dist/cli.js bundle size is suspiciously small: ${bundleStat.size} bytes`,
  );

  // Verify CLI binary responds to --version and --help
  const versionOutput = execSync('node dist/cli.js --version', {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  assert.equal(
    versionOutput,
    '0.2.0',
    `CLI version output '${versionOutput}' must be '0.2.0' per Requirement R3`,
  );

  const helpOutput = execSync('node dist/cli.js --help', {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(helpOutput, /measure/, 'CLI help missing measure command');
  assert.match(helpOutput, /build/, 'CLI help missing build command');
  assert.match(helpOutput, /install/, 'CLI help missing install command');
  assert.match(helpOutput, /doctor/, 'CLI help missing doctor command');
});

test('Tier 4: TC-E2E-T4-02 - package tarball dry-run and file whitelist integrity', () => {
  const packJsonRaw = execSync('npm pack --dry-run --json', {
    cwd: root,
    encoding: 'utf8',
  });
  const packData = JSON.parse(packJsonRaw)[0] as {
    id: string;
    name: string;
    version: string;
    files: Array<{ path: string; size: number }>;
  };

  const packedPaths = new Set(packData.files.map((f) => f.path));

  // Verify inclusion of all 14 critical shipping files
  const requiredShippingFiles = [
    'dist/cli.js',
    'culture/id/genz-lexicon.yaml',
    'culture/id/memes.yaml',
    'culture/id/sources.md',
    'personas/plus62/lexicon.yaml',
    'personas/plus62/persona.yaml',
    'personas/plus62/voice.md',
    'personas/plus62/card.md',
    'profiles/plus62.yaml',
    'schemas/culture.schema.json',
    'schemas/memes.schema.json',
    'schemas/lexicon.schema.json',
    'README.md',
    'LICENSE',
  ];

  for (const file of requiredShippingFiles) {
    assert.ok(packedPaths.has(file), `npm pack missing required shipping file: ${file}`);
  }

  // If CHANGELOG.md exists in working tree (created by M3), verify it is packed
  if (existsSync(join(root, 'CHANGELOG.md'))) {
    assert.ok(packedPaths.has('CHANGELOG.md'), 'npm pack missing CHANGELOG.md');
  }

  // Verify exclusion of test suites, build caches, and internal agent workspaces
  assert.ok(
    !packedPaths.has('test/e2e-wave.test.ts'),
    'npm pack leaked test/e2e-wave.test.ts into package tarball',
  );
  assert.ok(
    ![...packedPaths].some((p) => p.startsWith('.agents/')),
    'npm pack leaked .agents/ directory into package tarball',
  );
  assert.ok(
    ![...packedPaths].some((p) => p.startsWith('test/')),
    'npm pack leaked test/ directory into package tarball',
  );
  assert.ok(
    ![...packedPaths].some((p) => p.startsWith('dist/') && p !== 'dist/cli.js'),
    'npm pack leaked extraneous build artifacts from dist/ into package tarball',
  );

  // Verify package.json metadata and version bump contract
  const pkg = JSON.parse(read('package.json')) as PackageJson;
  assert.equal(
    pkg.version,
    '0.2.0',
    `package.json version '${pkg.version}' must be bumped to '0.2.0' per Requirement R3`,
  );
  assert.equal(
    packData.version,
    '0.2.0',
    `npm pack tarball version '${packData.version}' must be '0.2.0', got '${packData.version}'`,
  );
});

test('Tier 4: TC-E2E-T4-03 - public infrastructure guardrail validation', () => {
  const pkg = JSON.parse(read('package.json')) as PackageJson;

  // Rule 2: Umbrella brand hierarchy under @humanoiselabs
  assert.equal(
    pkg.name,
    '@humanoiselabs/plus62',
    `Package name must remain '@humanoiselabs/plus62' under HumanoiseLABS umbrella`,
  );
  const repoUrl = typeof pkg.repository === 'object' ? pkg.repository?.url : pkg.repository;
  if (repoUrl) {
    assert.match(
      repoUrl,
      /github\.com\/humanoiseLABS\//i,
      'Repository URL must point to HumanoiseLABS umbrella organization',
    );
  }

  // Rule 1: No unconfirmed automated publish or push scripts in package.json
  const scripts = pkg.scripts || {};
  const forbiddenScriptNames = [
    'publish:auto',
    'deploy:auto',
    'push:auto',
    'release:auto',
    'ci:publish',
  ];

  for (const forbidden of forbiddenScriptNames) {
    assert.equal(
      scripts[forbidden],
      undefined,
      `Forbidden automated script '${forbidden}' found in package.json`,
    );
  }

  // Exhaustive script scan: No script in package.json may run unconfirmed git push or npm publish
  for (const [scriptName, cmd] of Object.entries(scripts)) {
    assert.doesNotMatch(
      cmd,
      /npm\s+publish(?!.*--dry-run)/,
      `Script '${scriptName}' must not run unilateral npm publish without --dry-run`,
    );
    assert.doesNotMatch(
      cmd,
      /git\s+push/,
      `Script '${scriptName}' must not run unilateral git push`,
    );
  }

  // Exhaustive CI workflow scan: No workflow in .github/workflows may run unconfirmed push or publish
  const workflowsDir = join(root, '.github', 'workflows');
  if (existsSync(workflowsDir)) {
    const workflowFiles = readdirSync(workflowsDir).filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    for (const wfFile of workflowFiles) {
      const content = readFileSync(join(workflowsDir, wfFile), 'utf8');
      assert.doesNotMatch(
        content,
        /npm\s+publish(?!.*--dry-run)/,
        `Workflow '${wfFile}' must not run unconfirmed npm publish`,
      );
      assert.doesNotMatch(
        content,
        /git\s+push/,
        `Workflow '${wfFile}' must not run unconfirmed git push`,
      );
    }
  }
});
