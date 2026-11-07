# CCI Phase 2 — pilot report

**Status: pilot complete (5 scenarios, paired, k=1); human scores not collected yet. Full 15-scenario
evaluation NOT started — waiting for approval.**

Two providers were tried. The first refused; the second answered. Nothing below is extrapolated
beyond the five scenarios that ran.

## 1. Provenance

| Field | Value |
|---|---|
| Harness | Claude Code `2.1.319` (`--harness claude`) |
| Model | `tes`, pinned with `--model tes` through the local route (`environment.baseUrlHost` = `127.0.0.1:20128`) |
| Suite | `evals/cci` — fingerprint `b7796d9011215943` |
| Runs | 1 repeat, paired baseline/treatment, arm order alternating |
| Budget | `--budget-usd 0.40` per run (soft ceiling passed to the harness) |
| Pilot spend | **$1.6337** for 10 runs / 20 calls |
| Total spend incl. validation and probes | **$2.3832** |

## 2. Providers

1. **opencode / beam-free — refused.** `AI_APICallError: Free usage limit reached` logged
   `2026-11-07T04:26:22Z`, under a second after the request; the probe stopped the campaign with
   **0 runs**. No scenario was measured on that route and no second attempt was made.
2. **Claude Code / `tes` — answered.** The CLI prints a warning line
   `[claude-code:unrecognized_model] {"model":"tes"}` before its JSON result. The old runner parsed
   the whole stdout as one JSON object and would have recorded a working run as
   "Harness output was not JSON"; `parseClaudeResult` now scans lines backwards for the last JSON
   object, with a regression test.

## 3. Automated results

| Scenario | Capability | Baseline | Treatment | Why |
|---|---|---|---|---|
| `cci-cult-slang-context-01` | cultural awareness | **fail** | **fail** | baseline answered English on both turns and repeated "re in a temporary"; treatment answered Indonesian but repeated "biar aku liat apa" |
| `cci-cont-callback-01` | continuity | **fail** | **unknown** | baseline English; treatment carried the deploy context but turn 2 was mixed language (id=9 en=11), which the screen reports as undecided, not as failure |
| `cci-impr-roast-01` | improvisation | **fail** | **fail** | both arms answered English on both turns |
| `cci-lang-jv-switch-01` | local language | **fail** | **pass** | baseline English; treatment read the Javanese switch and answered Indonesian (`"Wes, error e apa?"`) without claiming a dialect |
| `cci-social-deescalate-01` | social fluency | **pass** | **pass** | both dropped the banter on the outage turn and named a first step |

Screens: baseline 1 pass / 4 fail; treatment 2 pass / 2 fail / 1 unknown.

Two observations worth carrying into the full run:

- **The language rule is the biggest observable difference.** With the same model, the baseline
  answered in English in 4 of 5 scenarios; the treatment did so in 1 of 5 and one more was mixed.
  The exceptions are real: the treatment answered English on `cci-impr-roast-01`, where the baseline
  did too, so the trigger looks like the model's register for roast banter rather than the scenario.
- **`repeat` fires in both arms.** The treatment repeated a four-word run in
  `cci-cult-slang-context-01`; the baseline did it in three scenarios. The check is lexical (a
  shared four-word run), so it is a floor: a rephrased identical joke passes it.

## 4. Cost, tokens, latency (measured)

| Scenario | Baseline cost | Treatment cost | Baseline in/out | Treatment in/out | Baseline ms | Treatment ms |
|---|---:|---:|---:|---:|---:|---:|
| cult-slang-context | $0.17473 | $0.16641 | 58,624 / 1,625 | 58,512 / 1,335 | 28,048 | 10,744 |
| cont-callback | $0.16388 | $0.16511 | 55,792 / 1,610 | 58,013 / 1,451 | 12,910 | 8,937 |
| impr-roast | $0.17168 | $0.17066 | 56,137 / 2,163 | 58,177 / 1,716 | 12,954 | 7,932 |
| lang-jv-switch | $0.15433 | $0.15809 | 55,404 / 902 | 62,469 / 3,729 | 4,680 | 125,025 |
| social-deescalate | $0.15138 | $0.15746 | 49,892 / 515 | 43,495 / 304 | 62,933 | 71,773 |
| **median** | **$0.16388** | **$0.16511** | **55,792 / 1,610** | **58,177 / 1,451** | **12,954** | **10,744** |

