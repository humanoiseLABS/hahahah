import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAll,
  checkFixture,
  commandError,
  loadFixtures,
  type CodingFixture,
} from '../src/coding.ts';
import { validate } from '../src/schema.ts';

const root = process.cwd();

test('every shipped coding fixture is red in its task state and green with the solution', () => {
  const checks = checkAll(root);
  assert.ok(checks.length >= 12, `expected at least 12 fixtures, found ${checks.length}`);
  const broken = checks.filter((check) => !check.ok);
  assert.deepEqual(
    broken.map((check) => `${check.id}: ${check.detail}`),
    [],
    'a fixture that cannot be graded would waste paid model runs',
  );
  assert.ok(
    checks.some((check) => check.hidden),
    'the set needs hidden holdout tasks',
  );
});

test('every fixture has a brief long enough to be a task and a declared test count', () => {
  for (const fixture of loadFixtures(root)) {
    assert.ok(fixture.brief.length >= 40, `${fixture.id} brief is too thin`);
    assert.ok(fixture.tests >= 2, `${fixture.id} needs at least two tests`);
    assert.ok(fixture.tags && fixture.tags.length > 0, `${fixture.id} needs tags`);
  }
});

test('the fixture runner refuses anything but the node test runner', () => {
  assert.equal(commandError(['node', '--test']), undefined);
  assert.equal(commandError(['node', '--test', 'test']), undefined);
  assert.match(commandError(['node', '--exec-permission', 'x']) ?? '', /only --test is allowed/);
  assert.match(commandError(['node', '-e', 'process.exit()']) ?? '', /only --test is allowed/);
  assert.match(commandError(['cmd', '/c', 'dir']) ?? '', /only the node test runner is allowed/);
  assert.match(commandError(['node', '--test', '../outside']) ?? '', /relative path/);
  assert.match(
    commandError(['node', '--test', '--experimental-permission']) ?? '',
    /relative path/,
  );
});

test('a fixture whose task state already passes is rejected', () => {
  const alreadySolved: CodingFixture = {
    schema: 'hahahah.coding.fixture/v1',
    id: 'cod-trivial',
    brief: 'this fixture asks for nothing because the shipped code is already correct',
    files: [
      { path: 'src/a.js', content: 'export const a = 1;\n' },
      { path: 'test/a.test.js', content: "import test from 'node:test';\ntest('a', () => {});\n" },
    ],
    solution: [{ path: 'src/a.js', content: 'export const a = 1;\n' }],
    tests: 1,
  };

  const check = checkFixture(alreadySolved);
  assert.equal(check.ok, false);
  assert.match(check.detail, /already passes/);
});

test('a fixture cannot place files outside its own workspace', () => {
  const source = loadFixtures(root)[0];
  assert.ok(source);
  const escaping = structuredClone(source);
  escaping.files[0] = { path: '../escape.js', content: 'export const x = 1;\n' };
  assert.throws(
    () => validate('codingFixture', escaping, 'inline-test', root),
    /validation failed/i,
    'the schema must reject traversal before anything is written',
  );
});
