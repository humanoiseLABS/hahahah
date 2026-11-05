// One row per coding agent. This file is data only: it decides *where* artifacts land and *which*
// on-demand mechanism the target has, never what the persona says. That stays in the canonical
// content, so a row can be reviewed against a vendor document without reading any rendering code.
//
// `status` is deliberately separate from `source`. `source` is where the expectation came from;
// `status` is what has actually been observed on a machine. Most rows are documented but never
// seen loading, and saying so is the difference between a compatibility claim and a promise.

export type HarnessLayout = 'skill-tree' | 'rules-dir' | 'fold';

export interface HarnessSpec {
  id: string;
  /** How the target exposes its detailed layer, and therefore how much we can offload. */
  layout: HarnessLayout;
  /** The file that holds the always-on managed block. */
  blockPath: string;
  /** Project-level directory for the on-demand layer; null when the target has none. */
  onDemandRoot: string | null;
  /** Where the same files go for a user-level install, when the target documents one. */
  globalOnDemandRoot: string | null;
  /**
   * A folded block carries the full voice every turn, so the global card-sized target and ceiling
   * cannot apply. Fold rows must state both, or the ledger would silently pass numbers that no
   * longer describe what is actually being injected.
   */
  alwaysOnTarget: number | null;
  alwaysOnHardCap: number | null;
  status: 'verified on this machine' | 'documented, not verified';
  source: string;
  /** Anything a reader must know before trusting this row. */
  notes: string[];
}

export const HARNESS_SPECS: HarnessSpec[] = [
  {
    id: 'claude-code',
    layout: 'skill-tree',
    blockPath: 'CLAUDE.md',
    onDemandRoot: '.claude/skills',
    globalOnDemandRoot: null,
    alwaysOnTarget: null,
    alwaysOnHardCap: null,
    status: 'verified on this machine',
    source: 'https://code.claude.com/docs/en/skills',
    notes: [
      'Reference target: install, doctor, uninstall, headless run and permission posture all measured here.',
      'Docs list AGENTS.md only as a fallback when no CLAUDE.md exists, so the block belongs in CLAUDE.md.',
    ],
  },
  {
    id: 'opencode',
    layout: 'skill-tree',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.claude/skills',
    globalOnDemandRoot: null,
    alwaysOnTarget: null,
    alwaysOnHardCap: null,
    status: 'verified on this machine',
    source:
      'opencode 1.18.31: `debug skill` listed the installed skill; a live run echoed the AGENTS.md marker',
    notes: [
      'opencode discovers the Claude-compatible skill tree, so reusing .claude/skills avoids a second copy under .opencode/.',
      'Permissions are NOT written here: opencode defaults the build agent to "*": allow, and dropping an opencode.json into a user repo would silently widen what an install does. The study posture lives in the runner instead (OPENCODE_CONFIG).',
    ],
  },
  {
    id: 'agents-md',
    layout: 'skill-tree',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.agents/skills',
    globalOnDemandRoot: null,
    alwaysOnTarget: null,
    alwaysOnHardCap: null,
    status: 'documented, not verified',
    source: 'https://agentskills.io/specification',
    notes: [
      'Vendor-neutral target for Codex and Cursor, both of which document .agents/skills.',
      'No Cursor or Codex run on this machine has read the output; the paths follow the published standard.',
    ],
  },
  {
    id: 'antigravity',
    layout: 'rules-dir',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.agents/rules',
    globalOnDemandRoot: 'config/rules',
    alwaysOnTarget: null,
    alwaysOnHardCap: null,
    status: 'documented, not verified',
    source: 'https://antigravity.google/docs/rules/',
    notes: [
      'Rules files need a `trigger` in frontmatter: always_on injects the whole file every turn, model_decision injects only its description until the model opens it.',
      'Documented ceilings are 24KB per file and a 20k-token rule budget; nothing here approaches them.',
      '`opencode debug agent` style introspection does not reflect this layout, so loading has never been observed.',
    ],
  },
  {
    id: 'qoder',
    layout: 'skill-tree',
    blockPath: 'AGENTS.md',
    onDemandRoot: '.qoder/skills',
    globalOnDemandRoot: null,
    alwaysOnTarget: null,
    alwaysOnHardCap: null,
    status: 'documented, not verified',
    source: 'https://docs.qoder.com/cli/Skills',
    notes: [
      'Docs give memory as <project>/AGENTS.md plus .qoder/rules/, and skills as .qoder/skills/<name>/SKILL.md.',
      'The skills page does not claim adherence to the open Agent Skills standard, and auto-trigger is unverified; user-level skills also override project-level ones on a name clash.',
      'Qoder Desktop was not on PATH for any run in this repository, so no Qoder integration has been executed.',
    ],
  },
  {
    id: 'copilot',
    layout: 'fold',
    blockPath: '.github/copilot-instructions.md',
    onDemandRoot: null,
    globalOnDemandRoot: null,
    // core + card + voice measured at 2342 tokens on rusuh-id; the global 600 ceiling describes a
    // card-only block and would be a lie here.
    alwaysOnTarget: 2400,
    alwaysOnHardCap: 3000,
    status: 'documented, not verified',
    source:
      'https://docs.github.com/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot',
    notes: [
      'AGENTS.md is supported for the coding agent (github.blog changelog 2025-08-28), but skill support is not documented, so the voice has nowhere to live except the instructions file itself.',
      'Precedence is the reason this is not the reference target: personal instructions outrank repository instructions, so a safety-sensitive layer cannot rely on being the last word.',
      'Folding costs the full voice on every turn — the build warns about it rather than hiding it.',
    ],
  },
];

export function harnessSpec(id: string): HarnessSpec | undefined {
  return HARNESS_SPECS.find((spec) => spec.id === id);
}
