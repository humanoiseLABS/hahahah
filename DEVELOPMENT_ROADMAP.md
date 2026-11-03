# HAHahah — Development Roadmap

> **Status:** Phase 0 draft for approval. No implementation is authorized by this document.
> **Date:** 2026-11-01
> **Planning assumption:** one developer, part-time, with external cultural/religious reviewers. Estimates are **person-day ranges**, not commitments; reviewer latency is excluded.

---

## Environment baseline (Phase 0 task 1)

Observed on 2026-11-01:

| Item | Observation | Consequence for the plan |
|---|---|---|
| OS | Windows 10.0.26200, x64, Git Bash | Native Windows is a first-class build/test target |
| Node / npm | Node v24.22.1, npm 11.19.1 | Node/TypeScript toolchain is viable without installation |
| Python | 3.14.7 | Available for analysis, not chosen for the shipped CLI |
| Git | 2.55.0.windows.5; workspace is not a Git repository | No Git operations were performed in Phase 0 |
| Claude Code | 2.1.278 installed; headless JSON, budget, schema, bare/safe modes available | Reference harness and eval runner can be built locally |
| Other harness CLIs | No `codex`, `cursor-agent`, `gemini`, or `aider`; `qoder`/`qc-cli` not on PATH | Only Claude Code can be verified end-to-end now |
| Qoder environment | Skills/plugins and agent configuration under `~/.qoder`; not on PATH in this shell | Useful for post-MVP Qoder adapter and local skill testing; not the reference harness |
| Isolation | No Docker, no WSL (`docker --version`; `wsl -l -q`) | Destructive tests must be simulated or deferred; native Windows shell execution is unsandboxed |
| Workspace | Empty, no existing project files | The seven Phase 0 documents are the only artifacts; no unrelated files were touched |

**Tooling decision implication:** the build must be cross-platform Node, not a shell/PowerShell pipeline. Evaluation is possible for non-destructive tasks; destructive/autonomous tests require an approved isolated environment.

---

## 1. Sequencing principle

Build the **smallest vertical slice** that proves the architecture, then harden content and measurement:

```text
Phase 0  Research + decisions
Phase 1  Contracts, compiler, core content
Phase 2  Reference adapter end-to-end + eval v0
Phase 3  Three personas + cultural/safety review
Phase 4  Measurement, docs, release 0.1.0
Phase 5  Post-MVP adapters and distribution
```

Why this order:

- **Integration risk is retired early.** Phase 2 installs a real profile into a real harness; if the harness semantics break the model, we learn before writing three full persona packs.
- **Content review runs in parallel where possible,** but no persona is released without sign-off.
- **Measurement starts in Phase 1** (static budgets) and becomes a release gate in Phase 4. It is not left to the end.
- **No adapter multiplication until the boundary is proven.** One real adapter, a fake adapter for contract tests, and a Qoder compatibility assessment are enough for 0.1.0.

---

## 2. Phase 0 — Research and architecture (current)

**Objective:** establish a technically grounded foundation and obtain approval.

**Deliverables**

- `PROJECT_OVERVIEW.md`
- `ARCHITECTURE.md`
- `MVP_SCOPE.md`
- `INTEGRATION_RESEARCH.md`
- `DEVELOPMENT_ROADMAP.md`
- `TECHNICAL_RISKS.md`
- `INITIAL_DECISIONS.md`

**Exit gate**

- The owner has reviewed and approved (or amended) the decisions in `INITIAL_DECISIONS.md`.
- The reference harness, adapter scope, name/license, evaluation budget, and review plan are decided.
- No production code has been written.

**Stop condition:** if the owner rejects the canonical-source-plus-adapters model, return to Phase 0 rather than patching it during implementation.

---

## 3. Phase 1 — Contracts and foundations

**Objective:** make the canonical model real and testable before generating any harness files.

**Estimated effort:** 5–8 person-days (including the Qoder assessment).

**Workstreams**

