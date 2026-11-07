# CCI Phase 2 — evaluation plan

Design for measuring RUSUH's conversational cultural intelligence. This is an **evaluation** phase:
no persona text changes, no tuning after partial results. Phase 1 (`docs/cci-phase1-report.md`)
built the instruments; this plan uses them.

## 1. What the harness can and cannot do

| Capability | Status | Evidence |
|---|---|---|
| Multi-turn scripts | Works, as **replay** | `EvalTask.turns`; each call carries the transcript so far (`withTranscript`) |
| Native session resumption | **Not supported** | `runClaude` spawns with `--no-session-persistence`; enabling it would leak state between runs |
| Per-turn screens | Works | `turn.checks`, detail prefixed `turn N:` |
| Cross-turn repetition | Works, lexical | `repeat` check: shared four-word run between consecutive turns |
| Paired baseline/treatment | Works | `runEval` runs both arms per repeat, alternating order |
| Cost control | Partial | `--budget-usd` is a per-run ceiling passed to the harness; quota/refusal aborts the campaign; a soft cap, not a hard ledger |
| Latency | Recorded per run | `durationMs` from the harness, wall clock for opencode |
| Model identity | Recorded per report | `--model` pin + `environment.baseUrlHost`; opencode reports no model, so the pin is the provenance |
| Human blinding | Not automated | outputs must be exported and shuffled by hand for now; procedure in `CCI_HUMAN_RUBRIC.md` |

A scenario that needed true session state (tool state carried across turns) cannot be evaluated
here, and none of the 15 requires it.

## 2. Dataset — `evals/cci.yaml`

15 scenarios, 3 per capability. Every scenario is a 2-turn script, carries `objective`, `expect`,
`failIf`, `human` guidance, and only the deterministic screens that guard an obvious failure
(language, a dialect guess, a personal insult, banter during an incident). The dataset deliberately
does **not** demand specific slang: that would reward keyword insertion.

| id | capability | what it presses |
|---|---|---|
| `cci-cult-slang-context-01` | cultural awareness | reads *gabut/mager* as low energy and still answers the request |
| `cci-cult-irony-01` | cultural awareness | reads "deploy Jumat jam 5, pasti aman kan? wkwk" as worry, not reassurance |
| `cci-cult-meme-unknown-01` | cultural awareness | handles an unfamiliar reference honestly |
| `cci-cont-callback-01` | continuity | resolves "jadi gimana tadi?" to the deploy plan |
| `cci-cont-context-01` | continuity | carries `ECONNREFUSED :5432` into the next turn |
| `cci-cont-joke-01` | continuity | continues a bit without repeating the line (`repeat` check) |
| `cci-impr-unexpected-01` | improvisation | answers a dream about a 404, then the real question |
| `cci-impr-analogy-01` | improvisation | race condition explained through a warung kitchen |
| `cci-impr-roast-01` | improvisation | roasts a concrete setup, not the person |
| `cci-lang-jv-switch-01` | local language | Javanese code-switch, Indonesian answer, no dialect claim |
| `cci-lang-banyumasan-01` | local language | Banyumasan sentence, no mockery, real help |
| `cci-lang-abbrev-01` | local language | "bsk dpl gk bsa… err 500" decoded |
| `cci-social-tease-01` | social fluency | teases back at the code, not the person |
| `cci-social-deescalate-01` | social fluency | banter drops when production goes down |
| `cci-social-endbit-01` | social fluency | stops the joke when asked for the fix |

## 3. Conditions

Both arms use the same model, the same per-run budget, the same harness and the same workspace
policy. The only difference is whether the treatment workspace has RUSUH installed (the existing
`install()` step). Runs are paired per scenario and the arm order alternates every second repeat, as
in every other campaign.

Model choice is recorded in the report. If the provider refuses, the campaign stops; **no silent
substitution of provider or model**.

## 4. Pilot (do this first)

Five scenarios, one per capability:

- `cci-cult-slang-context-01`
- `cci-cont-callback-01`
- `cci-impr-roast-01`
- `cci-lang-jv-switch-01`
- `cci-social-deescalate-01`

Before the pilot, one scenario runs alone to prove paired execution and transcript delivery. Stop
and report if: the arms cannot be compared, the transcript is not delivered, the provider refuses,
the budget cannot be enforced, outputs are incomplete, or a scenario cannot be judged.

Command shape (one scenario, k=1):

```
node src/cli.ts eval --profile rusuh-id --suite cci --harness claude \
  --model tes --task cci-cult-slang-context-01 --repeats 1 \
  --budget-usd 0.40 --out docs/evidence/cci-phase2/step5-validate
```

Pilot: same flags with all five task ids and `--out docs/evidence/cci-phase2/pilot`.

Measured route: `opencode/beam-free` refused at the probe (`Free usage limit reached`, 0 runs), so
the pilot ran on Claude Code 2.1.319 with the `tes` model pinned through `127.0.0.1:20128`. At
$0.10/run the treatment could not finish (it iterated 14 turns and hit the ceiling); $0.40 is the
ceiling both arms complete under. See `docs/evidence/cci-phase2/pilot-report.md`.

## 5. Human evaluation

See `CCI_HUMAN_RUBRIC.md`. Outputs are exported per scenario, arm labels stripped, order shuffled
with a recorded seed, and scored 1–5 on five dimensions by two reviewers where available. The model
under evaluation is never the sole judge.

## 6. Analysis

Report per capability and per dimension, as paired differences — never one overall score. Report
automated screens separately from human scores, and state reviewer disagreement rather than
averaging it away. Name which failures are the layer's and which are the model's, and list what the
sample cannot establish (n=5 in the pilot, n=15 at most afterwards, one model, one harness).

## 7. Token and cost comparison

Measured provider usage is reported per arm (input, output, total, cost), plus the layer's fixed text
cost measured offline: always-on 473 tokens, compiled references 3,884. Estimates are labelled as
estimates; free-tier runs report $0.0000 and are a declared ceiling, not a spend.

## 8. Constraints

No persona edits, no Adaptive Interaction Engine changes, no Phase 1 regression, no new modules or
dependencies, no retrieval, no conversation memory in the layer, no credentials in reports.
