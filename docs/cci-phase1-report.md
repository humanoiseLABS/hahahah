# CCI Phase 1 — implementation report

Scope: the approved minimal plan in `docs/cci-audit.md`. Nothing here claims that cultural
intelligence is solved; every new capability below is an *instrument* or a *rule*, and only two of
the five audit gaps can be measured after this phase.

## 1. What changed

### Multi-turn evaluation (`src/eval.ts`, `src/checks.ts`, `schemas/eval-suite.schema.json`)

- `EvalTask` gains `turns?: EvalTurn[]` next to the existing `prompt`; the schema requires one of
  them and rejects `turns` shorter than two. A turn may carry its own `checks`, which fall back to
  the task-level `checks`.
- `EvalRunner` gains an optional fourth argument, `history: EvalTurnRecord[]`. Turns run in order,
  each call receives the transcript of the same arm and repeat, and history never crosses an arm.
- Cost, usage, `numTurns` and duration are summed across turns, so an arm median still describes the
  whole script; `output` remains the last turn and `turnOutputs` keeps every answer.
- Screens run per turn; their detail string is prefixed `turn N:`. A new `repeat` check compares
  consecutive turns by shared four-word runs and fails on a reused line.
- `buildArm` no longer overwrites screens a multi-turn run already computed; contamination detection
  now reads every turn.
- `tasksFingerprint` now covers the turn script and each turn's screens, so editing a screen cannot
  leave two incomparable reports with the same fingerprint.
- Single-turn tasks are untouched: same signature, one call, no history (regression test pins it).

### RUSUH local-language safeguards (`personas/rusuh/voice.md`)

- "Never infer a dialect, region, or ethnicity from a name, a word, or a place."
- "A code-switch into a regional variety still gets Indonesian unless they ask for it; what lands in
  Jakarta may not land in Banyuwangi." (this replaced a longer sentence in *Cultural references*, so
  the three new rules cost no net tokens — see §3)

### Evaluation tasks (`evals/rusuh-voice.yaml`, 12 → 17)

| Task | Shape | What it measures |
|---|---|---|
| `rv-region-no-inference-01` | single | a name + city must not become a dialect claim; still answers technically |
| `rv-regional-switch-01` | single | Javanese code-switch gets an Indonesian answer, no dialect assertion |
| `rv-reflex-repeat-01` | 2 turns | the same reflex twice: `repeat` check forbids a copied opener |
| `rv-callback-01` | 2 turns | the second turn must still name the earlier topic (`deploy|jumat|rollback`) |
| `rv-deescalate-01` | 3 turns | banter → banter → outage; turn 3 forbids `wkwk`, 😭, 💀, "santai bro" |

### Reference token pruning (`src/build.ts`)

Compiled culture references now carry only the fields the agent can act on, per file kind:

- lexicon entries: `id, term, gloss, register, regions, decay_class, offensiveness, contexts,
  avoid_when, max_per_response, purpose`
- meme entries: `id, pattern, context, avoid_when, note`
- register map: `locale, levels, honorifics, defaults, common_errors, banyumasan`

Dropped as review-only: `version`, `reviewed_by`, `next_review`, `confidence`, `expires`, `sources`.
The source files keep everything, so `build --release`, expiry gating and provenance are unchanged.
`decay_class` was deliberately kept: it is the field that tells the agent how dated a term already is.

### Suite hygiene

- `--help` now lists the suites it finds in `evals/` and explains `turns` and the replay caveat.
- `README.md` suite line corrected to 5 suites / 82 tasks and now documents the rubric/executable split.
- `personas/*/tests.yaml` marked `status: manual-rubric`; a test pins that label, and a second test
  pins that every `evals/*.yaml` appears in `--help`.

## 2. Verification

- `npm run check` (typecheck + prettier + full suite): **218 tests, 218 pass** (206 before this phase).
- Multi-turn behaviour proven by tests, not by assertion:
  - turn order and per-arm history (`[0, 2, 4]` messages before turns 1–3),
  - the `repeat` check fails on a copied answer and passes on a rephrase,
  - per-turn screens judge only their own turn,
  - cost/usage summed, single-turn path unchanged,
  - `withTranscript` leaves a single-turn prompt byte-for-byte identical.
- Mutation check: setting the repeat window from 4 words to 99 makes the repeat test fail; reverted.
- Offline end-to-end on the real task `rv-deescalate-01` with a stub model: 12 checks (11 turn
  screens + `repeat`), consensus `pass`, `repeat` detail `3 turns, no shared 4-word run`, and the
  task appears in the written `report.md`.
- Screen-behaviour tests: a dialect guess fails the regional forbid screen while a neutral technical
  answer passes; banter during the outage fails the de-escalation screen while a calm answer passes.

## 3. Token measurements

`node src/cli.ts measure --profile rusuh-id`, before and after this phase:

| Budget | Before | After | Target |
|---|---:|---:|---:|
| always-on | 473 | 473 | 530 |
| skill body (`measure`, fake adapter) | 1844 | 1841 | 1900 |
| references | 4286 | **3884** | 4950 |

The claude-code layout compiles more of the voice than the fake adapter and measures **1895/1900**
after the phase; the fold layout (copilot) stays under its own 2400 ceiling. The reference change is
**−402 tokens** on every install, from dropping review metadata only. Three new behavioural lines
were added to the voice and paid for by merging two overlapping sentences, so the skill body is 3
tokens *smaller* than before the phase.

## 4. Blocker reported instead of expanded scope

The instruction was to feed turns "through the same session". That is not possible without changing
evaluation isolation: `runClaude` spawns with `--no-session-persistence`, so no session exists to
resume, and enabling persistence would let one run's state leak into the next. This phase therefore
**replays the transcript as text**. The report, the help text and the code comment all say so, and a
multi-turn report must not describe itself as a resumed session. Native session continuity would be a
separate design decision (session-id capture, resume flags per harness, isolation rules), not a
smaller version of this change.

## 5. Unresolved limitations

- **No live model run of the new tasks.** The opencode free tier still refuses, and the Claude route
  needs spend. Everything above is offline and deterministic; the tasks have never answered a real
  model.
- **Screens remain surface checks.** `repeat` compares word runs, not meaning: a rephrased-but-identical
  joke passes, and a reused technical phrase of four words could fail. It is a floor, not a judge.
- **Continuity is still mostly the host's.** The layer now *measures* whether its anti-repetition and
  de-escalation rules survive a transcript; it still does not hold conversation state.
- **Callback is weakly screened.** `rv-callback-01` only requires the earlier topic to be named; a
  hollow mention passes.
- **Regional knowledge is still absent.** The rules stop false claims and wrong-language replies; they
  do not make RUSUH understand Javanese or Banyumasan. That stays with the unexecuted JAWA pack.
- **`repeat` does not apply to single-turn tasks**, by definition, so nothing yet checks repeated
  openers across separate sessions.
