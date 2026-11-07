# CCI capability audit — RUSUH

Audit date 2026-11-07. Read-only: no repository file was changed to produce this report. Every
claim below was checked against the file named beside it; nothing is taken from a README sentence
alone. Token counts are from `node src/cli.ts measure --profile rusuh-id` and a per-file
`countTokens()` run on the same day.

## 1. Executive summary

RUSUH's conversational cultural intelligence today is **prompted, not implemented**. The layer
ships rules, examples, and a small reviewed culture seed; the model supplies the understanding. Of
the five target capabilities, none is fully implemented, four are partially implemented, and one
cannot be verified at all because the evaluation harness has no notion of a second turn.

The strongest part is the *conduct* layer: when to drop humour, how to roast a decision without
roasting a person, and what to do with a reference it does not recognise. Those rules are specific
enough to be recognisable in output, and one live campaign (2026-11-04, k=1) shows the treatment
passing 34 of 36 deterministic checks against the baseline's 36 of 36 — the two failures are the
interesting part and are analysed below.

The weakest parts are the three that need *state over time*: continuity, anti-repetition, and
mood tracking. None can be measured by the current single-turn runner, so all three are documented
promises rather than verified behaviour.

Two mechanical findings matter more than any capability score:

1. **`evals/rusuh-voice.yaml` (12 tasks) is invisible to the README and unlisted in `--help`**, and
   `personas/rusuh/tests.yaml` (25 rubric cases, `status: draft`) is read **only by tests asserting its
   shape** — no runner ever executes a rubric case against a model.
   Two RUSUH quality suites exist; one is undocumented, one is dead.
2. **The mounted Indonesian culture references cost 2,724 tokens, and 1,000 of them are a seven-entry
   lexicon.** Review metadata (`sources`, `decay_class`, `regions`, `confidence`, `expires`) is
   compiled into the shipped reference even though only the reviewer needs it.

## 2. Five-capability assessment

### 2.1 Cultural awareness — **Partially Implemented**

**Current implementation.** A reviewed Indonesian lexicon (7 entries) with decay classes,
offensiveness, `avoid_when`, and per-response caps; a meme file (6 entries) with context and
avoidance rules; four conduct rules for cultural references; one few-shot case and one eval task
that specifically test *not faking* recognition.

**Evidence.**

- `culture/id/genz-lexicon.yaml:7,22,37,52,67,82,98` — 7 entries, each with `decay_class`,
  `confidence`, `avoid_when`, `max_per_response`; two (`julid`, `bucin`) are `purpose: awareness`
  with `max_per_response: 0`.
- `culture/id/memes.yaml:6,12,18,24,30,36` — 6 patterns (`deploy-friday`, `works-on-my-machine`,
  `brainrot`, `not-a-bug`, `yak-shaving`, `bike-shed`).
- `personas/rusuh/voice.md:56-57` — "If a meme, game, or catchphrase is unfamiliar, say so in one
  clause and ask — never fake understanding"; "A reference that peaked two years ago is not a
  shared joke; it is a tell."
- `personas/rusuh/examples.jsonl:10` — `rusuh-unknown-meme-01` expects `admit_uncertainty_and_ask`
  and forbids `fake_familiarity`.
- `evals/rusuh-voice.yaml:52` — `rv-unknown-meme-01` (live-run task with a `require` screen).
- `docs/evidence/rusuh-voice-cycle/run2-cap040-report.md` (2026-11-04, k=1, $1.87): baseline
  answered "Tidak paham maksud 'skibidi sigma'…"; the treatment explained the term and asked for
  the technical requirement, then **failed the screen's `require` pattern** (0/1).

**Limitations.**

- Knowledge is **static**: 7 words and 6 patterns, manually dated (`expires`, `next_review`). There
  is no retrieval and no runtime freshness signal; "outdated" is a review label, not a behaviour.
- The lexicon models **words**, not **concepts**: sarcasm, irony, satire, and absurd humour are
  covered only by prose in `culture/id/absurd-humor.md` (192 tokens) and `dev-humor.md` (237).
- The only implemented behaviour for an unknown reference is "admit it and ask". There is no path
  for "I half-recognise this" (e.g. a term whose surface is known but whose current usage is not).

**Missing.** Distinguishing common / niche / outdated / emerging at runtime; any notion of
reference age or popularity; interpretation guidance with worked examples (positive and negative)
per humour mode.

**Conflicts.** None with the safety layer. Note the awareness-only entries already produce build
warnings (`awareness-only entry: id-julid`, `id-bucin`) — the mechanism warns rather than forbids.

**Recommended improvements.** Keep the files small. Add **at most 2–3 worked contrast examples**
(sarcasm recognised / misread) to `dev-humor.md` instead of new dictionaries, and one eval task per
humour mode. Do not grow the lexicon as the primary lever.

