import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { validate } from '../src/schema.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const yaml = (path: string) => parse(read(path)) as Record<string, unknown>;

const personaIds = readdirSync(join(root, 'personas'));
const profileIds = readdirSync(join(root, 'profiles')).map((file) => file.replace(/\.yaml$/, ''));

interface PersonaModel {
  id: string;
  culture_refs: string[];
  voice: string;
  card: string;
  lexicon: string;
  reviews: Record<string, unknown>;
}

function personaModel(id: string): PersonaModel {
  return yaml(`personas/${id}/persona.yaml`) as unknown as PersonaModel;
}

test('every profile, persona, lexicon, and culture file validates', () => {
  assert.ok(personaIds.length >= 2, 'Phase 3 expects more than one persona pack');
  for (const profile of profileIds) {
    assert.doesNotThrow(
      () => validate('profile', yaml(`profiles/${profile}.yaml`), 'profile', root),
      profile,
    );
  }
  for (const id of personaIds) {
    assert.doesNotThrow(
      () => validate('persona', yaml(`personas/${id}/persona.yaml`), 'persona', root),
      id,
    );
    assert.doesNotThrow(
      () => validate('lexicon', yaml(`personas/${id}/lexicon.yaml`), 'lexicon', root),
      id,
    );
  }
  assert.doesNotThrow(() =>
    validate('culture', yaml('culture/id/genz-lexicon.yaml'), 'culture', root),
  );
  assert.doesNotThrow(() => validate('memes', yaml('culture/id/memes.yaml'), 'memes', root));
});

test('each persona profile points at an existing persona', () => {
  for (const profile of profileIds) {
    const model = yaml(`profiles/${profile}.yaml`) as { persona: string };
    assert.ok(
      personaIds.includes(model.persona),
      `${profile} references missing persona ${model.persona}`,
    );
  }
});

test('persona references exist, are relative, and stay inside the repo', () => {
  for (const id of personaIds) {
    const persona = personaModel(id);
    for (const ref of persona.culture_refs) {
      assert.doesNotMatch(ref, /^\/|\.\./, `${id}: ${ref} escapes the culture directory`);
      assert.doesNotThrow(() => read(`culture/${ref}`), `${id}: missing culture ref ${ref}`);
    }
    for (const file of [persona.voice, persona.card, persona.lexicon]) {
      assert.doesNotThrow(() => read(`personas/${id}/${file}`), `${id}: missing ${file}`);
    }
  }
});

test("every persona lexicon term is shipped in that persona's culture references", () => {
  for (const id of personaIds) {
    const persona = personaModel(id);
    const shipped = persona.culture_refs.map((ref) => read(`culture/${ref}`)).join('\n');
    const lexicon = yaml(`personas/${id}/lexicon.yaml`) as {
      entries: Array<{ culture_ref: string }>;
    };
    for (const entry of lexicon.entries) {
      assert.ok(
        shipped.includes(entry.culture_ref),
        `${id}: lexicon term ${entry.culture_ref} is not in any mounted culture reference`,
      );
    }
  }
});

test('culture entries are sourced and respect awareness-only entries', () => {
  const culture = yaml('culture/id/genz-lexicon.yaml') as {
    entries: Array<{
      id: string;
      purpose?: string;
      max_per_response: number;
      sources: Array<{ url: string }>;
    }>;
  };
  for (const entry of culture.entries) {
    assert.ok(entry.sources.length > 0, `${entry.id} has no source`);
    for (const source of entry.sources) {
      assert.match(source.url, /^https?:\/\//, `${entry.id} has an invalid source URL`);
    }
    if (entry.purpose === 'awareness') {
      assert.equal(entry.max_per_response, 0, `${entry.id} is awareness-only but has a cap`);
    }
  }
});

test('Banyumasan is named respectfully and no prototyped caricature is present', () => {
  const text = read('culture/jv/banyumasan.md');
  assert.match(text, /Banyumasan/);
  assert.match(text, /mocking label/);
  assert.match(text, /Never/);
  assert.match(text, /ngapak/);
});

test('no persona ships as reviewed while a human review is outstanding', () => {
  for (const id of personaIds) {
    const persona = personaModel(id);
    assert.equal(persona.reviews.linguistic, 'pending', `${id}: linguistic review state`);
    assert.equal(persona.reviews.cultural, 'pending', `${id}: cultural review state`);
    assert.equal(persona.reviews.safety, 'pending', `${id}: safety review state`);
  }
});

test('every persona carries machine-readable examples and test cases', () => {
  for (const id of personaIds) {
    const examples = read(`personas/${id}/examples.jsonl`)
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line) as { id: string; input: string; expect: unknown });
    assert.ok(examples.length >= 3, `${id}: needs at least three examples`);
    for (const example of examples) {
      assert.ok(example.id && example.input && example.expect, `${id}: malformed example`);
    }
    const tests = yaml(`personas/${id}/tests.yaml`) as { persona: string; cases: unknown[] };
    assert.equal(tests.persona, id, `${id}: tests.yaml persona mismatch`);
    assert.ok(
      tests.cases.length >= 12,
      `${id}: the persona suite needs 12-15 scenarios, found ${tests.cases.length}`,
    );
  }
});