| Workstream | Deliverables | Notes |
|---|---|---|
| Repository scaffold | Node 24 + TypeScript build tool, lint/format, test runner, CI skeleton | Build-time only; generated artifacts stay pure Markdown/YAML |
| Schemas | JSON Schemas for profile, persona, lexicon, culture entry, config, manifest | Validation errors are actionable |
| Compiler skeleton | Load → validate → resolve → compose → tokenize → render interface → write plan | No real adapter yet; a fake adapter exercises the contract |
| Token ledger | Local tokenizer integration, per-artifact budget report, calibration hooks | Use `gpt-tokenizer` locally; reconcile with provider counters later; record MAPE |
| Core policies v0 | Identity, safety, decision policy, efficiency contract | Always-on digest target ≤420 tokens (measured 420 in Phase 3); full policy text shipped as references; reviewed for conflicts |
| Culture KB seed | ID Gen Z lexicon with decay classes, dev/absurd humor, meme notes, humor boundaries, religious-expression etiquette; Javanese ngoko/madya/krama map + Banyumasan notes | Smaller reviewed set; high-confidence, fully sourced; no listicle-only entries; no filler |
| One persona draft | RUSUH pack with manifest, voice, lexicon, examples, tests | Draft only; review pending |
| Golden test harness | Deterministic compose/render snapshots; schema/link/banned-pattern/budget tests | Cross-platform line endings |
| **Qoder assessment** | Status report: documented / experimentally verified / unknown; scratch-repo AGENTS.md + skill test; no compatibility claim | Required by D-026; stop if CLI cannot be run |

**Exit gate**

- `hahahah build` (or the current build entry point) produces deterministic output for the fake adapter.
- Schema, link, banned-pattern, and budget tests run in CI on Windows and Linux.
- Core policies are reviewed and within the proposed budget.
- Culture KB structure is proven with a small, fully sourced set; no unreviewed slang is presented as usage guidance.
- RUSUH draft exists but is **not** releasable; reviews are marked pending.
- Qoder assessment report is complete with evidence, or explicitly marked incomplete; no compatibility claim is made.

**Risks addressed:** R-05 (slang decay), R-06 (religious fabrication), R-11 (instruction conflicts), R-13 (evaluation validity), R-16 (licensing of sources), R-29 (Qoder compatibility claim).

---

## 4. Phase 2 — Reference vertical slice

**Objective:** install a working profile into Claude Code and prove the full pipeline, including a safe uninstall.

**Current status (2026-11-01):** adapter, install/uninstall/doctor, eval runner v0, smoke suite, and quickstart are implemented. Structural install lifecycle passes. Live smoke ran 5/5 tasks at $0.3954; the two content findings it produced (language drift, religious ruling inside a refusal) were addressed in Phase 3 and the raw transcript is preserved at `docs/evidence/phase-2-live-smoke/`. The model/provider remains unpinned. See `docs/phase-2-integration-findings.md`. No release claim yet.

**Estimated effort:** 5–8 person-days.

**Workstreams**

| Workstream | Deliverables | Notes |
|---|---|---|
| Claude Code adapter | `CLAUDE.md` managed block; `.claude/skills/hahahah-<persona>/SKILL.md`; references; manifest | No hooks, subagents, output styles |
| Install/uninstall/doctor | Dry-run, diff, atomic writes, manifest verification, residue check | Refuse unmanaged overwrite |
| Eval runner v0 | Temp repo, baseline vs treatment, headless Claude Code, JSON capture, cost cap | Baseline uses `--bare` or no managed block; document differences |
| Smoke suites | ~10 persona, ~10 decision, ~5 coding, ~5 safety scenarios | Not the final suites; enough to find integration failures |
| Windows smoke test | Install, ask, uninstall on native Windows | Disclose unsandboxed shell execution |
| Quickstart draft | Install → verify → use → uninstall | Written from the real workflow, not aspiration |

**Exit gate**

- A fresh repository installs a profile with one documented command and gets an in-persona answer in one session.
- Re-running install is byte-identical; uninstall leaves no managed residue.
- `doctor` detects a manually corrupted managed block and refuses to guess.
- Eval runner produces a report with result, cost, and token counts; no bypass flags.
- A written "integration findings" note records any mismatch between docs and actual behavior.
- The portable `AGENTS.md` renderer remains deferred; its absence does not block the slice.

**Risks addressed:** R-01 (correctness), R-02 (token overhead), R-09 (install safety), R-10 (destructive actions), R-12 (harness drift), R-14 (Windows).

**Decision checkpoint:** human review of the working slice before writing final persona content. If the adapter model is wrong, fix it here.

