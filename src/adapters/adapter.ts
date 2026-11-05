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
  // `capabilities` used to be declared here and read by nobody. What a target can actually do is
  // now recorded once per harness in src/harnesses.ts, where the coverage matrix can check it.
  render(input: AdapterInput): Artifact[];
}
