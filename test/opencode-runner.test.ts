import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOpencodeStream,
  opencodeStudyConfig,
  opencodeArgs,
  loggedErrorForRun,
} from '../src/opencode.ts';
import { providerExhausted } from '../src/eval.ts';

const SAMPLE_STREAM = `
{"type":"step_start","timestamp":1000,"sessionID":"s1","part":{"type":"step-start"}}
{"type":"text","timestamp":1001,"sessionID":"s1","part":{"type":"text","text":"OK","time":{"start":1001,"end":1002}}}
{"type":"step_finish","timestamp":1002,"sessionID":"s1","part":{"reason":"stop","type":"step-finish","tokens":{"total":7746,"input":5868,"output":7,"reasoning":15,"cache":{"write":0,"read":1856}},"cost":0.012}}
`;

const SAMPLE_MULTI_TEXT = `
{"type":"text","part":{"type":"text","text":"Halo "}}
{"type":"text","part":{"type":"text","text":"bro!"}}
{"type":"step_finish","part":{"reason":"stop","type":"step-finish","tokens":{"total":100,"input":80,"output":20},"cost":0.005}}
`;

const SAMPLE_ERROR = `
{"type":"error","sessionID":"s2","error":{"name":"UnknownError","data":{"message":"Provider is down","ref":"err_1"}}}
`;

test('parseOpencodeStream extracts the assistant text', () => {
  const run = parseOpencodeStream(SAMPLE_STREAM);
  assert.equal(run.output, 'OK');
});

test('parseOpencodeStream reports cost and token usage from the final step', () => {
  const run = parseOpencodeStream(SAMPLE_STREAM);
  assert.equal(run.costUsd, 0.012);
  const usage = run.usage as { input_tokens: number; output_tokens: number };
  assert.equal(usage.input_tokens, 5868);
  assert.equal(usage.output_tokens, 7);
});

// Recorded verbatim from opencode's own store on 2026-11-07: the third repeat of a task in the same
// workspace. The provider had cached the prefix, so `input` carries only the uncached remainder.
const SAMPLE_WARM_CACHE = `
{"type":"text","part":{"type":"text","text":"Bug di src/auth/token.ts:41"}}
{"type":"step_finish","part":{"reason":"stop","type":"step-finish","tokens":{"total":6497,"input":36,"output":35,"reasoning":154,"cache":{"write":0,"read":6272}},"cost":0}}
`;

test('parseOpencodeStream keeps the cached prefix instead of reporting the remainder as the prompt', () => {
  const run = parseOpencodeStream(SAMPLE_WARM_CACHE);
  const usage = run.usage as Record<string, number>;
  // 36 + 6272 = 6308, the same prompt the cold run reported as 4453 + 1856 = 6309.
  assert.equal(usage.input_tokens, 36);
  assert.equal(usage.cache_read_input_tokens, 6272);
  assert.equal(usage.cache_creation_input_tokens, 0);
});

test('parseOpencodeStream joins consecutive text parts in order', () => {
  const run = parseOpencodeStream(SAMPLE_MULTI_TEXT);
  assert.equal(run.output, 'Halo bro!');
});

test('parseOpencodeStream turns an error event into an error run', () => {
  const run = parseOpencodeStream(SAMPLE_ERROR);
  assert.ok(run.error);
  assert.match(run.error ?? '', /Provider is down/);
  assert.equal(run.output, '');
});

test('parseOpencodeStream flags empty output instead of inventing a reply', () => {
  const run = parseOpencodeStream('');
  assert.equal(run.output, '');
  assert.ok(run.error);
});

test('opencodeArgs pins the workspace with --dir so the grade sees the edits', () => {
  // Without --dir opencode answered that it had created the file while the graded workspace
  // stayed empty (measured 2026-11-04), so the flag is not optional.
  const args = opencodeArgs('C:\\tmp\\workspace', { model: 'p/m' });
  assert.equal(args[0], 'run');
  assert.ok(args.includes('--dir'), 'the workspace must be pinned explicitly');
  assert.equal(args[args.indexOf('--dir') + 1], 'C:\\tmp\\workspace');
  assert.ok(args.includes('--format') && args[args.indexOf('--format') + 1] === 'json');
  assert.ok(args.includes('--model'));
});

