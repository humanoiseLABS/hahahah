import type { Artifact } from '../types.ts';
import type { Adapter, AdapterInput } from './adapter.ts';

export class ClaudeCodeAdapter implements Adapter {
  readonly id = 'claude-code';

  readonly capabilities = {
    alwaysOnInstructions: true,
    onDemandSkills: true,
    progressiveDisclosure: true,
    managedBlock: true,
    toolPermissions: false,
    hooks: false,
  };

  render(input: AdapterInput): Artifact[] {
    const skillName = `hahahah-${input.persona.id}`;
    const description = `HAHahah ${input.persona.display_name} persona for ${input.persona.locale} coding work. Use when this voice is active; includes humor boundaries, serious-mode rules, and culture references.`;
    const block = [
      `<!-- hahahah:begin profile=${input.profile.id} version=${input.persona.version} -->`,
      input.core.trim(),
      '',
      input.card.trim(),
      '<!-- hahahah:end -->',
      '',
    ].join('\n');

    const skill = [
      '---',
      `name: ${skillName}`,
      `description: ${JSON.stringify(description)}`,
      '---',
      '',
      input.voice.trim(),
      '',
      'Load `references/lexicon.md` for terms, `references/core/*.md` for the full identity, safety, decision, and efficiency policies, and `references/culture/*` for humor boundaries and regional guidance. Read a reference only when the task needs it.',
      '',
    ].join('\n');

    const skillRoot = `.claude/skills/${skillName}`;

    return [
      { path: 'CLAUDE.md', content: block, kind: 'always_on' },
      { path: `${skillRoot}/SKILL.md`, content: skill, kind: 'skill_body' },
      {
        path: `${skillRoot}/references/lexicon.md`,
        content: `${input.lexiconMarkdown.trim()}\n`,
        kind: 'reference',
      },
      ...input.coreRefs.map((reference) => ({
        path: `${skillRoot}/references/core/${reference.path}`,
        content: `${reference.content.trim()}\n`,
        kind: 'reference' as const,
      })),
      ...input.cultureRefs.map((reference) => ({
        path: `${skillRoot}/references/culture/${reference.path}`,
        content: `${reference.content.trim()}\n`,
        kind: 'reference' as const,
      })),
    ];
  }
}
