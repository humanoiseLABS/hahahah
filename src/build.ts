import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { parse } from 'yaml';
import { FakeAdapter } from './adapters/fake.ts';
import { GenericHarnessAdapter } from './adapters/generic.ts';
import type { Adapter } from './adapters/adapter.ts';
import { HARNESS_SPECS, harnessSpec } from './harnesses.ts';
import { evaluateBudget, type BudgetSpec } from './budget.ts';
import { validate } from './schema.ts';
import { countTokens, TOKENIZER_PROFILE } from './tokenizer.ts';
import type {
  Artifact,
  BudgetReport,
  CultureFile,
  Manifest,
  MeasuredArtifact,
  MemeFile,
  Persona,
  PersonaLexicon,
  Profile,
  RegisterFile,
} from './types.ts';

// The harness table is the registry. Adding an agent is a row in src/harnesses.ts, not a class —
// and test/adapter-coverage.test.ts fails CI if a row appears here without a documented path, a
// verification status and an install round-trip.
const ADAPTERS: Record<string, (scope: HarnessScope) => Adapter> = {
  fake: () => new FakeAdapter(),
  ...Object.fromEntries(
    HARNESS_SPECS.map((spec) => [
      spec.id,
      (scope: HarnessScope) => new GenericHarnessAdapter(spec, scope),
    ]),
  ),
};

export type HarnessScope = 'workspace' | 'global';

export function adapterIds(): string[] {
  return Object.keys(ADAPTERS);
}

const CORE_POLICY_FILES = ['00-identity.md', '10-safety.md', '20-decision.md', '30-efficiency.md'];

const HARD_CAPS = {
  always_on: 600,
  skill_metadata: 120,
  skill_body: 2000,
  references: 5000,
} as const;

export interface BuildOptions {
  root: string;
  profileId: string;
  adapterId: string;
  outDir?: string;
  release?: boolean;
  write?: boolean;
  scope?: HarnessScope;
}

export interface BuildResult {
  outDir: string;
  manifest: Manifest;
  artifacts: MeasuredArtifact[];
  warnings: string[];
}