### 2.2 Conversational continuity — **Cannot Verify** (rules exist; nothing measures them)

**Current implementation.** No code. Continuity is provided by the host CLI's session; the layer
contributes one rule ("do not reuse an opener or catchphrase in consecutive replies") and a
contradictory-requirements reflex.

**Evidence.**

- `src/eval.ts:55` — `export type EvalRunner = (cwd: string, prompt: string, budgetUsd: number) => EvalRun;`
  and `src/eval.ts:177` — one call per run. There is no history parameter, no transcript, no
  `--resume`; every repeat is an independent process.
- `personas/rusuh/voice.md:25` — the anti-repetition rule; `voice.md:28-39` — the contradiction
  reflex ("Name the contradiction and ask which one wins").
- No file under `src/` references turns, history, or transcripts (grep for `turn|conversation|
  previous reply|session` returns only prose and unrelated identifiers).

**Limitations.** The layer cannot lose a thread that it never holds. Callbacks, established jokes,
and escalation are properties of the harness plus the model's context window, not of HAHahah.

**Missing.** A way to evaluate multi-turn behaviour at all: turn sequences, per-turn screens, and
a cross-turn assertion (repetition, callback, tone shift).

**Conflicts.** None, but the README's framing should not imply the layer manages conversation
state — it does not.

**Recommended improvements.** This is the highest-value gap and the cheapest to close for
*measurement*: add an optional `turns: string[]` to an eval task, feed them sequentially to one
session, and screen each turn. Do not build memory into the layer.

### 2.3 Spontaneous improvisation — **Partially Implemented**

**Current implementation.** Eight named situational reflexes with example lines, three independent
adaptation axes, and 20 few-shot exchanges. No template engine, by design: the compiler emits
text, the model generates.

**Evidence.**

- `personas/rusuh/voice.md:28-39` — 8 reflexes (greeting, absurd claim, bad decision, own mistake,
  unclear instruction, unfair blame, contradictory requirements, frustration), each with a
  concrete example line.
- `personas/rusuh/voice.md:41-52` — slang / roast / chaos axes, explicitly decoupled.
- `personas/rusuh/examples.jsonl` — 20 exchanges, `expect` objects with `must_include` /
  `must_not`.
- `evals/rusuh-voice.yaml:4,17,30,43,52,64,78,91,103,115,128,142` — 12 live tasks.
- Live run above: treatment 34/36 checks, including `rv-greet-01` producing a contextual line
  ("Mau lempar bug spaghetti apa mau nekat deploy di hari Jumat?") — i.e. improvisation is visible
  in output, but nothing in the harness measures *originality* or *repetition*.

**Limitations.** All checks are surface patterns (`language`, `require`, `forbid`, injected-layer
detection). They can prove "no emoji in an incident" and "mentions a test", not "this joke is new".

**Missing.** Any anti-template measurement; a negative check for repeating the same opener across
turns; a small judged sample (human or model-judge) for "original vs template".

**Conflicts.** None.

**Recommended improvements.** Add 3 turn-sequenced tasks that press the same reflex twice and
screen for a repeated 4-gram; keep judging originality out of CI until the turn support exists.

### 2.4 Local language adaptation — **Partially Implemented** (Indonesian), **Missing** (regional)

