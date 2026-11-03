export type ReviewState = 'pending' | 'approved' | 'rejected';

export interface Profile {
  schema: 'hahahah.profile/v1';
  id: string;
  persona: string;
  locale: string;
  intensity: 'low' | 'medium' | 'high';
  core: string;
  budget_profile: string;
  adapters: string[];
  budgets: {
    always_on_tokens: number;
    skill_metadata_tokens: number;
    skill_body_tokens: number;
    reference_tokens_max: number;
  };
}

export interface Persona {
  schema: 'hahahah.persona/v1';
  id: string;
  version: string;
  display_name: string;
  locale: string;
  intensity: 'low' | 'medium' | 'high';
  register: string;
  voice: string;
  card: string;
  lexicon: string;
  culture_refs: string[];
  budgets: { always_on_tokens: number; skill_body_tokens: number };
  safety_profile: string;
  reviews: {
    linguistic: ReviewState;
    cultural: ReviewState;
    safety: ReviewState;
    reviewed_at: string | null;
  };
  expires: string;
}

export interface CultureSource {
  url: string;
  note: string;
}

export interface CultureEntry {
  id: string;
  term: string;
  gloss: string;
  register: 'informal' | 'neutral' | 'formal';
  regions: string[];
  decay_class:
    'global-meme' | 'local-slang' | 'kbbi-colloquial' | 'aging-ironic' | 'dated' | 'banned';
  offensiveness: 'none' | 'low' | 'medium' | 'high' | 'banned';
  contexts: string[];
  avoid_when: string[];
  max_per_response: number;
  expires: string;
  confidence: 'low' | 'medium' | 'high';
  purpose?: 'usage' | 'awareness';
  sources: CultureSource[];
}

export interface CultureFile {
  schema: 'hahahah.culture.lexicon/v1';
  locale: string;
  version: string;
  reviewed_by: string;
  next_review: string;
  entries: CultureEntry[];
}

export interface MemeEntry {
  id: string;
  pattern: string;
  context: string[];
  avoid_when: string[];
  expires: string;
  note: string;
}

export interface MemeFile {
  schema: 'hahahah.culture.memes/v1';
  version: string;
  reviewed_by: string;
  next_review: string;
  entries: MemeEntry[];
}

export interface RegisterFile {
  schema: 'hahahah.culture.registers/v1';
  locale: string;
  version: string;
  reviewed_by: string;
  next_review: string;
}

export interface PersonaLexicon {
  schema: 'hahahah.lexicon/v1';
  persona: string;
  version: string;
  entries: Array<{ culture_ref: string; usage: string; max_per_response?: number }>;
}

export type ArtifactKind = 'always_on' | 'skill_metadata' | 'skill_body' | 'reference';

export interface Artifact {
  path: string;
  content: string;
  kind: ArtifactKind;
}

export interface MeasuredArtifact extends Artifact {
  tokens: number;
  sha256: string;
}

export interface BudgetReport {
  target: number;
  hardCap: number;
  tokens: number;
  status: 'ok' | 'warning' | 'error';
}

export interface ManifestFile {
  path: string;
  sha256: string;
  tokens: number;
}

export interface InstallManifest {
  schema: 'hahahah.install/v1';
  generated_by: string;
  profile: string;
  persona: string;
  adapter: string;
  installed_at: string;
  files: ManifestFile[];
  block: { path: 'CLAUDE.md'; sha256: string };
  created_claude_md: boolean;
}

export interface Manifest {
  schema: 'hahahah.manifest/v1';
  generated_by: string;
  profile: string;
  persona: string;
  adapter: string;
  generated_at: string;
  content_hash: string;
  tokenizer: string;
  release: boolean;
  files: ManifestFile[];
  budgets: {
    always_on: BudgetReport;
    skill_metadata: BudgetReport;
    skill_body: BudgetReport;
    references: BudgetReport;
  };
  warnings: string[];
}