---

## 5. Phase 3 — Personas and cultural/safety hardening

**Objective:** complete RUSUH, HALAL, and JAWA; pass cultural, decision, and safety gates.

**Current status (2026-11-03):** started with the two Phase 2 content findings. The always-on core gained a language policy, an explicit no-religious-ruling rule, and "a user can waive scope, not truth" (D-032); `culture/id/religious-expression.md` and the four expanded core policies now mount as skill references (D-031; reference target 4,000 → 4,600 on the measured 4,520). The suites are authored **and executed**: `evals/decisions.yaml` (24 tasks), `evals/safety.yaml` (18), and smoke (5) ran 94 paired runs on the live provider, every task screened by `language` + `require`/`forbid`, with patterns compiled at suite load. Measured: baseline answered English on 29/47 tasks vs the treatment on 4; the layer costs +710 input tokens/run, and the apparent +95% cost was provider accounting spikes rather than the persona (`docs/phase-3-live-suite-results.md`). Open (owner decision): one comply-under-pressure scenario still fails its screen ambiguously, both arms confabulate file paths when the prompt implies unseen code, screens cannot judge semantics, the runner now implements k repeats with medians and alternating order (`--repeats`), so a cost claim no longer rests on one run. Session spend ≈$16.9. HALAL and JAWA packs are drafted against `MVP_SCOPE.md` §6.3/§6.4 with `halal-id` and `jawa-id` profiles; `evals/preservation.yaml` (12 tasks) closes the last unauthored Phase 3 gate: whether warnings, failing test names, exact paths, commands, numbers and the "not everything was checked" admission survive a deliberately short answer. The safety suite grew from 18 to 23 by widening the injection family to 10 vectors (tool output, encoded comment, tampered manifest, commit message, log line). The Javanese register map now carries its own schema (`hahahah.culture.registers/v1`) so it can actually be mounted instead of sitting unreachable in the repo, and the JAWA voice is test-pinned to every pronoun and marker in that map. Neither new persona has been executed against a model, and all reviewer sign-offs are still open.

**Estimated effort:** 8–12 person-days plus reviewer latency.

**Workstreams**

| Workstream | Deliverables | Notes |
|---|---|---|
| Content completion | Three complete persona packs, voice contracts, lexicons, examples, tests | No builder; reviewed profiles only; context gate and decay classes enforced |
| Culture review | Indonesian slang/dev humor review; Javanese ngoko/madya/krama and Banyumasan review; Islamic-content review; legal/SARA sensitivity review | Reviewers sign entries; uncertainty recorded; Banyumasan uses Banyumasan forms, not Jogja krama |
| Serious mode | Trigger rules, incident/distress scenarios, persistence behavior | Tested, not just described |
| Decision suite | ~20-scenario suite across all classes | Action accuracy measured |
| Safety red team | ~15 adversarial scenarios; prompt injection, SARA, religious fabrication, destructive actions, secret exfil | Zero critical failures |
| Information preservation | Efficiency suite for warnings, code, errors, constraints | No blind truncation |
| Persona suites | 12–15 scenarios per persona; rubric, repetition, emoji, register | Judge calibration + human audit |
| Coding fixtures | 60 micro-tasks with executable tests + hidden holdout; reusable for token measurement | Authored here to keep Phase 4 runnable |

**Exit gate**

- Persona rubric median ≥4/5 and no dimension below 3/5 (proposed).
- Decision action accuracy ≥85% (proposed); 100% confirmation on critical destructive scenarios.
- Zero critical safety failures.
- All three personas have recorded human sign-off, including legal/SARA sensitivity; no pending review in a release profile.
- Culture entries have sources, contexts, avoid-conditions, decay class, offensiveness, caps, and expiry/review dates.

**Stop conditions**

- A persona cannot meet the cultural bar with available reviewers → do not release it; ship a smaller, reviewed scope only with explicit approval.
- Correctness drops beyond the approved regression guard → fix the persona/efficiency rules before continuing.
- Safety critical failure cannot be mitigated → release blocked.

**Risks addressed:** R-03 (harassment), R-04 (caricature), R-05 (slang decay), R-06 (religious accuracy), R-07 (Javanese register), R-08 (prompt injection), R-15 (maintenance), R-18 (trust).

---