**Current implementation.** A hard language contract (answer in the user's language), one rule that
regional context is not uniform, and a full Javanese persona (`JAWA`) with a register map and a
Banyumasan note. RUSUH itself mounts **no** regional content.

**Evidence.**

- `core/always-on.md:7` — "Answer in the user's language… Keep dev terms English; never translate
  code, paths, commands, errors."
- `personas/rusuh/voice.md:58` — "What lands in Jakarta slang may not land in Banyuwangi, and
  RUSUH does not assume one Indonesian audience."
- `personas/rusuh/persona.yaml:11-17` — `culture_refs` are `id/*` only; no `jv/*`.
- `culture/jv/registers.yaml` — ngoko / madya / krama; `culture/jv/banyumasan.md` — Banyumasan
  guidance; both belong to the `JAWA` persona, which has **never been executed against a model**
  (README status, and no live report exists).
- `evals/*.yaml` — no task sends RUSUH Javanese or Banyumasan input; every prompt is Indonesian.

**Limitations.** For RUSUH, mixed Indonesian–Javanese input is governed by "answer in the user's
language" and nothing else. Informal spelling and abbreviations are handled by the model, not by
the layer; the lexicon contains no regional terms (`regions: [national]` on all 7 entries).

**Missing.** Any evidential basis for RUSUH + regional input; a rule against inferring a dialect
from a name or a word (the equivalent rule exists only in `personas/jawa/voice.md`, not RUSUH).

**Conflicts.** Mounting `jv/*` into RUSUH would duplicate JAWA and add ~1.5k reference tokens.
Recommendation: do **not** mount it; add behaviour rules and tasks instead.

**Recommended improvements.** Two lines in `voice.md` (never infer dialect from a name/location;
if the user switches to a regional variety, answer in Indonesian unless they ask for that variety)
and 3–4 eval tasks with mixed input, screened for "no dialect assertion".

### 2.5 Social fluency — **Partially Implemented**

**Current implementation.** Explicit tone controls: roast the artefact not the person; playful
signal before roasting a decision; drop humour on distress/incident; serious mode; a reactive
"genuinely frustrated" reflex; three decoupled intensity axes. Screens exist for the loudest
failure modes (emoji/slang during an incident).

**Evidence.**

- `personas/rusuh/voice.md:11-16` — target rules ("Roasting the user's *decision* needs a playful
  signal first").
- `voice.md:41-52` — intensity axes plus "Distress boundary: … genuine distress or outage gets zero
  roast, zero emoji"; `voice.md:68-70` — serious mode triggers ("serius", "stop", outage, data
  loss, security, distress, irreversible action).
- `voice.md:28-39` — reflexes for unclear instructions, unfair blame, contradiction, frustration.
- `evals/rusuh-voice.yaml:78-89` — `rv-serious-incident-01` forbids `wkwk`, `WKWK`, 😭, 💀,
  "santai bro"; `evals/rusuh-voice.yaml:30` — `rv-anger-unclear-01`; `:142` — `rv-adapt-downshift-01`.
- Live run above: `rv-serious-incident-01` passed in both arms; the two treatment failures are
  `rv-contradiction-01` (a `require` pattern) and `rv-unknown-meme-01` (a `require` pattern), not
  tone failures.

**Limitations.** Mood tracking is per-message. "Continue, escalate, or end a joke" is prose; no
task sequences a playful turn followed by a serious one. A screen cannot tell a well-judged joke
from an ill-judged one; it can only catch the forbidden register.

**Missing.** Turn-pair escalation/de-escalation tests; an explicit rule for *ending* a bit (the
strongest related rule is "Do not reuse an opener or catchphrase", which is anti-repetition, not
closure).

**Conflicts.** None.

**Recommended improvements.** Add one 3-turn de-escalation task (banter → user says "serius" →
screen turn 3 for zero banter markers) once multi-turn support exists.

## 3. Existing components worth preserving

- **Safety spine and serious mode** (`core/10-safety.md`, `voice.md:68-70`): specific, testable, and
  the reason the treatment passes every incident screen.
- **The eight reflexes** (`voice.md:28-39`): they encode behaviour, not vocabulary, and survive a
  personality rewrite — the reason the "marker quota" test can forbid catchphrase quotas.
- **The unseen-reference rule** (`voice.md:56`) plus `rusuh-unknown-meme-01`: the only place the
  persona is told to be honest about the limits of its own knowledge, and the only place that is
  tested on both the example list and an eval suite.
- **Decay-class lexicon model** (`genz-lexicon.yaml`, `ARCHITECTURE.md` decay table): a review
  device that keeps knowledge small and dated; correct instinct, do not replace it with retrieval.
- **Screens over prose** (`src/checks.ts`): deterministic, cheap, and honest about being surface
  checks — keep them, and stop treating a passing screen as evidence of judgement.
- **Eval instrumentation** (`tasksSha256`, `errored`, `routeSplitOf`, abort kinds): already
  trustworthy; new CCI tests should ride on it, not beside it.

## 4. Identified gaps

1. **No multi-turn evaluation.** Continuity, anti-repetition, escalation, and callbacks are
   unmeasurable (`src/eval.ts:55,177`), so three of five capabilities cannot be verified.
2. **Two RUSUH quality suites, one dead, one undocumented.** `evals/rusuh-voice.yaml` (12 tasks) is
   absent from `README.md:81` (which claims 4 suites / 64 tasks; the repo has 5 / 77) and from the
   `--help` routing table. `personas/rusuh/tests.yaml` (25 rubric cases) is read only by shape tests;
   nothing executes it against a model.
3. **Regional input has no coverage for RUSUH.** No eval task, no lexicon entry, no rule against
   inferring dialect; the only regional machinery belongs to an unexecuted persona.
4. **Knowledge is word-shaped.** Sarcasm, irony, and absurdity are governed by prose, not examples;
   the lexicon cannot represent a concept.
5. **Reference tokens are spent on review metadata.** 2,724 culture tokens, 1,000 of them a 7-entry
   lexicon whose `sources`/`decay_class`/`regions` fields no runtime decision reads.
6. **No closure rule.** Nothing tells RUSUH to end a bit; only not to repeat it.

## 5. Recommended minimal implementation plan

Ordered by value per token and per line of code. None of this changes RUSUH's personality.

| # | Change | Why now | Size |
|---|---|---|---|
| 1 | `turns?: string[]` on eval tasks; runner feeds them sequentially to one session; screens run per turn; new `repeat` check across turns | Unlocks measurement for continuity, repetition, and escalation — the three unverifiable capabilities | ~120 LOC in `src/eval.ts`, ~40 in `src/checks.ts`, 5–6 tasks |
| 2 | 2 lines in `voice.md`: never infer dialect from a name/place; answer in Indonesian when the user code-switches unless asked otherwise | Closes the regional gap without duplicating JAWA | ~35 tokens |
| 3 | 3 eval tasks: mixed Indonesian–Javanese input, one dialect-assertion `forbid` | Turns rule 2 into evidence | 0 runtime tokens |
| 4 | 3 turn-sequenced improvisation tasks (same reflex twice; one de-escalation) | Proves anti-repetition and "end the bit" | 0 runtime tokens |
| 5 | Compile-time pruning of review-only lexicon fields in the shipped reference | −400 to −600 reference tokens, measured before accepting | ~25 LOC in `src/build.ts` |
| 6 | One decision on duplicate suites: keep `evals/rusuh-voice.yaml`, delete or convert `personas/rusuh/tests.yaml`; fix `README.md:81` and the `--help` routing | Removes a dead file and a false claim | docs only |

Explicitly **not** recommended: a larger slang dictionary, mounting `culture/jv/*` into RUSUH, a
retrieval layer, a conversation-memory implementation inside the layer, or any new module.

## 6. Relevant files to modify (when approved)

- `src/eval.ts` — task shape (`turns`), sequential feeding, history-aware run.
- `src/checks.ts` — cross-turn `repeat` check; no change to existing check kinds.
- `src/build.ts` — reference pruning for lexicon metadata.
- `evals/rusuh-voice.yaml` — new turn tasks (2 regional, 3 improvisation, 1 de-escalation).
- `personas/rusuh/voice.md` — two behavioural lines (≤35 tokens).
- `personas/rusuh/tests.yaml` — decision: convert to eval tasks or delete.
- `README.md`, `src/cli.ts` (help text) — suite list and routing.
- Tests: `test/eval-instrumentation.test.ts`, `test/checks.test.ts`, `test/content.test.ts`.

## 7. Proposed tests and evaluation scenarios

1. **Runner passes history** — a stub runner records prompts; a 3-turn task must produce 3 calls
   where call *n* carries turns 1…*n*. Fails today (no such field).
2. **Anti-repetition** — two turns press the same reflex; `repeat` check fails on a shared 4-gram,
   passes when the second reply is rephrased. Prove it fails first on a deliberately repeated stub.
3. **Dialect restraint** — prompt: "gue orang Purwokerto, pake bahasa gue aja" → `forbid`
   `\b(orang jawa|logat jawa|kamu pasti)\b`; a second task with a name that suggests a region but
   no stated dialect → no regional claim.
4. **De-escalation** — banter turn, then "serius, production down"; turn 3 screened for zero banter
   markers (reuse `rv-serious-incident-01`'s forbid list).
5. **Efficiency guard** — `references` budget test asserts the pruned lexicon keeps the same
   behavioural fields and drops `sources`; fail if the runtime copy grows.
6. **Suite hygiene** — a test that every `evals/*.yaml` file appears in the `--help` routing table,
   so an undocumented suite cannot reappear.

## 8. Estimated token overhead and complexity

Current, measured 2026-11-07 (`measure --profile rusuh-id`): always-on **473/530**, skill body
**1844/1900**, references **4037/4950**.

Culture share of references, per file:

| File | Tokens |
|---|---:|
| `culture/id/genz-lexicon.yaml` | 1,000 |
| `culture/id/memes.yaml` | 512 |
| `culture/id/religious-expression.md` | 492 |
| `culture/id/humor-boundaries.md` | 291 |
| `culture/id/dev-humor.md` | 237 |
| `culture/id/absurd-humor.md` | 192 |
| **total mounted** | **2,724** |

Plan impact:

| Item | Runtime tokens | Complexity |
|---|---|---|
| Multi-turn runner + `repeat` check | 0 | Medium (~160 LOC, touches eval core) |
| Two voice rules | ~+35 always-on | Low (budget has 57 free) |
| 6 new eval tasks | 0 | Low (data only) |
| Reference pruning | **−400…−600** (to be measured) | Low (~25 LOC) |
| Suite/README cleanup | 0 | Trivial |

Net effect at completion: measurement for all five capabilities, roughly **−400 tokens** of
per-install reference cost, two behavioural lines, no new module, no new dependency.
