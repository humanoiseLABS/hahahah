# Replication on a second harness: opencode/beam-free

Preservation suite, k=3, `--harness opencode --model opencode/beam-free`, run 2026-11-07 against
opencode 1.18.31. Suite fingerprint `6518f1e10035fcd0` — the corrected ruler, so these screens are the
ones the clean kiro campaign was re-scored with, not the ones it was originally produced with.

The archived `preservation-opencode-k3-report.json` / `.md` are kept exactly as the runner wrote them,
including a routing warning that is **false**. It is retracted below rather than edited out, because
the defect that produced it is the main thing this campaign found.

## What actually ran

- 38 runs consumed: **35 answered** (18 baseline, 17 treatment) and **3 errored**, recorded in
  `errored` and excluded from every median and screen.
- **6 of 12 tasks measured.** `pres-honest-partial-01` errored in both arms; `pres-log-incomplete-01`,
  `pres-secret-redacted-01`, `pres-security-note-01`, `pres-decision-evidence-01` and
  `pres-multiline-kept-01` were never reached.
- Cost **$0.0000** — free tier, so `--budget-usd 0.40` is a declared ceiling, not a measured spend.
- Contamination: **0 affected runs in either arm**. The gateway's Caveman and Ponytail layers were off.
- Abort: `aborted.kind = "unresponsive"`, three consecutive `spawnSync cmd.exe ETIMEDOUT` at the 180 s
  spawn limit. The answered portion took 4 min 18 s (01:10:52Z-01:15:10Z, ~7 s/run); the three timeouts
  then took 9 min 1 s, and the report was written at 01:24:11Z. Total 13 min 19 s. The same wedge without
  the breaker was measured at 11 runs / 33 minutes and extrapolated to 3.6 hours for 72 runs.

## The instrument lied: a warm cache is not a route change

The archived report says:

> **these runs were not all served by one route**: 17 of 35 answered runs (9 baseline, 8 treatment) sit
> more than 1.6x or under 0.6x away from the campaign's median prompt size (median 41 input tokens,
> largest 5100).

**Retracted.** One model served every run. opencode's own store
(`~/.local/share/opencode/opencode.db`, tables `session` and `part`) records all 42 sessions in the
window with `model = {"id":"beam-free","providerID":"opencode","variant":"default"}`, no exceptions.

The cause is in the parser. A `step-finish` part carries the whole accounting:

```json
{"reason":"stop","type":"step-finish","tokens":{"total":6481,"input":4453,"output":53,"reasoning":119,"cache":{"write":0,"read":1856}},"cost":0}
{"reason":"stop","type":"step-finish","tokens":{"total":6497,"input":36,"output":35,"reasoning":154,"cache":{"write":0,"read":6272}},"cost":0}
```

Both lines are the same prompt. `4453 + 1856 = 6309` cold, `36 + 6272 = 6308` warm: once the provider
has cached the prefix, `tokens.input` reports only the uncached remainder. `tokensOf()` in
`src/opencode.ts` kept `input` and `output` and dropped `cache`, so a warm repeat entered the report as
a 36-token prompt — 175x smaller than the cold one — and `routeSplitOf` read that as a different
upstream. The warning was the instrument measuring its own blind spot.

Fixed at the source and at every consumer: the cache fields are preserved under the names Claude Code
uses (`cache_read_input_tokens`, `cache_creation_input_tokens`), a new `promptTokens()` sums the whole
input side, and the eval medians, `routeSplitOf` and the coding study all use it. Six tests, each watched
failing first; the two that could only fail at module-link level were additionally mutation-proved
(dropping `cache_creation` gives `100` against an expected `600`; returning `0` for a missing input count
gives `0` against an expected `undefined`).

**The kiro measurement is not affected.** All 72 runs in `efficiency-clean` carry
`cache_read_input_tokens = 0` and `cache_creation_input_tokens = 0`, so +738.5 stands as measured. The
Claude path passed `usage` through verbatim and never lost the fields; only the opencode parser dropped
them.

## Recovering the numbers, and proving the mapping

The archived report cannot be re-scored for prompt size — the fields are gone from it. The true counts
were read out of opencode's store instead, and the join to the report was verified three ways before
any statistic was computed:

1. **Count**: 38 run sessions with the probe excluded, against the report's 38 runs.
2. **Order**: session titles chunked six at a time in `time_created` order match the task order the
   report states (`TypeError 'exp' undefi…` for `pres-error-text-01`, `Jawaban satu baris bug…` for
   `pres-path-line-01`, and so on).
3. **Failure placement**: the three zero-token sessions land exactly on the three errored cells —
   `pres-constraint-01` treatment repeat 3, and both arms of `pres-honest-partial-01`.

Repeats are independent, which was the other thing worth checking before trusting them: 42 rows are 42
distinct session ids. Reusing the workspace directory across repeats warms the provider cache but does
not continue a conversation, so repeat 2 never saw repeat 1's answer.

## Token cost: the prediction, tested

Prompt tokens = `input + cache read + cache write`, medians over the answered repeats of each task.

| Task | Baseline | Treatment | Delta | Relative |
|---|---:|---:|---:|---:|
| pres-error-text-01 | 6308 | 6953 | +645 | +10.23% |
| pres-path-line-01 | 6306 | 6951 | +645 | +10.23% |
| pres-test-command-01 | 6302 | 6953 | +651 | +10.33% |
| pres-failing-test-01 | 6305 | 6951 | +646 | +10.25% |
| pres-warning-kept-01 | 6300 | 6948 | +648 | +10.29% |
| pres-constraint-01 | 6308 | 6956 (n=2) | +648 | +10.27% |

