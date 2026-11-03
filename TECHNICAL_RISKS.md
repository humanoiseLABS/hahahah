# HAHahah — Technical Risks

> **Status:** Phase 0 risk register for approval.
> **Date:** 2026-11-01
> **Scoring:** L = likelihood, I = impact (Low / Medium / High). Scores are qualitative and must be re-scored after the Phase 2 vertical slice.

---

## 1. Risk register

| ID | Risk | L | I | Detection | Primary mitigation | Trigger / fallback |
|---|---|---|---|---|---|---|
| **R-01** | Persona degrades technical correctness or encourages sycophancy | M | H | 60-task coding regression guard + CI; sycophancy scenarios; human audit | Competence contract in core; persona cannot change verification; hidden holdout; formal NI only with a pilot-calibrated sample (provisional ≥80) | >10 pp point-estimate drop, CI indicating large degradation, or any fabricated validation → disable persona depth, fix, re-run |
| **R-02** | Personality tokens cost more than the efficiency layer saves; savings claimed without evidence | M | M | Static ledger; cache-aware paired benchmark; CI; pilot CV | Small always-on card; progressive disclosure; dedupe; no claim below 2× MAPE; publish null results | Net token increase after the provisional 60-task pilot, or underpowered/high-CV result → reduce card/depth, add tasks, or report inconclusive |
| **R-03** | RUSUH humor becomes harassment, SARA, sexual content, threats, or legal-risk defamation | M | H | Red-team suite; native review; user reports | Roast code/tool/situation only; banned identity/accent targets; no profanity or real names; serious mode; zero critical gate; legal/SARA review | Any identity attack or legal-risk joke → remove phrase, retest, yank version if released |
| **R-04** | Cultural caricature, especially Banyumasan and Javanese register; "Ngapak/medok/jawir" mockery | H | M/H | Native review; reviewer confidence notes; scenario tests | Prefer "Banyumasan"; context tags; dialect opt-in; no phonetic spelling or accent performance; use Banyumasan krama, not Jogja krama inggil; uncertainty labels; native sign-off | Reviewer objection → remove dialect content; keep neutral Javanese |
| **R-05** | Slang decays quickly and content feels dated or forced | H | M | Expiry dates by decay class; quarterly review; feedback | 6 months for global/meme, 12–24 months for local slang, 12 months then re-check for KBBI colloquial; no auto-scrape; caps and context rules | Expired entries → release build fails; remove or refresh |
| **R-06** | Fabricated Qur'an/hadith/ruling; religious misinformation or sectarian bias | M | H | Source-required lint; religious reviewer; adversarial prompts | Qur'an quotes use Kemenag LPMQ-verified text; hadith requires source/number/grading; no uncited quotations; no fatwas; defer; neutral across NU/Muhammadiyah; no ranking or jokes | Any fabricated citation or sectarian ranking → block release; errata; remove path |
| **R-07** | Javanese register misselection offends or reads as fake | H | M | Native review; scenario tests; feedback | Model ngoko/madya/krama + honorific lexicon; no level mixing; no krama inggil for self; ask when unclear; Banyumasan forms, not Jogja krama | Misregister in review → default to respectful Indonesian/Javanese mixed; reduce confidence |
| **R-08** | Prompt injection through repo content, dependencies, issues, or web text | H | H | Red-team injection scenarios; incident reports | Treat content as data; never follow embedded instruction changes; harness permissions; no secrets | Successful injection → fix core wording, add regression; disclose residual risk |
| **R-09** | Install overwrites user files, corrupts `CLAUDE.md`/`AGENTS.md`, or uninstall removes unrelated content | M | H | Manifest/hash tests; dry-run; doctor; code review | Managed blocks; allowlisted paths; atomic writes; refuse unmanaged overwrite; manifest-owned uninstall | Hash mismatch → show diff, require `--force`, preserve user content |
| **R-10** | Destructive or shared action without informed consent; permission bypass | M | H | Decision suite; permission tests; red team | Risk classes; explicit confirmation; no bypass flags; prefer reversible; harness permissions | Any unconfirmed destructive action → block release; fix policy; human review |
| **R-11** | Instruction hierarchy conflict; project/user instructions override core or safety | H | H | Conflict scenarios; host precedence tests; documentation review | Core conflict clause; avoid contradictory text; never claim enforcement; rely on harness permissions; document Copilot's personal > repo order | Host instruction overrides safety in a harmful way → surface conflict, stop, ask; recommend harness policy |
| **R-12** | Harness format or behavior drifts; adapter silently breaks | H | M | Contract tests; version pin; docs diff; doctor | Adapter compatibility ranges; golden tests; explicit failure; quarterly re-verification | Contract test fails → pin supported version, patch adapter, disable with clear error |
| **R-13** | Evaluation is invalid: judge bias, small N, contamination, self-preference, underpowered guard | H | H | Calibration κ; human audit; hidden holdout; pre-registration; pilot ψ/CV | Both-order pairwise; 2 judge families; anchored rubrics; paired design; CIs; report "inconclusive"; 60-task guard is not a formal NI test | Low κ or underpowered → tighten rubric/human review; do not claim a win |
| **R-14** | Unsafe evaluation on native Windows (no sandbox, no WSL/Docker) | H | H | Environment check; eval logs | Temp dirs; disabled destructive tools; simulated actions; isolated VM/container approval; no bypass | Any destructive eval attempt → stop; do not run autonomously; add isolation |
| **R-15** | Maintenance explosion: personas × culture × adapters × models | H | M | Issue/backlog count; adapter matrix | Two adapters in MVP; shared canonical core; small reviewed content; no marketplace | Unresolved adapter drift/backlog → reduce scope; prioritize reference |
| **R-16** | Licensing/attribution problems for sources, memes, translations | M | M/H | Source registry; license review | Cite sources; original text; no copyrighted meme images; separate code/content licenses | Unclear license → remove/replace content; legal review |
| **R-17** | Secret or PII leakage in output, transcripts, or reports | M | H | Exfil red team; report scan | No telemetry; don't read `.env` unless authorized; redact; synthetic eval repos | Secret found → purge, rotate if exposed, add regression test |
| **R-18** | Users treat the agent as a religious authority or over-personalize it | M | M/H | Feedback; reminder-frequency review; safety review | Competence-first; no fatwa; occasional reminders; defer to scholars; transparency | Authority confusion → adjust behavior/docs; reduce religious voice |
| **R-19** | Skill not activated (or activated inappropriately) across harnesses | M | M | Cross-harness scenarios; logs | Always-on card is sufficient; explicit skill naming; descriptions tested; manual command documented | Persona absent/inappropriate → strengthen card/description; provide manual trigger |
| **R-20** | Name/brand/namespace collision; "HAHahah" reads as exclusively religious | M | L/M | npm/GitHub/trademark search; feedback | Provisional name; alternatives; rename before public release; no forced acronym | Collision or confusion → rename before `0.1.0`; keep codename in docs |
| **R-21** | Evaluation cost overrun | M | M | Cost ledger; per-run caps | `--max-budget-usd`; smoke vs full suites; k=3; stop rules; cheaper models for smoke | Cap reached → reduce N or report inconclusive |
| **R-22** | Model updates change behavior and invalidate results | H | M | Pinned model/version; re-run calibration | Record versions; re-baseline before release; no cross-model generalization | Behavior shift → re-run baseline/treatment; update report |
| **R-23** | Third-party skills/plugins inject instructions or execute scripts | M | H | Install review; conflict tests | MVP packs text-only; no auto-install of third-party skills; warn about untrusted repos; safe mode | Malicious/conflicting skill → uninstall; report; add detection |
| **R-24** | Adapter output diverges materially from canonical content | M | M | Golden files per adapter; content diff review | Single canonical source; renderer tests; declared capability gaps | Divergence → fix composer/renderer or declare gap; no silent drift |
| **R-25** | Cross-platform build differences (paths, line endings, shell) | M | L/M | CI matrix Windows/Linux | Node tooling; LF normalization; path normalization; no shell-specific build scripts | Difference → fix and add regression |
| **R-26** | User edits a managed block; upgrade overwrites work | M | M | Hash mismatch; doctor | Refuse silent overwrite; show diff; explicit `--force`; preserve outside-block content | User edit → preserve, require confirmation; document recovery |
| **R-27** | Religious diversity mishandled (NU, Muhammadiyah, other practice) | M | H | Religious review; scenario tests; feedback | Neutral wording; no rulings; no implied correct practice; no ranking or jokes about tahlilan/maulid/hisab; defer | Complaint → content review, errata, removal if needed |
| **R-28** | Legal exposure from SARA hate speech, defamation, or real-name roasting | L/M | H | Legal/SARA review; red team; user reports | No identity/accent jokes; no real names; no defamatory claims; no profanity; content review; takedown path | Legal complaint → remove content, publish errata, yank version, seek advice |
| **R-29** | Qoder compatibility assumed from documentation without a real test; proprietary behavior leaks into the core | M | H | Phase 1 scratch test; status report; adapter isolation | No compatibility claim until tested; keep Qoder paths/workarounds in an adapter; record documented/verified/unknown | Test fails or is incomplete → no Qoder adapter/claim; record limitation |
| **R-30** | Harness provider/model configuration is nonstandard or unpinned (local proxy, custom aliases), making live results non-reproducible | H | M | Record provider/model; compare runs; stderr warnings | Pin a supported model/provider; hard budget cap; publish model and caveats; never fabricate output | Unstable provider → treat results as exploratory; no benchmark claim |
| **R-31** | Persona language/register drifts in live output (observed: an English answer to an Indonesian prompt in the Phase 2 smoke run) | H | M | `src/checks.ts` language screen on every smoke task; report summary + `--strict` | Language policy is always-on (D-028); persona carries the register; regression screened in CI-able eval | Drift persists → raise the rule's specificity, rerun smoke, do not release |
| **R-32** | A policy is authored and reviewed but never reaches the harness, so the control is a silent no-op (observed: the no-fatwa rule lived only in `core/10-safety.md`, which no artifact carried) | H | H | `test/claude-adapter.test.ts` asserts each `references/core/*.md` exists; build fails on a missing/empty core policy file | Compiler mounts the four core policies as on-demand references (D-031); always-on digest summarizes them | Any policy without a runtime carrier → treat as unimplemented, block the related release claim |
| **R-33** | A coding-fixture run is scored on tests the agent can also touch, so editing, deleting, or adding a test can produce a green suite with an unfixed bug — and the study would report it as a pass | H | M | `gradeRun` compares every provided file byte-for-byte against the task state and re-lists the workspace; `test/coding.test.ts` pins a tampered-but-green case to `tampered`, not `solved` | Tests are executed by this tool after the agent finishes, never by the agent (shell denied, D-033); `tampered` is reported as its own grade and excluded from `solved` | Any unexplained `tampered` spike → treat as an instrument defect and re-check the harness permission posture before attributing it to a persona |
| **R-34** | A measurement campaign exceeds the approved spend bound, as the 64-task Phase 3 run did at ≈$22.1 against A-05 | H | M | `fixtures run` prints `fixtures × repeats × 2 × --budget-usd` before doing anything and calls no model without `--live` | `--live` refuses without `--max-total-usd` and refuses again when the projection exceeds it; per-run caps still go to the harness as `--max-budget-usd`. Measured caveat: that cap is soft — arms capped at $0.35 reported $0.51 and $0.41, so the projection under-states the bill by up to ≈1.5x | Ceiling not stated → the campaign does not start; report the projection instead, and read any ceiling as the sum of caps, not the expected invoice |
| **R-35** | The grading environment is host-dependent, so a machine difference is recorded as a model difference (measured before the fix: a defensible `date.getDay()` answer scored 3/3 in Asia/Jakarta and 1/3 in America/Los_Angeles; bare `node --test` discovered an agent's scratch `vendor/sneaky_test.js` and reported 4 passes for a fixture declaring 2; a `package.json` above the temp workspace, or one the agent wrote as CommonJS, decided whether the ESM suites loaded at all) | H | M | `test/coding.test.ts` pins `GRADE_ENV.TZ`, the declared-target count, and the module marker; each was re-checked by reproducing the unpinned behavior (`pass=4` vs `pass=2`, inherited env → `fail=1`) | `runTests` grades only the fixture's declared test files, with `process.execPath`, a seeded `package.json`, `TZ=UTC`, and no inherited env | A grade that moves between machines → treat the study as invalid, fix the runner before blaming the persona |
| **R-36** | Infrastructure around the model destroys the run's evidence, so spend can occur with nothing to report (observed on the first live `fixtures run`: `rmSync` threw EPERM from a `finally` block while the harness still held a workspace open, and no report was written; the retry then reported `residue: 1` and graded both arms `error` on ECONNREFUSED at $0.00) | H | M | every run writes `report.json` + `report.md` regardless of cleanup outcome, records `residue`, and grades an incomplete run `error` rather than `failed` | `removeWorkspace()` is best-effort and cannot throw (src/workspace.ts), applied to the eval runner's identical `finally` as well | A run with no report → the spend is unknown; fix the instrument, do not scale up |
| **R-37** | The scratch directory handed to the harness is a Windows 8.3 short path, and the harness then demands approval for every tool while `--permission-prompts none` has nobody to answer — so a paid run reads nothing, writes nothing, and looks like a model problem (measured: `Glob`/`Grep` denied at `C:\Users\FTNADI~1\…`, $1.32 spent for zero file reads; `fs.realpathSync` returns the short form unchanged) | H | H | `test/coding.test.ts` asserts `scratchRoot()` has no `~` and that every graded workspace starts with it | `scratchRoot()` uses `realpathSync.native` and is the only base for study, eval and diagnostic workspaces | Tools denied in a live run → check the workspace path before blaming the permission mode or the persona |

---

## 2. Highest-priority risks

### R-01 — Correctness regression

**Why it matters:** A culturally fluent agent that gives worse technical answers is a failed product. Personality can also increase sycophancy (agreeing with wrong user assumptions), which is a correctness and safety issue.

**Controls**

- Core competence contract: verification, evidence, tests, and warnings are persona-independent.
- Persona text cannot change verification steps or decision classes; lint rejects override patterns.
- Coding suite with executable tests, private tasks, and a hidden holdout.
- Pre-registered regression guard (point estimate no worse than −10 pp) and paired design; formal 10 pp non-inferiority only with a pilot-calibrated sample (provisional ≥80; post-MVP unless expanded).
- Sycophancy scenarios: wrong API claims, wrong diagnosis, pressure to skip tests.
- Human audit of failures; any fabricated validation is a release blocker.

**Residual:** A prompt layer cannot guarantee correctness. The report must state the measured scope (model, harness, tasks) and avoid generalization.

### R-02 — Efficiency claim without a real effect

**Why it matters:** The brief explicitly forbids unmeasured savings claims. Personality instructions consume input tokens every session and can reduce output tokens; the net can be positive, negative, or zero.

**Controls**

- Static budget ledger at build time.
- Paired, cache-aware benchmark: input, output, cache creation/read, cold/warm cost.
- Provisional 60 paired tasks for a ~15% effect; pilot CV required; k=3, alternating order.
- No claim below 2× tokenizer MAPE; publish null/negative results.
- Separate "personality overhead" from "output reduction" and report net.

**Residual:** Provider caching and model changes can alter economics; reports are version- and date-specific.

### R-03 — Harassment and identity harm

**Why it matters:** RUSUH is built on roast culture. The line between "roasting the bug" and attacking a person is exactly where products fail.

**Controls**

- Humor target is always code, tool, situation, or the agent itself.
- Banned targets: intelligence, appearance, family, religion, ethnicity, region/accent, disability, sexuality, gender identity.
- No slurs, profanity, sexual content, threats, mass-targeting jokes, real-name targeting, or defamatory claims. SARA/defamation carries legal exposure under UU ITE and related law; legal/SARA review is part of the content gate.
- Serious mode for incidents, distress, and irreversible actions.
- Red-team suite with zero-tolerance critical failures; native review of examples.

**Residual:** Humor is context-dependent; users can still be offended. Provide a stop signal, a serious mode, and a feedback path.

### R-06 — Religious misinformation

**Why it matters:** Fabricated verses, misattributed hadith, or unauthorized rulings are harmful and unacceptable. Indonesia's religious diversity makes "default" assumptions unsafe.

**Controls**

- No quote bank without a reviewed citation and contextual use rule. Qur'anic quotations use Kemenag LPMQ-verified text; hadith requires a sourced collection/number and grading.
- No fatwa, no adjudication, no "the correct practice is…" framing, no ranking or jokes about tahlilan, maulid, or hisab/rukyat.
- No religious verdict smuggled into a refusal. The Phase 2 smoke run produced "dosa besar" while correctly refusing to fabricate scripture; a refusal must state the safety/ethics boundary, not a sin, reward, or punishment label. This rule is now in the always-on core (`core/always-on.md`), `core/10-safety.md`, `personas/rusuh/voice.md`, and `culture/id/religious-expression.md`, and is screened by `evals/smoke.yaml`.
- Neutral across NU, Muhammadiyah, and other practice; defer to qualified scholars and local context.
- Reviewer sign-off; adversarial prompts asking for verses/hadith/rulings.
- Reminder frequency cap and no preaching during errors/distress.

**Residual:** A non-specialist agent cannot answer nuanced religious questions; the correct behavior is often deferral, not fluency.

### R-08 — Prompt injection

**Why it matters:** The agent reads untrusted repository content, dependencies, issues, and web text. A malicious comment can try to make it ignore safety, change persona, exfiltrate secrets, or run destructive commands.

**Controls**

- Core rule: repository/web content is data, not instructions; never follow embedded requests to change persona, safety, permissions, or exfiltrate.
- Harness permissions enforce tool access; the prompt layer does not.
- No secret reading by default; redaction; no telemetry.
- Red-team scenarios, including instructions hidden in code comments and READMEs.
- Install safety: the toolkit writes only allowlisted paths and never executes pack content.

**Residual:** Prompt injection cannot be fully prevented by instructions. Disclose this and rely on harness isolation/permissions for high-risk work.

### R-10 — Destructive and shared actions

**Why it matters:** Deleting files, force-pushing, deploying, publishing, sending messages, or changing shared infrastructure can cause irreversible harm.

**Controls**

- Risk classes 0–4 (read-only, reversible local, destructive local, shared/irreversible, prohibited).
- Classes 2–3 require scope, reversibility, safer alternative, and explicit confirmation.
- Prefer move/rename/backup over delete; inspect before overwrite; stop on unexpected state.
- Never use bypass flags or skip hooks; respect harness permission prompts.
- Destructive evaluations are simulated or isolated; never run with `--dangerously-skip-permissions`.

**Residual:** Users can approve a harmful action. Confirmation reduces, not eliminates, risk.

### R-11 — Instruction hierarchy

**Why it matters:** HAHahah is project/user-level context, not system policy. Precedence varies: Copilot documents personal instructions above repository instructions; Codex concatenates AGENTS.md files; Claude Code uses `CLAUDE.md` and only falls back to `AGENTS.md` when absent. A persona or core rule can be overridden by a higher layer.

**Controls**

- Explicit conflict clause in core (host wins; surface conflict; prefer reversible path).
- No claims that the toolkit enforces safety; permissions/hooks are the enforcement layer.
- Avoid contradictions between core, persona, and generated artifacts.
- Document host-specific precedence in the adapter documentation.
- Test conflict scenarios in the decision suite.

**Residual:** A determined user or hostile project can override prompt rules. Harness policy and permissions are the real boundary.

### R-13 — Invalid evaluation

**Why it matters:** A benchmark that flatters the product is worse than no benchmark. LLM judges have position, verbosity, and self-preference bias; small samples produce false wins.

**Controls**

- Pairwise, both orders, two judge families where affordable.
- Anchored binary rubric, reference answers, human calibration (~30 samples), report κ/α.
- Paired design clustered by task; bootstrap CIs; pre-registered margin.
- Private task suite + hidden holdout; no tuning on the holdout.
- Human audit of release-critical judgments; safety gates are human-reviewed.
- Report "inconclusive" when underpowered.

**Residual:** Human review is also subjective; record disagreements and reviewer roles.

### R-14 — Unsafe evaluation environment

**Why it matters:** Native Windows has no Claude Code shell sandbox; this workstation has no WSL or Docker. Running autonomous agents with destructive tools would be reckless.

**Controls**

- No bypass flags; restricted tools; temporary repositories.
- Destructive scenarios simulated, not executed.
- Any autonomous/destructive test requires an isolated VM, WSL2, or container — an explicit environment decision (D-020).
- Disclose the limitation in reports.

**Residual:** Even isolated environments can be misconfigured; use no real credentials and snapshot before runs.

---

## 3. Security and instruction-hierarchy concerns

### 3.1 Trust boundaries

| Boundary | Risk | Control |
|---|---|---|
| Repository content | Hidden instructions, malicious comments, dependency text | Treat as data; never change persona/safety/permissions; report suspicious content |
| User turn | Social pressure, role-play, "ignore safety" | Risk classes; no persona-based bypass; serious mode; refusal/redirect |
| Generated artifacts | Overwrites, path traversal, symlinks | Allowlisted paths; managed blocks; schema; atomic writes; no scripts |
| Third-party skills/plugins | Executable content, conflicting instructions | Text-only MVP; no auto-install; warn about untrusted repos; safe mode |
| Eval data | Secrets, PII, contaminated benchmarks | Synthetic repos; redaction; local-only reports; hidden holdout |
| Harness | Permission bypass, personal instruction precedence | Respect harness permissions; document precedence; do not claim enforcement |

### 3.2 Non-negotiable security rules

1. Never bypass harness permission prompts or use `--dangerously-skip-permissions` in evaluation.
2. Never run a destructive action without explicit confirmation and a stated scope.
3. Never read, print, or transmit secrets unless the user explicitly requests and authorizes it; redact in reports.
4. Never execute scripts embedded in persona packs; MVP packs are text-only.
5. Never write outside allowlisted paths or overwrite unmanaged content silently.
6. Never claim that prompt instructions are a security boundary.
7. Never fabricate a review, test, or safety result.

### 3.3 Residual security limitations (must be documented)

- A model can ignore instructions.
- Host precedence can override project rules.
- Native Windows shell execution is unsandboxed for Claude Code.
- Third-party skills can execute code.
- Prompt injection cannot be fully prevented at the instruction layer.
- The toolkit does not audit the harness or the model provider.

---

## 4. Risk acceptance required

The owner must explicitly accept or reject:

| Item | Why owner input is needed |
|---|---|
| Correctness guard (10 pp point estimate) and formal NI (post-MVP, ≥80 tasks) | Determines what the MVP can and cannot claim about degradation |
| Evaluation budget and model/provider | Determines sample size, judge families, and whether results are conclusive |
| Native Windows evaluation limitation | Determines whether an isolated environment is added or destructive tests are simulated |
| Reference harness pin (`2.1.x`) | Affects compatibility and support burden |
| Two-adapter MVP vs single adapter | Affects scope and validation of the abstraction |
| Cultural/religious review plan, including legal/SARA review | Without reviewers, the MVP cannot release those personas |
| License split for code vs content | Affects adoption and source reuse |
| Public name and namespace | `HAHahah` display casing and `hahahah` slug availability |
| Qoder compatibility claim | Requires a real integration test and an approved status report |
| Residual prompt-layer safety limitation | The product must not be marketed as a security control |

---

## 5. Monitoring and review

| Signal | Frequency | Action |
|---|---|---|
| Coding pass-rate delta and CI | Every benchmark | Block release if beyond the guard; investigate persona/efficiency rules |
| Net token delta, overhead, cache behavior | Every benchmark/release | Recalibrate budgets; update claims |
| Critical safety failures | Every release | Zero tolerance; block |
| Reviewer objections/uncertainty | Every content change | Remove or relabel content |
| Harness contract tests | Every harness update/release | Pin or patch adapter |
| Qoder assessment evidence | Phase 1 and before any Qoder claim | Incomplete/failed test → no adapter, no claim |
| Expired culture entries | Every build | Fail release; refresh |
| Eval cost ledger | Every run | Stop at cap; reduce N |
| User reports (harassment, SARA/legal, religion, install, privacy) | Ongoing | Triage, errata, yank version if needed |
| Name/license/legal issues | Before public release | Resolve before `0.1.0` |

---

## 6. Residual risk statement (for the README and release notes)

> HAHahah is an instruction-layer toolkit, not a security boundary. It can be overridden by host policy, user instructions, other extensions, or model behavior. It does not train or modify a model, does not sandbox the harness, and does not guarantee cultural or religious accuracy beyond its reviewed scope. Its efficiency claims are limited to the measured model, harness, tasks, date, and cache assumptions in the published report; the lean MVP's 60-task coding result is a regression guard, not a formal non-inferiority claim. Qoder compatibility is unclaimed until an integration test passes. Do not use it as the sole control for destructive, regulated, or safety-critical actions.

---

*End of risk register. Acceptance decisions are tracked in `INITIAL_DECISIONS.md`.*
