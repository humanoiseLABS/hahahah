import type { Artifact } from '../types.ts';
import type { Adapter, AdapterInput } from './adapter.ts';

export class FakeAdapter implements Adapter {
  readonly id = 'fake';

  readonly capabilities = {
    alwaysOnInstructions: true,
    onDemandSkills: true,
    progressiveDisclosure: true,
    managedBlock: false,
    toolPermissions: false,
    hooks: false,
  };

  render(input: AdapterInput): Artifact[] {
    const metadata = JSON.stringify(
      {
        name: `hahahah-${input.persona.id}`,
        description: `${input.persona.display_name} persona for ${input.persona.locale} coding work`,
      },
      null,
      2,
    );

    return [
      {
        path: 'always-on.md',
        content: `${input.core.trim()}\n\n${input.card.trim()}\n`,
        kind: 'always_on',
      },
      {
        path: 'skill-metadata.json',
        content: `${metadata}\n`,
        kind: 'skill_metadata',
      },
      {
        path: 'references/voice.md',
        content: `${input.voice.trim()}\n`,
        kind: 'skill_body',
      },
      {
        path: 'references/lexicon.md',
        content: `${input.lexiconMarkdown.trim()}\n`,
        kind: 'reference',
      },
      ...input.coreRefs.map((reference) => ({
        path: `references/core/${reference.path}`,
        content: `${reference.content.trim()}\n`,
        kind: 'reference' as const,
      })),
      ...input.cultureRefs.map((reference) => ({
        path: `references/culture/${reference.path}`,
        content: `${reference.content.trim()}\n`,
        kind: 'reference' as const,
      })),
    ];
  }
}
