import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';

export type SchemaName =
  | 'profile'
  | 'persona'
  | 'culture'
  | 'memes'
  | 'registers'
  | 'lexicon'
  | 'config'
  | 'manifest'
  | 'install'
  | 'evalSuite';

const schemaFiles: Record<SchemaName, string> = {
  profile: 'profile.schema.json',
  persona: 'persona.schema.json',
  culture: 'culture.schema.json',
  memes: 'memes.schema.json',
  registers: 'register-map.schema.json',
  lexicon: 'lexicon.schema.json',
  config: 'config.schema.json',
  manifest: 'manifest.schema.json',
  install: 'install-manifest.schema.json',
  evalSuite: 'eval-suite.schema.json',
};

type AjvConstructor = new (options?: object) => {
  compile(schema: object): ValidateFunction;
};

const validators = new Map<string, ValidateFunction>();

export class SchemaValidationError extends Error {
  readonly issues: string[];
  readonly source: string;

  constructor(source: string, issues: string[]) {
    super(`Schema validation failed for ${source}:\n${issues.join('\n')}`);
    this.name = 'SchemaValidationError';
    this.source = source;
    this.issues = issues;
  }
}

export function validate(
  name: SchemaName,
  data: unknown,
  source = 'inline',
  root = process.cwd(),
): void {
  const key = `${root}:${name}`;
  let compiled = validators.get(key);

  if (!compiled) {
    const schemaPath = join(root, 'schemas', schemaFiles[name]);
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;
    const AjvCtor = Ajv as unknown as AjvConstructor;
    const ajv = new AjvCtor({ allErrors: true, strict: false });
    compiled = ajv.compile(schema);
    validators.set(key, compiled);
  }

  if (!compiled(data)) {
    const issues = (compiled.errors ?? []).map((error) => {
      const location = error.instancePath || '/';
      const property =
        error.params && typeof error.params === 'object' && 'missingProperty' in error.params
          ? ` (${String(error.params.missingProperty)})`
          : '';
      return `${location}${property} ${error.message ?? 'invalid value'}`.trim();
    });
    throw new SchemaValidationError(source, issues);
  }
}
