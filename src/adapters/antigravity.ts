import type { Artifact } from '../types.ts';
import type { Adapter, AdapterInput } from './adapter.ts';

// Evidence for this layout, from https://antigravity.google/docs/rules/ (fetched 2026-11-04):
// - workspace rules live in `AGENTS.md`, `GEMINI.md`, or `.agents/rules/*.md`; global rules live
//   in `~/.gemini/config/rules/*.md`. Nothing under `.claude/` is read, so the skill tree the
//   other adapters emit would be dead weight here.
// - a file inside `rules/` needs a `trigger` in its frontmatter. `always_on` injects the whole
//   file every turn; `model_decision` injects only the `description` until the model opens it.
//   That is the same progressive disclosure the Agent Skills adapters get from SKILL.md, so the
//   voice ships always_on and the reference material ships model_decision.
// - documented ceiling is 24KB per file and a 20k-token rule budget; the always_on payload here
//   is the card plus one voice file, far inside it.
const RULES_DIR = '.agents/rules';

function ruleName(skillName: string, suffix: string): string {
  return `${skillName}-${suffix}`.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function alwaysOn(trigger: 'always_on'): string {
  return `---\ntrigger: ${trigger}\n---\n`;
}

function byModelDecision(description: string): string {
  return `---\ntrigger: model_decision\ndescription: ${description}\n---\n`;
}

export class AntigravityAdapter implements Adapter {
  readonly id = 'antigravity';

  readonly capabilities = {
    alwaysOnInstructions: true,
    onDemandSkills: false,
    progressiveDisclosure: true,
    managedBlock: true,
    toolPermissions: false,
    hooks: false,
  };

  render(input: AdapterInput): Artifact[] {
    const skillName = `hahahah-${input.persona.id}`;
    const block = [
      `<!-- hahahah:begin profile=${input.profile.id} version=${input.persona.version} -->`,
      input.core.trim(),
      '',
      input.card.trim(),
      '',
      `Voice detail, lexicon, kebijakan penuh, dan referensi budaya ada di \`${RULES_DIR}/\` sebagai rules; yang selalu termuat cuma voice.`,
      '<!-- hahahah:end -->',
      '',
    ].join('\n');

    const voice = [alwaysOn('always_on'), '', input.voice.trim(), ''].join('\n');

    const lexicon = [
      byModelDecision(
        `"HAHahah ${input.persona.display_name} lexicon: Indonesian slang, register, and internet-culture terms."`,
      ),
      '',
      input.lexiconMarkdown.trim(),
      '',
    ].join('\n');

    const coreRules = input.coreRefs.map((reference) => ({
      path: `${RULES_DIR}/${ruleName(skillName, `core-${reference.path}`)}`,
      content: [
        byModelDecision(
          `"HAHahah core policy ${reference.path}: identity, safety, decision, efficiency rules that outrank persona tone."`,
        ),
        '',
        reference.content.trim(),
        '',
      ].join('\n'),
      kind: 'reference' as const,
    }));

    const cultureRules = input.cultureRefs.map((reference) => ({
      path: `${RULES_DIR}/${ruleName(skillName, `culture-${reference.path}`)}`,
      content: [
        byModelDecision(
          `"HAHahah culture reference ${reference.path}: Indonesian humor boundaries, memes, registers, religious-expression etiquette."`,
        ),
        '',
        reference.content.trim(),
        '',
      ].join('\n'),
      kind: 'reference' as const,
    }));

    return [
      { path: 'AGENTS.md', content: block, kind: 'always_on' },
      {
        path: `${RULES_DIR}/${ruleName(skillName, 'voice.md')}`,
        content: voice,
        kind: 'skill_body',
      },
      {
        path: `${RULES_DIR}/${ruleName(skillName, 'lexicon.md')}`,
        content: lexicon,
        kind: 'reference',
      },
      ...coreRules,
      ...cultureRules,
    ];
  }
}
