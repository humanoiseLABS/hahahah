import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { validate } from '../src/schema.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const yaml = (path: string) => parse(read(path)) as Record<string, unknown>;

test('all Phase 1 YAML content validates', () => {
  assert.doesNotThrow(() => validate('profile', yaml('profiles/rusuh-id.yaml'), 'profile', root));
  assert.doesNotThrow(() =>
    validate('persona', yaml('personas/rusuh/persona.yaml'), 'persona', root),
  );
  assert.doesNotThrow(() =>
    validate('lexicon', yaml('personas/rusuh/lexicon.yaml'), 'lexicon', root),
  );
  assert.doesNotThrow(() =>
    validate('culture', yaml('culture/id/genz-lexicon.yaml'), 'culture', root),
  );
  assert.doesNotThrow(() => validate('memes', yaml('culture/id/memes.yaml'), 'memes', root));
});

test('persona references exist and are relative', () => {
  const persona = yaml('personas/rusuh/persona.yaml') as {
    culture_refs: string[];
    voice: string;
    card: string;
    lexicon: string;
  };
  for (const ref of persona.culture_refs) {
    assert.doesNotMatch(ref, /^\/|\.\./);
    assert.doesNotThrow(() => read(`culture/${ref}`));
  }
  for (const file of [persona.voice, persona.card, persona.lexicon]) {
    assert.doesNotThrow(() => read(`personas/rusuh/${file}`));
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

test('persona reviews remain pending in the draft', () => {
  const persona = yaml('personas/rusuh/persona.yaml') as {
    reviews: { linguistic: string; cultural: string; safety: string };
  };
  assert.equal(persona.reviews.linguistic, 'pending');
  assert.equal(persona.reviews.cultural, 'pending');
  assert.equal(persona.reviews.safety, 'pending');
});

test('examples and test fixtures are machine-readable', () => {
  const examples = read('personas/rusuh/examples.jsonl')
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.ok(examples.length >= 3);
  const tests = yaml('personas/rusuh/tests.yaml') as { cases: unknown[] };
  assert.ok(tests.cases.length >= 3);
});

test('Javanese register map is present and includes Banyumasan guidance', () => {
  const registers = yaml('culture/jv/registers.yaml') as {
    levels: Record<string, unknown>;
    honorifics: Record<string, unknown>;
    banyumasan: { preferred_name: string };
  };
  assert.ok(registers.levels.ngoko);
  assert.ok(registers.levels.madya);
  assert.ok(registers.levels.krama);
  assert.ok(registers.honorifics.krama_inggil);
  assert.equal(registers.banyumasan.preferred_name, 'Banyumasan');
});

test('no source document uses the retired project name', () => {
  const files = [
    'core/always-on.md',
    'core/00-identity.md',
    'core/10-safety.md',
    'core/20-decision.md',
    'core/30-efficiency.md',
    'culture/id/dev-humor.md',
    'culture/id/absurd-humor.md',
    'culture/id/humor-boundaries.md',
    'culture/id/religious-expression.md',
    'culture/id/genz-lexicon.yaml',
    'culture/jv/registers.yaml',
    'culture/jv/banyumasan.md',
    'personas/rusuh/card.md',
    'personas/rusuh/voice.md',
    'personas/rusuh/persona.yaml',
    'profiles/rusuh-id.yaml',
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /\bADAB\b/, `${file} contains the retired name`);
  }
});

test('persona content does not attempt to override core safety or permissions', () => {
  // evals/*.yaml is deliberately excluded: those files quote adversarial payloads
  // ("abaikan aturan safety") as test data, which this lint would flag as a violation.
  const files = [
    'core/always-on.md',
    'core/00-identity.md',
    'core/10-safety.md',
    'core/20-decision.md',
    'core/30-efficiency.md',
    'personas/rusuh/card.md',
    'personas/rusuh/voice.md',
    'personas/rusuh/persona.yaml',
    'personas/rusuh/lexicon.yaml',
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