## 6. Phase 4 — Measurement, docs, release

**Objective:** produce an honest, reproducible `0.1.0` release.

**Estimated effort:** 6–9 person-days (excluding model spend).

**Workstreams**

| Workstream | Deliverables | Notes |
|---|---|---|
| Pilot calibration | 10–20 tasks/requests; estimate discordance ψ and token CV; freeze N and stopping rule | Required before claiming the 60-task guard or token result is adequate |
| Coding regression guard | 60 private tasks + hidden holdout; baseline vs treatment; k=3 runs per task; point-estimate guard at −10 pp; paired 95% CI | Formal 10 pp non-inferiority needs ≥80 paired tasks (provisional; pilot-calibrated) and is post-MVP unless the suite is expanded; underpowered → "inconclusive" |
| Efficiency benchmark | 60 paired tasks for a ~15% effect (provisional; pilot CV required); k=3; alternating order; cold/warm cache; CI | Report overhead and net delta; label provisional |
| Reports | Markdown + JSON; pinned model/harness/date; commands; limitations | Commit sanitized reports |
| Docs | Quickstart, architecture, authoring, security/limitations, evaluation methodology | No undocumented behavior |
| Release mechanics | Versioning, manifest, license, name, repository, changelog | Owner approval |
| Final audit | No telemetry/network, no executable packs, no pending reviews, no bypass flags | Checklist |

**Exit gate**

- `MVP_SCOPE.md` definition of done is satisfied.
- Coding regression guard met (point estimate no worse than −10 pp, CI published); formal non-inferiority is post-MVP or achieved with a pilot-calibrated ≥80-task sample; underpowered results are labeled inconclusive.
- Pilot calibration completed or explicitly reported as provisional.
- Efficiency report published; no unmeasured claim.
- Human reviews signed; security limits documented.
- Release notes state what is supported, what is not, and what was not measured.

**Release decision:** the owner approves `0.1.0`. A technical preview may ship without a persona only with explicit approval and a clear label; unreviewed cultural/religious content must not ship.

---

## 7. Phase 5 — Post-MVP (not committed)

Order is chosen by risk and user value, not novelty:

1. **Portable `AGENTS.md` renderer** — lowest-common-denominator always-on target; confirms the canonical content is not Claude-specific.
2. **Qoder adapter** — only if the Phase 1 assessment passes; verify headless/eval behavior, managed blocks, and standard compliance. No claim before a real test.
3. **Codex adapter** — AGENTS.md + `.agents/skills`; `codex exec` eval.
4. **Gemini CLI adapter** — `GEMINI.md`/context filename + skills; consent model needs UX care.
5. **Cursor adapter** — rules + skills; IDE-first evaluation, less automation.
6. **Copilot adapter** — only after a clear precedence/safety story; personal instructions outrank repository rules.
7. **Hooks/subagent guardrails** — only after the instruction layer is stable and the portability cost is understood.
8. **Plugin distribution** — marketplace/plugin packaging, supply-chain review.
9. **Additional personas/locales** — only with review capacity.
10. **Neutral/efficiency-only profile** — if not already shipped as the `core-id` control.

Explicitly not planned: chatbot, GUI, browser extension, model training, persona marketplace, trait builder.

---

## 8. Workstream map

| Workstream | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Engineering | Compiler, schemas, CLI skeleton | Adapter, install, eval runner | Test harness, fixes | Release mechanics |
| Content | Core + culture seed + RUSUH draft | Minimal persona content for smoke tests | Three complete packs + review | Final copy, docs |
| Evaluation | Static tests, token ledger, Qoder assessment | Smoke suites, report v0 | Lean suites, red team, coding fixtures | Regression guard + efficiency benchmark |
| Review | Core policy review | Integration review | Native/religious/safety sign-off | Release audit |
| Docs | Contributor skeleton | Quickstart draft | Authoring/security notes | Complete docs |

---

## 9. Review checkpoints and approvals

| Checkpoint | What is reviewed | Owner action |
|---|---|---|
| **G0** | Phase 0 documents and decisions | Approve/adjust; authorize Phase 1 |
| **G1** | Core policies, schemas, budget model, culture structure, Qoder assessment report | Approve direction; no real adapter yet; no Qoder compatibility claim unless tested |
| **G2** | Working integration, install/uninstall, eval v0 | Approve content investment or change adapter |
| **G3** | Persona content, cultural/religious sign-off, safety | Approve release candidate |
| **G4** | Final measurement report, limitations, license/name | Approve `0.1.0` |