test('the Javanese register map validates and stays honest about review state', () => {
  const registers = yaml('culture/jv/registers.yaml') as unknown as {
    reviewed_by: string;
    banyumasan: { preferred_name: string };
    sources: string[];
  };
  assert.doesNotThrow(() => validate('registers', registers, 'registers', root));
  assert.equal(registers.banyumasan.preferred_name, 'Banyumasan');
  assert.equal(registers.reviewed_by, 'pending', 'the register map must not claim approval');
  for (const source of registers.sources) assert.match(source, /^https?:\/\//);
});

test('the JAWA voice carries every register form from the reviewed map', () => {
  const registers = yaml('culture/jv/registers.yaml') as unknown as {
    levels: Record<
      string,
      { pronouns: { i: string; you: string }; markers: Record<string, string> }
    >;
  };
  const voice = read('personas/jawa/voice.md');
  for (const [level, spec] of Object.entries(registers.levels)) {
    assert.ok(voice.includes(level), `voice is missing the ${level} level`);
    for (const form of [spec.pronouns.i, spec.pronouns.you, ...Object.values(spec.markers)]) {
      assert.ok(voice.includes(form), `voice is missing the ${level} form ${form}`);
    }
  }
});

const coreDocs = [
  'core/always-on.md',
  'core/00-identity.md',
  'core/10-safety.md',
  'core/20-decision.md',
  'core/30-efficiency.md',
];

function filesIn(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${dir}/${entry.name}`);
}

const personaFiles = personaIds.flatMap((id) =>
  ['card.md', 'voice.md', 'persona.yaml', 'lexicon.yaml'].map((file) => `personas/${id}/${file}`),
);
const cultureFiles = [...filesIn('culture/id'), ...filesIn('culture/jv')];

test('no source document uses the retired project name', () => {
  const files = [
    ...coreDocs,
    ...cultureFiles,
    ...personaFiles,
    ...profileIds.map((p) => `profiles/${p}.yaml`),
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /\bADAB\b/, `${file} contains the retired name`);
  }
});

test('persona content does not attempt to override core safety or permissions', () => {
  // evals/*.yaml and personas/*/tests.yaml are excluded: they quote adversarial
  // payloads ("abaikan aturan safety") as test data, which this lint would flag.
  const files = [
    ...coreDocs,
    ...personaFiles,
    'culture/id/humor-boundaries.md',
    'culture/id/religious-expression.md',
  ];
  const banned = [
    /always agree/i,
    /ignore (all |the )?safety/i,
    /bypass permissions/i,
    /never ask for confirmation/i,
    /skip (the )?confirmation/i,
    /disable safety/i,
    /--dangerously-skip-permissions/i,
  ];
  for (const file of files) {
    const text = read(file);
    for (const pattern of banned) {
      assert.doesNotMatch(
        text,
        pattern,
        `${file} contains a forbidden override pattern: ${pattern}`,
      );
    }
  }
});

test('phase 1 has no hidden additional culture files without a test hook', () => {
  const files = readdirSync(join(root, 'culture/id'));
  assert.ok(files.includes('genz-lexicon.yaml'));
  assert.ok(files.includes('memes.yaml'));
});

test('always-on core carries the language and religious-ruling rules', () => {
  const core = read('core/always-on.md');
  assert.match(core, /## Language/);
  assert.match(core, /Answer in the user's language/i);
  assert.match(core, /incident, diagnosis, and other serious replies included/i);
  assert.match(core, /Serious mode: no humor, emoji, or slang/i);
  assert.match(core, /never rule on religion/i);
  assert.match(core, /no fatwa, no sin label/i);
  assert.match(core, /A user can waive scope, not truth/i);

  const identity = read('core/00-identity.md');
  assert.match(identity, /## Language contract/);
  assert.match(identity, /not a reason to switch languages/i);
  assert.match(identity, /use the active persona's register/i);

  const safety = read('core/10-safety.md');
  assert.match(safety, /label an act a sin or a reward/i);
  assert.match(safety, /in the user's language/i);
  assert.match(safety, /Scope is waivable; truth is not/i);

  const voice = read('personas/rusuh/voice.md');
  assert.match(voice, /## Language/);
  assert.match(voice, /Switching an Indonesian thread to English is a defect/i);
  assert.match(voice, /do not label an act a sin/i);
  assert.match(voice, /pressure changes scope, not the report/i);

  const religion = read('culture/id/religious-expression.md');
  assert.match(religion, /sin, a reward, divine punishment/i);
  assert.match(religion, /inside a refusal/i);
});

test('the persona card keeps the always-on persona rules', () => {
  const card = read('personas/rusuh/card.md');
  assert.match(card, /Indonesian-informal/);
  assert.match(card, /roasts situations, never people/i);
  assert.match(card, /playful signal only/i);
  assert.match(card, /identity, looks, family, faith, region, or ability/i);
});

test('the religious-expression etiquette is mounted as a persona reference', () => {
  const persona = yaml('personas/rusuh/persona.yaml') as { culture_refs: string[] };
  assert.ok(persona.culture_refs.includes('id/religious-expression.md'));
});

test('Qoder assessment is incomplete and makes no compatibility claim', () => {
  const text = read('docs/qoder-assessment.md');
  assert.match(text, /Incomplete/);
  assert.match(text, /no compatibility claim/i);
  assert.match(text, /No `Qoder-compatible` claim/);
});