test('opencodeStudyConfig grants edits and denies shell and network', () => {
  const parsed = JSON.parse(opencodeStudyConfig()) as {
    permission: Record<string, string>;
  };
  assert.equal(parsed.permission.edit, 'allow');
  assert.equal(parsed.permission.bash, 'deny');
  assert.equal(parsed.permission.webfetch, 'deny');
  assert.equal(parsed.permission.external_directory, 'deny');
});

// --- a refusal that never reaches stdout still has to reach the breaker ---

// Verbatim shape from ~/.local/share/opencode/log/opencode.log on 2026-11-07, which escapes every
// backslash in the directory and logs the refusal 0.37 s after the request, then goes quiet.
const LOG_LINES = [
  'timestamp=2026-11-07T01:53:33.032Z level=INFO run=113ae67f message=bootstrapping directory="C:\\\\temp\\\\hahahah-eval-probe-VXY4sW"',
  'timestamp=2026-11-07T01:53:33.540Z level=INFO run=113ae67f message=created id=ses_e4c49f89cffeuARPwQmu1vmNbn slug=crisp-planet version=1.18.31 projectID=global directory="C:\\\\temp\\\\hahahah-eval-probe-VXY4sW" path=Users/x/AppData/Local/Temp/hahahah-eval-probe-VXY4sW workspaceID=undefined',
  'timestamp=2026-11-07T01:53:35.826Z level=INFO run=113ae67f message=stream providerID=opencode modelID=beam-free session.id=ses_e4c49f89cffeuARPwQmu1vmNbn small=false agent=build mode=primary',
  'timestamp=2026-11-07T01:53:36.384Z level=ERROR run=113ae67f message="stream error" providerID=opencode modelID=beam-free session.id=ses_e4c49f89cffeuARPwQmu1vmNbn small=false agent=build mode=primary error.error="AI_APICallError: Free usage limit reached. Free models work in OpenCode (https://opencode.ai); subscribe to OpenCode Go to keep going: https://opencode.ai/go"',
  'timestamp=2026-11-07T01:53:42.512Z level=ERROR run=113ae67f message="stream error" providerID=opencode modelID=beam-free session.id=ses_e4c49f89cffeuARPwQmu1vmNbn small=true agent=title mode=primary error.error="AI_RetryError: Failed after 3 attempts. Last error: Free usage limit reached. Free models work in OpenCode (https://opencode.ai); subscribe to OpenCode Go to keep going: https://opencode.ai/go"',
];
const LOG_EXCERPT = LOG_LINES.join('\n');
const PROBE_DIR = 'C:\\temp\\hahahah-eval-probe-VXY4sW';

test('loggedErrorForRun reports what opencode logged for this workspace', () => {
  const found = loggedErrorForRun(LOG_EXCERPT, PROBE_DIR);
  assert.match(found ?? '', /Free usage limit reached/);
  // The whole point of the lookup: the string it recovers must trip the quota breaker, or the
  // refusal still reaches the campaign as an unexplained 180 s timeout.
  assert.equal(providerExhausted(found ?? ''), true);
});

test('loggedErrorForRun prefers the answer stream to the title agent behind it', () => {
  // The title agent's failure interleaves with the answer's and its retry message names the same
  // refusal, so taking whichever line came last would report a retry count as the cause.
  const reordered = [LOG_LINES[0]!, LOG_LINES[1]!, LOG_LINES[4]!, LOG_LINES[3]!].join('\n');
  const found = loggedErrorForRun(reordered, PROBE_DIR);
  assert.match(found ?? '', /^AI_APICallError/);
});

test('loggedErrorForRun does not claim another workspace failure as ours', () => {
  const other = 'C:\\temp\\hahahah-eval-baseline-jDF73f';
  assert.equal(loggedErrorForRun(LOG_EXCERPT, other), null);
  assert.equal(loggedErrorForRun(LOG_EXCERPT, 'C:\\temp\\hahahah-eval-probe-XXXXXX'), null);
});

test('loggedErrorForRun says nothing when the run logged no stream error', () => {
  const quiet = LOG_EXCERPT.split('\n')
    .filter((line) => !line.includes('stream error'))
    .join('\n');
  assert.equal(loggedErrorForRun(quiet, PROBE_DIR), null);
  assert.equal(loggedErrorForRun('', 'C:\\temp\\x'), null);
});