- **Difference of arm medians**: 6952 − 6305.5 = **+646.5 tokens**.
- **Median of paired per-task deltas**: **+647 tokens** (range +645…+651, mean +647.17).
- **Relative**: **+10.25%** on a 6305.5-token base.

The prediction recorded before measuring was: absolute overhead stays ~+700 because it is a fixed
amount of text, while the relative figure rises from kiro's ~2.3% to ~15% on a ~4,800 base. The
absolute half held (+647 against +702.5 / +705.5 / +738.5 on kiro — a little lower, same order). The
relative half was **wrong in its denominator**: ~4,800 was the uncached remainder, not the prompt.
opencode's real base prompt is ~6,305 tokens, so the measured relative overhead is +10.25%, between
kiro's ~2.3% and the predicted 15%. The lesson is the general one: relative overhead is a property of
the host's own prompt size, so it cannot be quoted without naming the harness.

## What did not replicate

- **Reasoning dumps: 0 of 18 baseline runs and 0 of 17 treatment runs contain `<thinking>`.** The kiro
  route's 16/30 against 3/30 asymmetry — the entire source of the "51.2% shorter delivered text"
  headline — is simply absent here. With no dumps in either arm, delivered text and answer substance
  are the same measure on this route.
- **Substance: median of paired per-task deltas −2 characters.** Treatment longer on 2 tasks, shorter
  on 4, mean −7.25. The +21.9% substance increase does not replicate; there is no length effect here in
  either direction.
- **Hidden reasoning effort**: median `tokens_reasoning` 162.5 baseline (n=18) against 138 treatment
  (n=17). The treatment reasons somewhat less, in billed tokens the reply never shows. This field was
  also dropped by the old parser and is still not preserved by the new one; it is quoted here from the
  store, not from the report.

## Behaviour: the treatment scores worse on this route

Screens as recorded, and identical when re-scored with the current ruler (same fingerprint):

| | pass | fail | unknown | `require` retention |
|---|---:|---:|---:|---:|
| baseline | 37 | 4 | 4 | **24/24** |
| treatment | 33 | 7 | 3 | **21/23** |

- The two `require` failures are both on `pres-warning-kept-01`: one repeat dropped the deprecation
  warning and the stored-token-format warning together. On kiro, `require` retention was identical in
  both arms (34/39); here the treatment loses content the baseline kept.
- `language`: baseline 10 pass / 4 fail / 4 unknown, treatment 9 pass / 5 fail / 3 unknown. Both arms
  drift to English on this free model, so the Indonesian advantage measured on kiro (19/30 → 27/30)
  does not appear. The screen is closer to measuring the model's ceiling than the layer.
- Passing repeats per task, baseline → treatment: `error-text` 0→1, `path-line` 2→1, `test-command` 3→3,
  `failing-test` 0→0, `warning-kept` 2→1, `constraint` 3→1 (of 2 answered). By that count the treatment
  is better on 1, equal on 2, worse on 3. Counting *failing* repeats instead flips one cell
  (`failing-test` 1→0, because `unknown` is not a failure), which is why no single better/worse headline
  is quoted here.

## Limits

n=6 tasks, one free model, one harness, k=3 — medians, not confidence intervals. Five tasks never ran
and one errored, so this is a partial replication, not a full one. The two tasks missing from the clean
kiro campaign (`pres-decision-evidence-01`, `pres-multiline-kept-01`) are missing here too and remain
unmeasured anywhere. `environment.baseUrlHost` is `null` for opencode because its config is not read —
a known provenance hole, still open. The route wedged twice on this machine; three orphan
`opencode.exe` processes were left alive after the abort because an interactive session of the owner's
cannot be told apart by name.

## Appendix: the raw rows the medians come from

Read out of opencode's `session` table as `tokens_input + tokens_cache_read` (`tokens_cache_write` was 0
on every run). Three repeats per cell, in time order; `0+0` is an errored run and is excluded.

| Task | Baseline | Treatment |
|---|---|---|
| pres-error-text-01 | 4452+1856, 36+6272, 36+6272 | 5097+1856, 5097+1856, 41+6912 |
| pres-path-line-01 | 4450+1856, 4450+1856, 4450+1856 | 5095+1856, 39+6912, 39+6912 |
| pres-test-command-01 | 4446+1856, 30+6272, 30+6272 | 5097+1856, 41+6912, 41+6912 |
| pres-failing-test-01 | 4449+1856, 33+6272, 4449+1856 | 5095+1856, 39+6912, 39+6912 |
| pres-warning-kept-01 | 4444+1856, 28+6272, 28+6272 | 5092+1856, 36+6912, 36+6912 |
| pres-constraint-01 | 4452+1856, 36+6272, 36+6272 | 5100+1856, 5100+1856, 0+0 |

Every sum in a row is the same number cold or warm, which is the check that the recovery is right:
6308 / 6953, 6306 / 6951, 6302 / 6953, 6305 / 6951, 6300 / 6948, 6308 / 6956. Arm medians are then
6305.5 and 6952, and the paired deltas are 645, 645, 651, 646, 648, 648.

## What this changes in the claims

- **The overhead claim survives a second harness.** ~+650 tokens here, ~+700 to +740 on kiro: a fixed
  amount of text, independent of route. The relative figure is not a constant — ~2.3% on Claude Code's
  ~30.9k base prompt, ~10.3% on opencode's ~6.3k.
- **The delivery and substance claims are route properties, not layer properties.** "51.2% less
  scrolling" and "+21.9% substance" must be quoted with the kiro route attached, because on a route
  whose baseline does not leak reasoning dumps both effects vanish.
- **The behaviour advantage is not universal.** On a weak free model the treatment scored 4 fewer
  screen passes and lost 2 `require` passes the baseline kept. One route says the layer adds discipline;
  this one says it can also cost content. Both are measurements, and neither generalises yet.