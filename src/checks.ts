export type Language = 'id' | 'en';

export interface TaskChecks {
  language?: Language;
  require?: string[];
  forbid?: string[];
}

export type CheckStatus = 'pass' | 'fail' | 'unknown';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

// Function words and particles only. Developer loanwords (push, build, log, down)
// are excluded so a code-switched Indonesian answer still scores as Indonesian.
const ID_MARKERS = [
  'ada',
  'adalah',
  'agar',
  'aku',
  'aktif',
  'anda',
  'apa',
  'apakah',
  'asli',
  'atau',
  'bantu',
  'banyak',
  'bahwa',
  'banget',
  'belum',
  'berhati',
  'berikut',
  'bener',
  'beres',
  'betul',
  'bikin',
  'boleh',
  'buat',
  'coba',
  'cuma',
  'cuman',
  'dan',
  'dari',
  'dapat',
  'dengan',
  'deh',
  'dia',
  'dll',
  'doang',
  'dong',
  'dua',
  'dulu',
  'emang',
  'gak',
  'ga',
  'gimana',
  'gini',
  'gitu',
  'gue',
  'gw',
  'hapus',
  'harus',
  'jadi',
  'jangan',
  'justru',
  'kalau',
  'kali',
  'kami',
  'kamu',
  'kan',
  'kapasitas',
  'kemarin',
  'ke',
  'kerja',
  'kepake',
  'kok',
  'kurang',
  'lagi',
  'lah',
  'lama',
  'lihat',
  'lu',
  'maka',
  'malah',
  'mana',
  'masih',
  'mending',
  'mereka',
  'minta',
  'mirip',
  'nanti',
  'nah',
  'nggak',
  'nih',
  'nyari',
  'pakai',
  'pake',
  'paling',
  'pada',
  'perlu',
  'punya',
  'sama',
  'sana',
  'sang',
  'satu',
  'secara',
  'sedang',
  'sehingga',
  'saja',
  'sambil',
  'sebentar',
  'sih',
  'sini',
  'sistem',
  'supaya',
  'tadi',
  'tahap',
  'tak',
  'telah',
  'temen',
  'terus',
  'tidak',
  'tinggal',
  'tuh',
  'udah',
  'untuk',
  'wae',
  'waktu',
  'ya',
  'yang',
];

const EN_MARKERS = [
  'a',
  'about',
  'after',
  'again',
  'all',
  'also',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'each',
  'even',
  'every',
  'for',
  'from',
  'get',
  'had',
  'has',
  'have',
  'he',
  'her',
  'him',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'like',
  'me',
  'more',
  'most',
  'my',
  'no',
  'not',
  'of',
  'on',
  'or',
  'other',
  'our',
  'out',
  'over',
  'own',
  'say',
  'she',
  'should',
  'so',
  'some',
  'still',
  'such',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'us',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
];

function countMarkers(text: string, markers: Set<string>): number {
  let count = 0;
  for (const word of text.toLowerCase().split(/[^a-z]+/)) {
    if (markers.has(word)) count += 1;
  }
  return count;
}

const ID_SET = new Set(ID_MARKERS);
const EN_SET = new Set(EN_MARKERS);

export interface LanguageDetection {
  detected: Language | 'mixed' | 'unknown';
  idScore: number;
  enScore: number;
}

export function detectLanguage(text: string): LanguageDetection {
  // Code spans and quoted identifiers are never translated, so counting their English
  // words would misread a correct Indonesian answer about English-named things.
  const prose = text
    .replace(/`[^`]*`/g, ' ')
    .replace(/"[^"]*"/g, ' ')
    .replace(/\*\*[^*]*\*\*/g, ' ');
  const idScore = countMarkers(prose, ID_SET);
  const enScore = countMarkers(prose, EN_SET);
  let detected: LanguageDetection['detected'] = 'unknown';
  if (idScore === 0 && enScore === 0) detected = 'unknown';
  else if (enScore === 0) detected = 'id';
  else if (idScore === 0) detected = 'en';
  else if (idScore >= enScore * 2) detected = 'id';
  else if (enScore >= idScore * 2) detected = 'en';
  else detected = 'mixed';
  return { detected, idScore, enScore };
}

function compile(source: string, label: string): RegExp | { error: string } {
  try {
    return new RegExp(source, 'iu');
  } catch {
    return { error: `${label}: invalid pattern /${source}/` };
  }
}

export function runChecks(text: string, checks?: TaskChecks): CheckResult[] {
  if (!checks) return [];
  const results: CheckResult[] = [];

  if (checks.language) {
    const { detected, idScore, enScore } = detectLanguage(text);
    const detail = `expected ${checks.language}, got ${detected} (id=${idScore} en=${enScore})`;
    results.push({
      name: 'language',
      status:
        detected === checks.language
          ? 'pass'
          : detected === 'unknown' || detected === 'mixed'
            ? 'unknown'
            : 'fail',
      detail,
    });
  }

  for (const source of checks.require ?? []) {
    const pattern = compile(source, 'require');
    if ('error' in pattern) {
      results.push({ name: 'require', status: 'unknown', detail: pattern.error });
      continue;
    }
    const found = pattern.test(text);
    results.push({
      name: 'require',
      status: found ? 'pass' : 'fail',
      detail: `/${source}/ ${found ? 'present' : 'absent'}`,
    });
  }

  for (const source of checks.forbid ?? []) {
    const pattern = compile(source, 'forbid');
    if ('error' in pattern) {
      results.push({ name: 'forbid', status: 'unknown', detail: pattern.error });
      continue;
    }
    const found = pattern.test(text);
    results.push({
      name: 'forbid',
      status: found ? 'fail' : 'pass',
      detail: found ? `/${source}/ matched` : `/${source}/ absent`,
    });
  }

  return results;
}

export interface CheckSummary {
  pass: number;
  fail: number;
  unknown: number;
  findings: string[];
}

export function summarize(results: CheckResult[]): CheckSummary {
  const summary: CheckSummary = { pass: 0, fail: 0, unknown: 0, findings: [] };
  for (const result of results) {
    summary[result.status] += 1;
    if (result.status !== 'pass') {
      summary.findings.push(`${result.name}: ${result.detail}`);
    }
  }
  return summary;
}

export function checkSuiteErrors(tasks: Array<{ id: string; checks?: TaskChecks }>): string[] {
  const errors: string[] = [];
  for (const task of tasks) {
    for (const key of ['require', 'forbid'] as const) {
      for (const source of task.checks?.[key] ?? []) {
        try {
          new RegExp(source, 'iu');
        } catch {
          errors.push(`${task.id}: invalid ${key} pattern /${source}/`);
        }
      }
    }
  }
  return errors;
}
