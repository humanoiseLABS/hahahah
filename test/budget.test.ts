import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBudget } from '../src/budget.ts';

test('budget is ok below target', () => {
  const result = evaluateBudget({ target: 100, hardCap: 150 }, 80);
  assert.equal(result.status, 'ok');
});

test('budget warns between target and hard cap', () => {
  const result = evaluateBudget({ target: 100, hardCap: 150 }, 120);
  assert.equal(result.status, 'warning');
});

test('budget errors above hard cap', () => {
  const result = evaluateBudget({ target: 100, hardCap: 150 }, 151);
  assert.equal(result.status, 'error');
});
