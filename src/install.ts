import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { build } from './build.ts';
import { validate } from './schema.ts';
import type { InstallManifest, MeasuredArtifact } from './types.ts';

const MANIFEST_PATH = '.hahahah/manifest.json';
const BLOCK_PATH = 'CLAUDE.md';
const BLOCK_BEGIN = /<!-- hahahah:begin [^\n]*-->/;
const BLOCK_END = /<!-- hahahah:end -->/;

export interface InstallOptions {
  sourceRoot: string;
  targetRoot: string;
  profileId: string;
  adapterId?: string;
  force?: boolean;
  dryRun?: boolean;
  // `global` writes to the harness's user-level location so every project inherits it. Only the
  // antigravity adapter has one today; other adapters would drop a skill tree where nothing reads
  // it, which is worse than not installing.
  scope?: 'workspace' | 'global';
}

export interface InstallResult {
  manifest: InstallManifest;
  targetRoot: string;
  warnings: string[];
  dryRun: boolean;
}

export interface DoctorReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export class InstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstallError';
  }
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function resolveInside(base: string, child: string): string {
  const basePath = resolve(base);
  const target = resolve(basePath, child);
  const prefix = basePath.endsWith(sep) ? basePath : `${basePath}${sep}`;
  if (target !== basePath && !target.startsWith(prefix)) {
    throw new InstallError(`Refusing path outside ${basePath}: ${child}`);
  }
  return target;
}

// Antigravity reads workspace rules from `.agents/rules/` and user-level rules from
// `~/.gemini/config/rules/` (https://antigravity.google/docs/rules/). The adapter renders the
// workspace form because that is what its budget and tests describe; a global install is the same
// content at the other path, so the remap belongs here rather than in a second adapter.
function remapForScope(path: string, scope: 'workspace' | 'global'): string {
  if (scope === 'workspace') return path;
  if (path.startsWith('.agents/rules/')) return `config/${path.slice('.agents/'.length)}`;
  return path;
}

function readManifest(targetRoot: string): InstallManifest | null {
  const path = join(targetRoot, MANIFEST_PATH);
  if (!existsSync(path)) {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new InstallError(`Unreadable install manifest: ${path}`);
  }
  validate('install', data, MANIFEST_PATH, process.cwd());
  return data as InstallManifest;
}

function writeAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, content, 'utf8');
  renameSync(temp, path);
}

interface ParsedBlock {
  start: number;
  end: number;
  content: string;
  hash: string;
}

function parseBlock(text: string): ParsedBlock | null {
  const begins = [...text.matchAll(new RegExp(BLOCK_BEGIN.source, 'g'))];
  const ends = [...text.matchAll(new RegExp(BLOCK_END.source, 'g'))];
  if (begins.length === 0 && ends.length === 0) {
    return null;
  }
  if (begins.length !== 1 || ends.length !== 1) {
    throw new InstallError('Malformed or duplicate HAHahah managed block markers');
  }
  const begin = begins[0];
  const end = ends[0];
  if (!begin || !end) {
    throw new InstallError('Malformed HAHahah managed block markers');
  }
  if (begin.index === undefined || end.index === undefined || end.index < begin.index) {
    throw new InstallError('Malformed HAHahah managed block order');
  }
  const endIndex = end.index + end[0].length;
  const content = text.slice(begin.index, endIndex);
  return { start: begin.index, end: endIndex, content, hash: sha256(content.trimEnd()) };
}

function blockContent(artifact: MeasuredArtifact): string {
  const text = artifact.content.replace(/\r\n/g, '\n').trimEnd();
  if (!BLOCK_BEGIN.test(text) || !BLOCK_END.test(text)) {
    throw new InstallError('Adapter did not render a valid managed block');
  }
  return `${text}\n`;
}