No gate can be skipped silently. A skipped gate must be recorded in `INITIAL_DECISIONS.md`.

---

## 10. Continuous obligations

- **Culture review cadence:** quarterly for slang and humor, with expiry by decay class (6 months global/meme, 12–24 months local, 12 months then re-check KBBI colloquial); before any release for religious content; Banyumasan content reviewed whenever changed; legal/SARA sensitivity reviewed whenever identity, accent, or roast content changes.
- **Expiry enforcement:** release builds fail on expired entries.
- **Harness drift:** re-check Agent Skills spec, Claude Code docs, and (after assessment) Qoder docs/behavior before each release; keep the portable `AGENTS.md` target post-MVP.
- **Tokenizer/pricing drift:** re-check before publishing any benchmark; cache minimums and write premiums change.
- **Eval cost ledger:** every run records model, harness, date, task count, and USD cost; no unbounded spending.
- **Security reports:** a documented path for reporting prompt-injection, harassment, religious, or install-safety issues; content can be yanked by version.
- **No silent updates:** upgrading the profile is an explicit build/install action.

---

## MVP feasibility review (solo developer, limited budget)

**Planning assumptions**

- One developer, part-time; no paid implementation help.
- Reviewer time is volunteer/limited; model spend is capped and approved.
- No new infrastructure (no Docker/WSL/VM) unless explicitly approved.
- The five systems and three personas are non-negotiable; evaluation depth and adapter count are not.

**Cost drivers, in order**

1. Culture content authoring and native/religious review.
2. Coding fixtures and benchmark runs.
3. Persona/decision/safety suite authoring and judge calibration.
4. Documentation, release mechanics, and regression maintenance.

**Lean choices applied to `0.1.0`**

- Claude Code only; portable `AGENTS.md` and Qoder adapters deferred.
- Qoder is a Phase 1 assessment, not an integration deliverable.
- 12–15 persona scenarios/persona, ~20 decision, ~15 safety, 10 reviewed responses/persona.
- 60-task coding guard and 60 paired token tasks (reuse coding/efficiency fixtures); formal 80+ NI is post-MVP.
- One pinned model; no cross-model claims.
- Smaller culture KB seed with stricter sourcing; no filler.

**Deferred without architectural compromise**

- Portable `AGENTS.md` renderer and Qoder adapter.
- Formal non-inferiority and expanded suites.
- Hooks, subagents, output styles, plugins, additional locales.
- Bilingual documentation and graphical tooling.

**Budget/reviewer failure rule:** if the eval budget or a required reviewer is unavailable, do not claim the gate. Ship a labeled technical preview or delay; never fabricate a review or a benchmark.

---

## 11. Effort summary

| Phase | Person-days (estimate) | Calendar note |
|---|---|---|
| 0 | included in this study | — |
| 1 | 5–8 | includes Qoder assessment; add review latency for core/culture seed |
| 2 | 5–8 | add harness/auth setup; Windows testing |
| 3 | 8–12 | reviewer scheduling is the main variable; includes lean suites and coding fixtures |
| 4 | 6–9 | model spend and report iteration |
| **Total** | **24–37** | part-time calendar time is longer; not a delivery promise |

The engineering portion is smaller than the content/review portion. Planning that assumes otherwise will under-budget the cultural and religious work, which is the actual differentiator.

---

## 12. Go/no-go rules

Proceed to the next phase only if:

- The previous phase's exit gate is met in writing, not by verbal assurance.
- No unresolved critical safety issue exists.
- Budgets and reviews are current.
- The owner has approved the next phase.

Stop or re-scope if:

- The reference harness cannot support the required file layout or managed writes.
- The persona consistently degrades correctness beyond the approved margin.
- Cultural or religious reviewers cannot be secured.
- Evaluation cannot be run within an approved budget/isolated environment.
- The Qoder assessment cannot produce evidence; no Qoder compatibility claim may be made (this does not block the Claude Code MVP).
- The project drifts toward a chatbot, GUI, builder, or marketplace.

---

*End of roadmap. Implementation begins only after G0 approval.*
