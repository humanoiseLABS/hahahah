import type { Artifact, Persona, Profile } from '../types.ts';

export interface AdapterInput {
  profile: Profile;
  persona: Persona;
  core: string;
  card: string;
  voice: string;
  lexiconMarkdown: string;
  coreRefs: Array<{ path: string; content: string }>;
  cultureRefs: Array<{ path: string; content: string }>;
}

export interface Adapter {
  readonly id: string;
  readonly capabilities: {
    alwaysOnInstructions: boolean;
    onDemandSkills: boolean;
    progressiveDisclosure: boolean;
    managedBlock: boolean;
    toolPermissions: boolean;
    hooks: boolean;
  };
  render(input: AdapterInput): Artifact[];
}
