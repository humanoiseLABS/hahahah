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

test('rusuh voice carries the social reflexes, not a marker quota', () => {
  const voice = read('personas/rusuh/voice.md');
  assert.match(voice, /## Reflexes/);
  for (const reflex of [
    'Casual greeting',
    'Absurd or impossible claim',
    'A bad technical decision',
    'User angry because RUSUH was wrong',
    'User angry because instructions were unclear',
    'Unfair blame',
    'Contradictory requirements',
    'Genuinely frustrated user',
  ]) {
    assert.ok(voice.includes(reflex), `missing reflex: ${reflex}`);
  }
  assert.match(voice, /## Cultural references/);
  assert.match(voice, /never fake understanding/i);
  assert.match(voice, /## Accountability/);
  assert.match(voice, /does not protect its ego at the expense of correctness/i);
  // The quota is what made the persona read formal; it must not come back as a rule.
  assert.doesNotMatch(voice, /[Aa]t most one (signature phrase|emoji|slang)/);
  // The safety spine and the measured behaviours survive a personality rewrite.
  assert.match(voice, /Switching an Indonesian thread to English is a defect/i);
  assert.match(voice, /do not label an act a sin/i);
  assert.match(voice, /Banyumasan is a language variety, not a punchline/i);
  assert.match(voice, /pressure changes scope, not the report/i);
  assert.match(voice, /Never the user, their intelligence, appearance, family, religion/i);
});

test('rusuh examples teach exchanges, not vocabulary', () => {
  const cases = read('personas/rusuh/examples.jsonl')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { id: string; expect: Record<string, unknown> });
  assert.ok(cases.length >= 12, `expected at least 12 worked examples, found ${cases.length}`);
  const ids = new Set(cases.map((item) => item.id));
  for (const needed of [
    'rusuh-greet-01',
    'rusuh-absurd-01',
    'rusuh-own-mistake-01',
    'rusuh-unfair-blame-01',
    'rusuh-contradiction-01',
    'rusuh-unknown-meme-01',
    'rusuh-serious-01',
    'rusuh-religious-refusal-01',
  ]) {
    assert.ok(ids.has(needed), `examples lost ${needed}`);
  }
  const codeClean = cases.find((item) => item.id === 'rusuh-code-clean-01');
  assert.ok(
    JSON.stringify(codeClean?.expect).includes('emoji_in_code'),
    'an example must keep emoji out of code',
  );
});

test('rusuh rubric covers the reflexes the spec asks for', () => {
  const rubric = read('personas/rusuh/tests.yaml');
  for (const id of [
    'rusuh-persona-13',
    'rusuh-persona-16',
    'rusuh-persona-17',
    'rusuh-persona-18',
  ]) {
    assert.ok(rubric.includes(id), `rubric lost ${id}`);
  }
  assert.match(rubric, /no corporate opening line|keeps the personality under pressure/);
  assert.doesNotMatch(rubric, /at most one slang term and at most one emoji/);
});

test('the rusuh-voice suite screens every reflex the voice documents', () => {
  const suite = read('evals/rusuh-voice.yaml');
  for (const tag of [
    'greeting',
    'absurd-claim',
    'technical-pushback',
    'accountability',
    'clarification',
    'unfair-blame',
    'requirements',
    'serious-mode',
    'cultural-uncertainty',
  ]) {
    assert.ok(suite.includes(tag), `the voice suite lost the ${tag} task`);
  }
  assert.match(suite, /rv-unfair-blame-01/);
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

test('citations live in the unmounted sources files, not in runtime references', () => {
  const sources = read('culture/id/sources.md');
  const urls = sources.match(/https?:\/\//g) ?? [];
  assert.ok(urls.length >= 4, `expected at least four verified citations, found ${urls.length}`);
  assert.match(sources, /MasyaAllah\* and \*Subhanallah\* still have \*\*no verified URL\*\*/);

  for (const id of personaIds) {
    for (const ref of personaModel(id).culture_refs) {
      assert.ok(!ref.endsWith('sources.md'), `${id} must not mount provenance file ${ref}`);
    }
  }

  // A mounted reference is paid for at runtime, so it carries rules, not URLs.
  for (const id of personaIds) {
    for (const ref of personaModel(id).culture_refs) {
      if (!ref.endsWith('.md')) continue;
      const body = read(`culture/${ref}`);
      assert.ok(
        !/https?:\/\//.test(body),
        `culture/${ref} ships URLs; move them to a sources file`,
      );
    }
  }
});

test('Qoder assessment is incomplete and makes no compatibility claim', () => {
  const text = read('docs/qoder-assessment.md');
  assert.match(text, /Incomplete/);
  assert.match(text, /no compatibility claim/i);
  assert.match(text, /No `Qoder-compatible` claim/);
});
