import test from 'node:test';
import assert from 'node:assert/strict';
import { countTokens, TOKENIZER_PROFILE } from '../src/tokenizer.ts';

test('tokenizer reports the configured encoding', () => {
  assert.equal(TOKENIZER_PROFILE, 'o200k_base');
});

test('tokenizer counts non-empty text', () => {
  assert.ok(countTokens('Halo, ini uji token.') > 0);
});

test('tokenizer counts empty text as zero', () => {
  assert.equal(countTokens(''), 0);
});