function installBlock(
  existing: string,
  block: string,
  old: InstallManifest | null,
  force: boolean,
): { text: string; createdFile: boolean } {
  const parsed = parseBlock(existing);
  const createdFile = existing.trim() === '';
  if (parsed) {
    if (!old && !force) {
      throw new InstallError(
        'An existing HAHahah managed block has no install manifest; use --force to replace it',
      );
    }
    if (old && old.block.sha256 !== parsed.hash && !force) {
      throw new InstallError('Managed block was modified; use --force to replace it');
    }
    const before = existing.slice(0, parsed.start);
    const after = existing.slice(parsed.end).replace(/^\n+/, '');
    const separator = before && !before.endsWith('\n') ? '\n' : '';
    const tail = after ? `\n${after}` : '';
    return { text: `${before}${separator}${block}${tail}`, createdFile };
  }
  return {
    text: `${existing.trimEnd()}${existing.trim() ? '\n\n' : ''}${block}`,
    createdFile,
  };
}

export function install(options: InstallOptions): InstallResult {
  const targetRoot = resolve(options.targetRoot);
  const adapterId = options.adapterId ?? 'claude-code';
  const built = build({
    root: options.sourceRoot,
    profileId: options.profileId,
    adapterId,
    write: false,
  });
  const blockArtifact = built.artifacts.find((artifact) => artifact.kind === 'always_on');
  if (!blockArtifact) {
    throw new InstallError(`Adapter ${adapterId} rendered no always-on managed block`);
  }
  // The block file is whatever the adapter decided to own: CLAUDE.md for Claude Code,
  // AGENTS.md for opencode. Only the marker comments are constant.
  const blockPath = blockArtifact.path;
  const scope = options.scope ?? 'workspace';
  if (scope === 'global' && adapterId !== 'antigravity') {
    throw new InstallError(
      `--scope global is only supported for the antigravity adapter; ${adapterId} writes a skill tree that no user-level path reads`,
    );
  }
  // Remap once, here, so the collision check, the manifest, doctor, and uninstall all agree on
  // the same recorded path. A manifest holding the workspace path while the file sits at the
  // global path would make uninstall leak.
  const artifactFiles = built.artifacts
    .filter((artifact) => artifact.kind !== 'always_on')
    .map((artifact) => ({ ...artifact, path: remapForScope(artifact.path, scope) }));
  const block = blockContent(blockArtifact);
  const blockHash = sha256(block.trimEnd());

  const old = readManifest(targetRoot);
  const oldFiles = new Map((old?.files ?? []).map((file) => [file.path, file]));

  for (const artifact of artifactFiles) {
    const target = resolveInside(targetRoot, artifact.path);
    if (!existsSync(target)) {
      continue;
    }
    const oldFile = oldFiles.get(artifact.path);
    if (!oldFile) {
      if (!options.force) {
        throw new InstallError(`Unmanaged file already exists: ${artifact.path}; use --force`);
      }
      continue;
    }
    if (oldFile.sha256 !== artifact.sha256 && !options.force) {
      throw new InstallError(`Managed file was modified: ${artifact.path}; use --force`);
    }
  }

  const claudePath = join(targetRoot, blockPath);
  const existingClaude = existsSync(claudePath) ? readFileSync(claudePath, 'utf8') : '';
  const merged = installBlock(existingClaude, block, old, options.force === true);
  const createdClaudeMd = merged.createdFile;

  const manifest: InstallManifest = {
    schema: 'hahahah.install/v1',
    generated_by: built.manifest.generated_by,
    profile: built.manifest.profile,
    persona: built.manifest.persona,
    adapter: built.manifest.adapter,
    installed_at: new Date().toISOString(),
    files: artifactFiles
      .map((artifact) => ({
        path: artifact.path,
        sha256: artifact.sha256,
        tokens: artifact.tokens,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    block: { path: blockPath, sha256: blockHash },
    created_claude_md: createdClaudeMd,
  };
  validate('install', manifest, 'install manifest', process.cwd());

  if (!options.dryRun) {
    for (const artifact of artifactFiles) {
      writeAtomic(resolveInside(targetRoot, artifact.path), artifact.content);
    }
    writeAtomic(claudePath, merged.text);
    writeAtomic(join(targetRoot, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return {
    manifest,
    targetRoot,
    warnings: built.warnings,
    dryRun: options.dryRun === true,
  };
}

function pruneEmptyDirs(start: string, stop: string): void {
  let current = start;
  while (current !== stop && current.startsWith(stop)) {
    try {
      if (readdirSync(current).length > 0) {
        return;
      }
      rmdirSync(current);
    } catch {
      return;
    }
    current = dirname(current);
  }
}

export function uninstall(options: {
  targetRoot: string;
  force?: boolean;
  dryRun?: boolean;
}): InstallManifest {
  const targetRoot = resolve(options.targetRoot);
  const old = readManifest(targetRoot);
  if (!old) {
    throw new InstallError(`No HAHahah install manifest at ${targetRoot}`);
  }

  const claudePath = join(targetRoot, old.block.path);
  const existingClaude = existsSync(claudePath) ? readFileSync(claudePath, 'utf8') : '';
  const parsed = parseBlock(existingClaude);
  if (parsed && parsed.hash !== old.block.sha256 && !options.force) {
    throw new InstallError('Managed block was modified; use --force to uninstall');
  }

  for (const file of old.files) {
    const target = resolveInside(targetRoot, file.path);
    if (!existsSync(target)) {
      continue;
    }
    if (sha256(readFileSync(target, 'utf8')) !== file.sha256 && !options.force) {
      throw new InstallError(`Managed file was modified: ${file.path}; use --force`);
    }
    if (!options.dryRun) {
      unlinkSync(target);
      // Prune only directories that are now empty, down to (never including) the repo root.
      // A pre-existing .claude holding user settings or other skills is non-empty and survives.
      pruneEmptyDirs(dirname(target), targetRoot);
    }
  }

  if (!options.dryRun) {
    if (parsed) {
      const remaining = `${existingClaude.slice(0, parsed.start)}${existingClaude.slice(parsed.end)}`;
      const cleaned = `${remaining.trimEnd()}${remaining.trim() ? '\n' : ''}`;
      if (old.created_claude_md && cleaned.trim() === '') {
        unlinkSync(claudePath);
      } else {
        writeAtomic(claudePath, cleaned);
      }
    }
    unlinkSync(join(targetRoot, MANIFEST_PATH));
    pruneEmptyDirs(dirname(join(targetRoot, MANIFEST_PATH)), targetRoot);
  }

  return old;
}

export function doctor(options: { targetRoot: string }): DoctorReport {
  const targetRoot = resolve(options.targetRoot);
  const errors: string[] = [];
  const warnings: string[] = [];
  const old = readManifest(targetRoot);
  if (!old) {
    return { ok: false, errors: [`No install manifest at ${targetRoot}`], warnings };
  }

  for (const file of old.files) {
    const target = resolveInside(targetRoot, file.path);
    if (!existsSync(target)) {
      errors.push(`Missing managed file: ${file.path}`);
      continue;
    }
    if (sha256(readFileSync(target, 'utf8')) !== file.sha256) {
      errors.push(`Hash mismatch: ${file.path}`);
    }
  }

  const claudePath = join(targetRoot, old.block.path);
  if (!existsSync(claudePath)) {
    errors.push(`Missing ${old.block.path}`);
  } else {
    try {
      const parsed = parseBlock(readFileSync(claudePath, 'utf8'));
      if (!parsed) {
        errors.push('CLAUDE.md has no managed block');
      } else if (parsed.hash !== old.block.sha256) {
        errors.push('CLAUDE.md managed block hash mismatch');
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const skill = old.files.find((file) => file.path.endsWith('/SKILL.md'));
  if (skill) {
    const skillPath = resolveInside(targetRoot, skill.path);
    if (existsSync(skillPath)) {
      const text = readFileSync(skillPath, 'utf8');
      const name = text.match(/^name:\s*(.+)$/m)?.[1]?.trim();
      const description = text.match(/^description:\s*(.+)$/m)?.[1]?.trim();
      if (name !== `hahahah-${old.persona}`) {
        errors.push(`SKILL.md name mismatch: ${String(name)}`);
      }
      if (!description) {
        errors.push('SKILL.md has no description');
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export { MANIFEST_PATH, BLOCK_PATH, parseBlock };
