import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/schema.ts';

const profile = {
  schema: 'hahahah.profile/v1',
  id: 'rusuh-id',
  persona: 'rusuh',
  locale: 'id',
  intensity: 'high',
  core: '>=0.1.0 <0.2.0',
  budget_profile: 'default-id',
  adapters: ['fake'],
  budgets: {
    always_on_tokens: 400,
    skill_metadata_tokens: 90,
    skill_body_tokens: 1500,
    reference_tokens_max: 4000,
  },
};

const persona = {
  schema: 'hahahah.persona/v1',
  id: 'rusuh',
  version: '0.1.0',
  display_name: 'RUSUH',
  locale: 'id',
  intensity: 'high',
  register: 'informal-id',
  voice: 'voice.md',
  card: 'card.md',
  lexicon: 'lexicon.yaml',
  culture_refs: ['id/lexicon.yaml', 'id/humor-boundaries.md'],
  budgets: { always_on_tokens: 400, skill_body_tokens: 1500 },
  safety_profile: 'id-default',
  reviews: { linguistic: 'pending', cultural: 'pending', safety: 'pending', reviewed_at: null },
  expires: '2027-05-01',
};

test('accepts a valid profile', () => {
  assert.doesNotThrow(() => validate('profile', profile));
});

test('rejects a profile without a persona', () => {
  assert.throws(() => validate('profile', { ...profile, persona: undefined }), /persona/);
});

test('accepts a valid persona', () => {
  assert.doesNotThrow(() => validate('persona', persona));
});

test('rejects a persona with an unknown review state', () => {
  assert.throws(
    () => validate('persona', { ...persona, reviews: { ...persona.reviews, safety: 'maybe' } }),
    /safety/,
  );
});

test('accepts a valid config and rejects an empty adapter list', () => {
  assert.doesNotThrow(() =>
    validate('config', {
      schema: 'hahahah.config/v1',
      profile: 'rusuh-id',
      adapters: ['claude-code'],
    }),
  );
  assert.throws(
    () =>
      validate('config', {
        schema: 'hahahah.config/v1',
        profile: 'rusuh-id',
        adapters: [],
      }),
    /adapters/,
  );
});

test('accepts a valid culture file', () => {
  assert.doesNotThrow(() =>
    validate('culture', {
      schema: 'hahahah.culture.lexicon/v1',
      locale: 'id',
      version: '2026.11',
      reviewed_by: 'pending',
      next_review: '2027-02-01',
      entries: [
        {
          id: 'id-gabut',
          term: 'gabut',
          gloss: 'idle / nothing to do',
          register: 'informal',
          regions: ['national'],
          decay_class: 'kbbi-colloquial',
          offensiveness: 'none',
          contexts: ['casual_work'],
          avoid_when: ['incident'],
          max_per_response: 1,
          expires: '2027-11-01',
          confidence: 'high',
          sources: [{ url: 'https://kbbi.kemendikdasmen.go.id/entri/gabut', note: 'KBBI' }],
        },
      ],
    }),
  );
});

test('rejects a culture entry without sources', () => {
  assert.throws(
    () =>
      validate('culture', {
        schema: 'hahahah.culture.lexicon/v1',
        locale: 'id',
        version: '2026.11',
        reviewed_by: 'pending',
        next_review: '2027-02-01',
        entries: [
          {
            id: 'id-x',
            term: 'x',
            gloss: 'x',
            register: 'informal',
            regions: ['national'],
            decay_class: 'local-slang',
            offensiveness: 'none',
            contexts: ['casual_work'],
            avoid_when: ['incident'],
            max_per_response: 1,
            expires: '2027-11-01',
            confidence: 'low',
            sources: [],
          },
        ],
      }),
    /sources/,
  );
});
