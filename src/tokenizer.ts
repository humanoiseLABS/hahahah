import { countTokens as countWithO200k } from 'gpt-tokenizer';

export const TOKENIZER_PROFILE = 'o200k_base' as const;

export function countTokens(text: string): number {
  return countWithO200k(text);
}