Reading honestly:

- **Token overhead is not separable from this run.** Input tokens are summed over turns and the
  models chose different numbers of tool turns (the baseline used 11 turns in the first scenario,
  the treatment 4), so the +2,385 median input difference mixes the layer's text with different
  interaction lengths. The layer's fixed text cost is the measurement to quote: **473 always-on
  tokens + 3,884 compiled reference tokens if the skill is read**, measured offline.
- Cost per run is effectively unchanged (+$0.0012 median); the provider bills by tokens, and the
  treatment wrote fewer output tokens.
- Latency is heavy-tailed: 4.7–125 s for the treatment, 4.7–63 s for the baseline. n=5, so no
  latency claim.
- `$0` rows do not exist here — this route is billed. The earlier opencode campaign was free-tier
  and its cost was a declared ceiling, not a spend.

## 5. Human evaluation

The reviewer pack exists: `docs/evidence/cci-phase2/pilot-anon/` — five files, each with the
conversation, the objective, expected qualities and failure conditions, and the two answers as
**A** and **B**. Arm order is decided by a recorded seed; the key is in
`docs/evidence/cci-phase2/pilot-key/MAP.json` and must stay out of the reviewer's hands.

Scores were collected from one reviewer (the owner) and analysed in `pilot-analysis.md`: RUSUH is
ahead in 4 of 5 scenarios, baseline ahead by 0.20 in improvisation, with the reviewer also the
layer's author. English answers were reviewed through Indonesian translations prepared by the same
author. Single reviewer, so no consensus and no significance claim. The model under evaluation was
not asked to judge its own output.

## 6. What the pilot can and cannot establish

**Can say:** the paired runner works against a live model; the transcript is delivered and each
turn's screens judge that turn; on this model, the layer changed the answer language in 3 of the 4
scenarios where the baseline drifted to English, and changed nothing in the scenario both handled
well.

**Cannot say:** whether RUSUH understands culture better. n=5, one model, one harness, k=1, no
repeats, no reviewer scores. The two treatment failures are visible, and one of them (English in the
roast scenario) is exactly the kind of failure the layer exists to prevent — but with one model it
cannot be attributed between the layer and the model's own register.

**Which failures are the layer's:** the language rule did not hold on `cci-impr-roast-01`; the
anti-repetition rule did not hold on `cci-cult-slang-context-01`. **Which are the model's:** the
baseline's English everywhere shows the model's default; the layer overrides it most of the time.

## 7. Full run — needs approval

15 scenarios × 2 arms × 2 turns, k=1, at the same ceiling: **about $4.9 in measured cost** if the
treatment behaves like the pilot (median $0.165/run × 30 runs), plus roughly $0.5–1.5 if tool-turn
counts vary as they did here. A k=3 full run would be ~3× that and is not recommended before the
screens and rubric are validated on the larger sample.

Not started, per the brief. Human scoring is the other half of the evaluation and needs a reviewer
who is not the layer's author.

## 8. Artifacts

- `evals/cci.yaml` — 15 scenarios, 3 per capability.
- `CCI_PHASE2_PLAN.md`, `CCI_HUMAN_RUBRIC.md`.
- `docs/evidence/cci-phase2/step5-validate-b/` — the accepted single-scenario validation
  (`report.json`, `report.md`); `step5-validate/` is the earlier attempt that hit the budget.
- `docs/evidence/cci-phase2/pilot/` — pilot report and raw outputs.
- `docs/evidence/cci-phase2/pilot-anon/` + `pilot-key/` — reviewer pack and its key.

## 9. Earlier blocker, kept for the record

Before the model was chosen, the opencode campaign stopped at its route probe with
`Free usage limit reached` and **nothing was measured**. That attempt is preserved above in §2; no
scenario result from that route exists.