export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildError';
  }
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function readText(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

function readYaml(path: string): unknown {
  return parse(readText(path));
}

function resolveInside(base: string, child: string): string {
  const basePath = resolve(base);
  const target = resolve(basePath, child);
  const prefix = basePath.endsWith(sep) ? basePath : `${basePath}${sep}`;
  if (target !== basePath && !target.startsWith(prefix)) {
    throw new BuildError(`Refusing path outside ${relative(process.cwd(), basePath)}: ${child}`);
  }
  return target;
}

function readNonEmpty(path: string, label: string): string {
  const value = readText(path).trim();
  if (!value) {
    throw new BuildError(`${label} is empty: ${path}`);
  }
  return value;
}

function loadProfile(root: string, id: string): Profile {
  const path = join(root, 'profiles', `${id}.yaml`);
  const data = readYaml(path);
  validate('profile', data, `profiles/${id}.yaml`, root);
  return data as Profile;
}

function loadPersona(root: string, id: string): Persona {
  const path = join(root, 'personas', id, 'persona.yaml');
  const data = readYaml(path);
  validate('persona', data, `personas/${id}/persona.yaml`, root);
  return data as Persona;
}

function loadPersonaLexicon(root: string, persona: Persona): PersonaLexicon {
  const path = resolveInside(join(root, 'personas', persona.id), persona.lexicon);
  const data = readYaml(path);
  validate('lexicon', data, `personas/${persona.id}/${persona.lexicon}`, root);
  const lexicon = data as PersonaLexicon;
  if (lexicon.persona !== persona.id) {
    throw new BuildError(`Lexicon persona ${lexicon.persona} does not match ${persona.id}`);
  }
  return lexicon;
}

type ParsedCulture = CultureFile | MemeFile | RegisterFile;

interface ReviewableCulture {
  reviewed_by: string;
  next_review: string;
  entries?: Array<{ id: string; expires: string; purpose?: string }>;
}

function loadCultureRef(
  root: string,
  ref: string,
): { path: string; content: string; parsed?: ParsedCulture } {
  const path = resolveInside(join(root, 'culture'), ref);
  const content = readNonEmpty(path, `Culture reference ${ref}`);
  const extension = extname(path).toLowerCase();
  if (extension === '.yaml' || extension === '.yml') {
    const data = readYaml(path);
    const schema = (data as { schema?: string } | null)?.schema;
    if (schema === 'hahahah.culture.lexicon/v1') {
      validate('culture', data, `culture/${ref}`, root);
      return { path: ref, content, parsed: data as CultureFile };
    }
    if (schema === 'hahahah.culture.memes/v1') {
      validate('memes', data, `culture/${ref}`, root);
      return { path: ref, content, parsed: data as MemeFile };
    }
    if (schema === 'hahahah.culture.registers/v1') {
      validate('registers', data, `culture/${ref}`, root);
      return { path: ref, content, parsed: data as RegisterFile };
    }
    throw new BuildError(`Unknown culture schema in culture/${ref}`);
  }
  return { path: ref, content };
}

function reviewIssues(
  persona: Persona,
  cultureFiles: CultureFile[],
  memeFiles: MemeFile[],
  registerFiles: RegisterFile[],
): string[] {
  const issues: string[] = [];
  for (const [name, state] of Object.entries(persona.reviews)) {
    if (name !== 'reviewed_at' && state !== 'approved') {
      issues.push(`persona ${persona.id}: ${name} review is ${String(state)}`);
    }
  }
  for (const culture of cultureFiles) {
    if (culture.reviewed_by !== 'approved') {
      issues.push(`culture ${culture.locale}: reviewed_by is ${culture.reviewed_by}`);
    }
  }
  for (const memes of memeFiles) {
    if (memes.reviewed_by !== 'approved') {
      issues.push(`meme notes: reviewed_by is ${memes.reviewed_by}`);
    }
  }
  for (const registers of registerFiles) {
    if (registers.reviewed_by !== 'approved') {
      issues.push(`register map ${registers.locale}: reviewed_by is ${registers.reviewed_by}`);
    }
  }
  return issues;
}

function expiryIssues(persona: Persona, reviewables: ReviewableCulture[], today: string): string[] {
  const issues: string[] = [];
  if (persona.expires < today) {
    issues.push(`persona ${persona.id} expired on ${persona.expires}`);
  }
  for (const culture of reviewables) {
    if (culture.next_review < today) {
      issues.push(`culture review expired on ${culture.next_review}`);
    }
    for (const entry of culture.entries ?? []) {
      if (entry.expires < today) {
        issues.push(`culture entry ${entry.id} expired on ${entry.expires}`);
      }
    }
  }
  return issues;
}

function renderLexicon(persona: Persona, lexicon: PersonaLexicon): string {
  const lines = [
    `# ${persona.display_name} lexicon references`,
    '',
    'Use only in the listed context; respect the cap and the global no-repetition rule.',
    '',
    ...lexicon.entries.map((entry) => {
      const cap = entry.max_per_response ?? 1;
      return `- ${entry.culture_ref}: ${entry.usage} (max ${cap} per response)`;
    }),
  ];
  return lines.join('\n');
}

function measure(artifacts: Artifact[]): MeasuredArtifact[] {
  return artifacts.map((artifact) => {
    const content = artifact.content.replace(/\r\n/g, '\n');
    return {
      ...artifact,
      content,
      tokens: countTokens(content),
      sha256: sha256(content),
    };
  });
}

function sumTokens(artifacts: MeasuredArtifact[], kind: Artifact['kind']): number {
  return artifacts
    .filter((artifact) => artifact.kind === kind)
    .reduce((total, artifact) => total + artifact.tokens, 0);
}

function skillFrontmatterTokens(artifacts: MeasuredArtifact[]): number {
  const skill = artifacts.find((artifact) => artifact.path.endsWith('/SKILL.md'));
  if (!skill) {
    return 0;
  }
  const frontmatter = skill.content.match(/^---\n[\s\S]*?\n---\n/);
  return frontmatter ? countTokens(frontmatter[0]) : 0;
}

function skillMetadataTokens(artifacts: MeasuredArtifact[]): number {
  return sumTokens(artifacts, 'skill_metadata') + skillFrontmatterTokens(artifacts);
}

function contentHash(artifacts: MeasuredArtifact[]): string {
  const hash = createHash('sha256');
  for (const artifact of [...artifacts].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(artifact.path);
    hash.update('\0');
    hash.update(artifact.content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function cleanupManagedFiles(outDir: string, nextPaths: Set<string>): void {
  const manifestPath = join(outDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return;
  }
  let old: { schema?: string; files?: Array<{ path?: string }> };
  try {
    old = JSON.parse(readFileSync(manifestPath, 'utf8')) as typeof old;
  } catch {
    throw new BuildError(`Refusing to clean unreadable manifest: ${manifestPath}`);
  }
  if (old.schema !== 'hahahah.manifest/v1' || !Array.isArray(old.files)) {
    throw new BuildError(`Refusing to clean unmanaged manifest: ${manifestPath}`);
  }
  for (const file of old.files) {
    if (typeof file.path !== 'string' || nextPaths.has(file.path)) {
      continue;
    }
    const path = resolveInside(outDir, file.path);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}

function writeArtifacts(outDir: string, artifacts: MeasuredArtifact[], manifest: Manifest): void {
  for (const artifact of artifacts) {
    const path = resolveInside(outDir, artifact.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, artifact.content, 'utf8');
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function makeWarnings(
  persona: Persona,
  cultureFiles: CultureFile[],
  review: string[],
  expiry: string[],
): string[] {
  return [
    ...review.map((issue) => `pending review: ${issue}`),
    ...expiry.map((issue) => `expired: ${issue}`),
    ...cultureFiles
      .flatMap((culture) => culture.entries)
      .filter((entry) => entry.purpose === 'awareness')
      .map((entry) => `awareness-only entry: ${entry.id}`),
  ];
}

export function build(options: BuildOptions): BuildResult {
  const root = resolve(options.root);
  const profile = loadProfile(root, options.profileId);

  if (!profile.adapters.includes(options.adapterId)) {
    throw new BuildError(`Profile ${profile.id} does not declare adapter ${options.adapterId}`);
  }
  const makeAdapter = ADAPTERS[options.adapterId];
  if (!makeAdapter) {
    throw new BuildError(`Adapter ${options.adapterId} is not implemented`);
  }
  const scope = options.scope ?? 'workspace';
  const spec = harnessSpec(options.adapterId);
  if (scope === 'global') {
    // A global install is only meaningful where the vendor documents a user-level location.
    // Anything else would write a tree no agent reads and still report success.
    if (!spec?.globalOnDemandRoot) {
      throw new BuildError(
        `--scope global needs a documented user-level path: ${options.adapterId} has none (${spec ? spec.source : 'not a harness row'})`,
      );
    }
  }
  const adapter = makeAdapter(scope);

  const persona = loadPersona(root, profile.persona);
  const personaDir = join(root, 'personas', persona.id);
  const core = readNonEmpty(join(root, 'core', 'always-on.md'), 'Core always-on');
  const coreRefs = CORE_POLICY_FILES.map((name) => ({
    path: name,
    content: readNonEmpty(join(root, 'core', name), `Core policy ${name}`),
  }));
  const card = readNonEmpty(
    resolveInside(personaDir, persona.card),
    `Persona card ${persona.card}`,
  );
  const voice = readNonEmpty(
    resolveInside(personaDir, persona.voice),
    `Persona voice ${persona.voice}`,
  );
  const lexicon = loadPersonaLexicon(root, persona);
  const culture = persona.culture_refs.map((ref) => loadCultureRef(root, ref));
  const cultureFiles = culture.flatMap((ref) =>
    ref.parsed?.schema === 'hahahah.culture.lexicon/v1' ? [ref.parsed] : [],
  );
  const memeFiles = culture.flatMap((ref) =>
    ref.parsed?.schema === 'hahahah.culture.memes/v1' ? [ref.parsed] : [],
  );
  const registerFiles = culture.flatMap((ref) =>
    ref.parsed?.schema === 'hahahah.culture.registers/v1' ? [ref.parsed] : [],
  );

  const artifacts = adapter.render({
    profile,
    persona,
    core,
    card,
    voice,
    lexiconMarkdown: renderLexicon(persona, lexicon),
    coreRefs,
    cultureRefs: culture.map((ref) => ({ path: ref.path, content: ref.content })),
  });
  const measured = measure(artifacts);

  const today = new Date().toISOString().slice(0, 10);
  const review = reviewIssues(persona, cultureFiles, memeFiles, registerFiles);
  const expiry = expiryIssues(persona, [...cultureFiles, ...memeFiles, ...registerFiles], today);
  const warnings = makeWarnings(persona, cultureFiles, review, expiry);

  if (options.release && (review.length > 0 || expiry.length > 0)) {
    throw new BuildError(`Release build blocked:\n${[...review, ...expiry].join('\n')}`);
  }

  const budgetSpecs: Record<
    'always_on' | 'skill_metadata' | 'skill_body' | 'references',
    BudgetSpec
  > = {
    // A folded block carries the whole voice, so the card-sized global numbers no longer
    // describe it and the harness row states its own target and ceiling instead.
    always_on: {
      target: spec?.alwaysOnTarget ?? profile.budgets.always_on_tokens,
      hardCap: spec?.alwaysOnHardCap ?? HARD_CAPS.always_on,
    },
    skill_metadata: {
      target: profile.budgets.skill_metadata_tokens,
      hardCap: HARD_CAPS.skill_metadata,
    },
    skill_body: { target: profile.budgets.skill_body_tokens, hardCap: HARD_CAPS.skill_body },
    references: { target: profile.budgets.reference_tokens_max, hardCap: HARD_CAPS.references },
  };
  if (spec?.layout === 'fold') {
    warnings.push(
      `folded layout: ${spec.id} has no on-demand layer, so the full voice is injected on every turn (always_on ceiling ${spec.alwaysOnHardCap})`,
    );
  }
  const budgets = {
    always_on: evaluateBudget(budgetSpecs.always_on, sumTokens(measured, 'always_on')),
    skill_metadata: evaluateBudget(budgetSpecs.skill_metadata, skillMetadataTokens(measured)),
    skill_body: evaluateBudget(
      budgetSpecs.skill_body,
      Math.max(0, sumTokens(measured, 'skill_body') - skillFrontmatterTokens(measured)),
    ),
    references: evaluateBudget(budgetSpecs.references, sumTokens(measured, 'reference')),
  };
  const failedBudgets = Object.entries(budgets)
    .filter(([, report]) => report.status === 'error')
    .map(([name, report]) => `${name}: ${report.tokens} > hard cap ${report.hardCap}`);

  if (failedBudgets.length > 0) {
    throw new BuildError(`Token budget exceeded:\n${failedBudgets.join('\n')}`);
  }

  for (const [name, report] of Object.entries(budgets)) {
    if (report.status === 'warning') {
      warnings.push(
        `token target exceeded: ${name} ${report.tokens}/${report.target} (hard cap ${report.hardCap})`,
      );
    }
  }

  const version = (() => {
    try {
      return (
        (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version?: string })
          .version ?? '0.0.0'
      );
    } catch {
      return '0.0.0';
    }
  })();

  const manifest: Manifest = {
    schema: 'hahahah.manifest/v1',
    generated_by: `hahahah@${version}`,
    profile: profile.id,
    persona: persona.id,
    adapter: adapter.id,
    generated_at: new Date().toISOString(),
    content_hash: contentHash(measured),
    tokenizer: TOKENIZER_PROFILE,
    release: options.release === true,
    files: [...measured]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((artifact) => ({
        path: artifact.path,
        sha256: artifact.sha256,
        tokens: artifact.tokens,
      })),
    budgets: budgets as Record<
      'always_on' | 'skill_metadata' | 'skill_body' | 'references',
      BudgetReport
    >,
    warnings,
  };

  validate('manifest', manifest, 'generated manifest', root);

  const outDir = options.outDir ?? join(root, '.hahahah', 'build', adapter.id);
  if (options.write !== false) {
    if (existsSync(outDir) && !existsSync(join(outDir, 'manifest.json'))) {
      let entries: string[] = [];
      try {
        entries = readdirSync(outDir);
      } catch {
        entries = [];
      }
      if (entries.length > 0) {
        throw new BuildError(`Refusing to write into non-empty unmanaged directory: ${outDir}`);
      }
    }
    cleanupManagedFiles(outDir, new Set(measured.map((artifact) => artifact.path)));
    writeArtifacts(outDir, measured, manifest);
  }

  return { outDir, manifest, artifacts: measured, warnings };
}
