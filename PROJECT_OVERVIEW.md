# HAHahah — Project Overview

> **Status:** Phase 0 design draft for human approval. No production code has been written.
> **Project name:** HAHahah. Technical slug: `hahahah`. The name is not an acronym and has no expansion — see `INITIAL_DECISIONS.md` D-001.
> **Date:** 2026-11-01
> **MVP shape:** lean `0.1.0` — Claude Code only, three personas, Phase 1 Qoder compatibility assessment (no compatibility claim), formal non-inferiority and extra adapters post-MVP (D-027).
> **Audience:** project owner, reviewers, and future contributors.

---

## 1. One-paragraph summary

HAHahah is a canonical, versioned personality and efficiency layer for **existing AI coding agents**. It gives an agent a culturally grounded Indonesian voice — RUSUH, HALAL, or JAWA — without replacing the agent, the model, or the harness. The product is a reviewed content system plus a deterministic compiler and thin harness adapters: one source of truth, generated artifacts for each supported instruction mechanism, and a measurement suite that reports both the behavioral effect and the token cost of the personality layer. Decision quality and safety are separate from voice; a persona may change *how* the agent speaks, never *what* it is allowed or obligated to do.

---

## 2. The problem

### 2.1 What exists today

- Coding agents are technically capable but culturally flat. Indonesian developers routinely switch between formal English-assistant register and their own Indonesian/Gen Z register; the agent does not follow.
- Personality packs are usually copy-pasted prompt blocks. They duplicate rules, grow unbounded, conflict with project instructions, and are tied to one harness.
- Religious and regional voice is often handled as caricature: repetitive slang, fake Javanese, or invented religious quotations.
- "Be concise" instructions are asserted, not measured. No pack reports the tokens it adds, and few report whether it preserves required technical information.
- Harness integration formats are fragmented. `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, and Agent Skills have different discovery, precedence, and loading behavior. No single file format is universal.
- Most packs have no evaluation. Correctness regressions, safety failures, and sycophancy are discovered by users, not by the maintainer.

### 2.2 What HAHahah changes

1. **One canonical source** for core policy, culture knowledge, and personas.
2. **Generated, reproducible artifacts** for each harness, with a manifest and safe install/uninstall.
3. **Reviewed cultural content** with provenance, context tags, and expiry dates instead of an undated slang list.
4. **Decision policy separated from presentation**, with explicit risk classes and confirmation rules.
5. **A measured efficiency claim** — or no claim. The layer accounts for the tokens it consumes and reports net effects with methodology and limitations.

---

## 3. What HAHahah is

- A **personality and behavior layer** that sits on top of existing coding agents and their harnesses.
- A **content system**: core policies, a culture knowledge base, three initial persona packs, and review metadata.
- A **build system**: schema validation, composition, token accounting, and deterministic rendering.
- An **adapter layer**: Claude Code is the `0.1.0` adapter; a portable `AGENTS.md` renderer and a Qoder adapter are post-MVP targets with declared capabilities and limits.
- A **measurement suite**: static budgets, behavioral scenarios, safety probes, and paired token comparisons.
- A project that treats **technical competence, safety, and user consent as non-negotiable**, and voice as a configurable presentation layer.

## 4. What HAHahah is not

- Not a new LLM, fine-tune, or model.
- Not a standalone chatbot, desktop app, browser extension, or GUI.
- Not a generic prompt collection or a "personality marketplace".
- Not a personality customization builder in the MVP.
- Not a security boundary. It is a prompt/instruction layer; the harness's permissions, sandbox, and policy controls remain authoritative.
- Not a universal integration. Each adapter targets a documented harness mechanism and states what it cannot do.
- Not a claim that Indonesian slang, Javanese registers, or religious phrasing can be automated without human review.

---

## 5. Target users and jobs

| User | Job to be done | What success feels like |
|---|---|---|
| Indonesian solo developer using a coding agent | Make the agent feel natural without losing technical quality | Install once; the agent speaks like a competent Indonesian peer, not a translated manual |
| Indonesian team | Standardize voice and safety expectations across developers | One reviewed profile, generated into the team's harness, with clear limits |
| Open-source maintainer | Publish a culturally specific agent layer that does not embarrass its community | Reviewed language, cited sources, no caricature, no fabricated religion |
| Tooling contributor | Add a new harness without forking the content | Implement a declared adapter interface; no copy-paste of persona text |
| Researcher / reviewer | Inspect whether personality changes correctness or token use | Reproducible suites, pinned versions, published reports |

**Initial audience:** Indonesian developers who already use a coding agent and are comfortable editing a repository. The MVP does not target non-technical users.

---

## 6. The five systems

| System | What it is | What it is not | MVP artifact |
|---|---|---|---|
| **Local Culture Intelligence** | A curated, source-linked knowledge base of Indonesian Gen Z slang (with decay classes), developer and absurd humor, meme notes, Javanese ngoko/madya/krama registers, Banyumasan notes, religious-expression etiquette, and humor boundaries. Entries carry context, region, register, decay/offensiveness, avoid-conditions, provenance, and expiry. | A runtime model, a scraper, or an automatically updated slang feed | `culture/` YAML + Markdown, consumed by review and compilation |
| **Personality Engine** | A composition system: locale base + persona voice contract + compact lexicon + intensity + budget. Produces a small always-on persona card and deeper on-demand references. | A free-form persona generator, a trait marketplace, or a runtime LLM call | `personas/rusuh`, `personas/halal`, `personas/jawa` + composition manifests |
| **Decision Intelligence** | A policy that classifies instructions (valid, suboptimal, ambiguous, destructive, factually wrong, prohibited) and selects an action before voice is applied. | A personality trait, a refusal generator, or a replacement for harness permissions | `core/decision-policy.md` (always-on) |
| **Response Efficiency Engine** | A response contract plus compile-time budget enforcement and measurement: answer first, preserve required information, suppress redundancy, never blind-truncate. | Arbitrary word limits, a summarizer service, or an unmeasured "be concise" slogan | `core/efficiency.md` + token ledger + benchmark suite |
| **Adapter / Compiler Layer** | Canonical source → validation → composition → per-harness rendering → manifest. Adapters declare capabilities and refuse unsupported behavior. | A universal plugin, a runtime proxy, or a marketplace | `compiler/`, `adapters/claude-code`; `adapters/agents-md` and Qoder are post-MVP |

**Culture intelligence is deliberately a knowledge layer, not an inference model.** This keeps the project auditable, cheap, and honest about what it can know. The "intelligence" is in context tagging, retrieval rules, review, and tests — not in pretending a static list of slang is a cultural model.

---

## 7. Design principles

1. **Canonical source, generated targets.** Hand-editing generated files is a bug. Builds are deterministic and reproducible.
2. **Layered authority.** Host system/developer policy > harness permissions > project/user instructions > toolkit core > persona > task. Persona is presentation, never authority.
3. **Progressive disclosure.** A compact always-on card carries voice and safety; deeper culture and examples load on demand. Flat targets get a budgeted digest.
4. **Culture as reviewed data.** Every slang, dialect, and religious-expression entry has provenance, context, an avoid-when rule, and an expiry or review date.
5. **Correctness and safety before style.** No persona may weaken verification, change a decision class, fabricate scripture, or turn humor into harassment.
6. **Measure net effects.** Token accounting includes the personality layer's own input cost, skill metadata, activated references, caching effects, and output. No savings claim without a reproducible benchmark.
7. **Harness-agnostic core, thin adapters, no invented capabilities.** If a harness does not support a mechanism, the adapter says so and degrades explicitly.
8. **Reversible operations and informed consent.** Destructive or shared actions require explicit confirmation; installs use managed blocks, dry-runs, and manifests; uninstall removes only managed files.
9. **Human review is a release gate, not a checkbox.** Native Indonesian, Javanese, and Islamic-content review cannot be replaced by an LLM judge.
10. **Boring, inspectable technology.** Markdown, YAML, JSON Schema, and a small TypeScript build tool. The generated artifacts have no runtime dependency on the toolkit.

---

## 8. What success looks like (MVP)

These are **proposed acceptance targets**, not measured results. Thresholds require approval (`INITIAL_DECISIONS.md` D-011).

### Functional
- A fresh repository can install a profile with one documented command (plus a dry-run) and get a working agent voice in one session.
- Install is idempotent; re-running does not duplicate content; uninstall removes only managed content.
- The build is deterministic across Windows and Linux for the same inputs (line endings normalized, keys sorted, no timestamps in content).

### Cultural
- Each persona passes a reviewed scenario suite with a median rubric score of at least 4/5 and no dimension below 3/5.
- The context gate holds: the agent infers language/region/religiosity/formality only from explicit signals, defaults to standard Indonesian, and never infers religion or region from names or appearance.
- Slang density, decay class, and repetition stay within per-response limits; no catchphrase appears in consecutive responses in the test suite.
- Javanese ngoko/madya/krama selection is correct on reviewed scenarios; Banyumasan uses Banyumasan forms, not Jogja krama inggil, and is explicitly reviewed with uncertainty marked.
- Islamic content contains no fabricated Qur'anic verse, hadith, or ruling, no sectarian ranking, and no sarcastic/judgmental use of religious expressions; reminders are occasional and never override the user's request.

### Safety and decision quality
- Zero critical failures on the safety red-team suite (harassment, identity/SARA/defamation, fabricated religion, destructive actions, prompt injection).
- At least 85% action accuracy on the decision suite (valid / suboptimal / ambiguous / destructive / incorrect assumption), with destructive actions requiring confirmation.
- No humor in simulated incident or user-distress scenarios.

### Technical correctness
- On the coding regression suite, the persona build must not show a **point-estimate drop greater than 10 percentage points** versus baseline, and the paired 95% confidence interval must be published. The MVP suite is 60 paired tasks; a formal 10 pp non-inferiority claim requires at least 80 paired tasks (a 5 pp margin would need roughly 310–630), so formal non-inferiority is post-MVP unless the suite is expanded. Sample-size figures are **provisional** normal-approximation estimates with stated α/power/discordance assumptions; see `MVP_SCOPE.md` §8.4. If the result is underpowered, the report says **inconclusive**; it never claims non-inferiority.
- No critical warning, constraint, or test failure is removed by the efficiency rules in the information-preservation suite.

### Efficiency
- A published report states: static always-on token cost, skill metadata cost, activated reference cost, output tokens, cache assumptions, net token delta vs baseline, and confidence intervals.
- No net-savings claim is made unless the paired benchmark supports it. The 60-task token benchmark is a provisional pilot; at high variance it may be underpowered and must be reported as inconclusive. A null or negative result is an acceptable Phase 0/Phase 1 outcome and must be reported.
- Compiled artifacts fail the build if they exceed their declared token budget; runtime truncation is not used to meet budgets.

### Integration
- The Claude Code reference adapter works against a pinned, documented harness version on native Windows, with the sandbox limitation disclosed.
- The adapter interface is exercised by a fake adapter and contract tests; the portable `AGENTS.md` renderer is explicitly deferred.
- Qoder compatibility is assessed in Phase 1, records documented/verified/unknown states, and is not claimed until a real integration test passes.
- Harness drift is detectable through contract tests and a version compatibility table.

---

## 9. Non-goals (MVP and Phase 0)

Explicitly out of scope:

- Desktop chatbot, standalone chatbot, browser extension, mobile app.
- LLM training, fine-tuning, distillation, or a hosted model.
- A personality customization builder, trait sliders, or user-generated marketplace.
- GUI beyond a CLI and documentation.
- Multi-platform implementation beyond the Claude Code reference adapter; the portable renderer and Qoder adapter are post-MVP.
- Runtime server, proxy, MCP tool server, telemetry, or analytics.
- Automatic slang scraping or automatic religious-content generation.
- Claims of token savings, cultural correctness, or safety without measured evidence.
- Support for non-coding tasks, general chat, or non-Indonesian locales in the MVP.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Core** | Always-on, persona-independent policies: identity, safety, decision policy, efficiency. |
| **Persona pack** | A versioned bundle of voice contract, lexicon, examples, and tests for one mode (RUSUH / HALAL / JAWA). |
| **Profile** | A composition manifest selecting core version, persona, locale, intensity, and budgets. |
| **Culture KB** | The reviewed, source-linked culture knowledge base (`culture/`), with decay classes, context tags, and expiry. |
| **Banyumasan** | A Javanese dialect cluster in western Central Java (Banyumas, Purbalingga, Cilacap, Banjarnegara, Kebumen). The preferred name; "Ngapak" may be used by speakers but is also a mocking label. Its krama forms differ from Surakarta–Yogyakarta. |
| **Always-on card** | The compact persona summary compiled into always-loaded project instructions. |
| **On-demand reference** | Detailed culture/voice material loaded only when a skill is activated or a reference file is read. |
| **Serious mode** | A safety override that drops humor/ornament when the user asks, or when context indicates distress, incident, or irreversible risk. |
| **Managed block** | A delimited region in a user-owned file that HAHahah may update; everything outside it is untouched. |
| **Manifest** | A generated record of installed files, hashes, adapter/profile versions, and budget report. |
| **Net token delta** | Treatment tokens minus baseline tokens, including always-on instructions, skills, references, and output; reported with cache assumptions. |
| **Regression guard** | A release tripwire on the observed correctness delta; it publishes a CI but does not, by itself, support a formal non-inferiority claim. |
| **Non-inferiority margin** | The largest acceptable correctness drop versus baseline for a formal claim, fixed with a powered sample before running the comparison. |
| **Adapter** | A harness-specific renderer with declared capabilities and output paths. |
| **Portable renderer** | A flat `AGENTS.md` artifact for harnesses without on-demand skills; post-MVP. |

---

## 11. Assumptions and unresolved questions

Assumptions (to be confirmed in `INITIAL_DECISIONS.md`):

- The primary user is an Indonesian developer comfortable with a CLI and repository files.
- A prompt/instruction layer is acceptable as the delivery mechanism; no model access is required.
- Human reviewers can be recruited for Indonesian, Javanese, and Islamic content.
- The project can be developed and evaluated with the locally installed Claude Code CLI; no hosted service is required.
- No authoritative Indonesian persona/voice style guide exists; the culture layer must be built from primary references and human review.
- Slang half-life is a planning estimate, not a measured law; expiry is conservative and reviews are real.
- Qoder compatibility is unverified; the MVP does not depend on it.
- Phase 0 documentation is worth completing before any code.

Unresolved questions:

- `hahahah` npm/GitHub/CLI identifier availability, repository location, and license.
- Reference harness version pin; post-MVP adapter order after the Qoder assessment.
- Default Javanese register policy and how the agent should ask when register is unclear.
- Evaluation model/provider budget and whether API costs are acceptable.
- Non-inferiority margin, safety thresholds, and persona rubric.
- Whether a persona-neutral "core-only" profile ships as a control and an efficiency-only option.
- Handling of users who want to disable persona temporarily without rebuilding.

---

## Phase 0 task coverage

| Brief task | Where it is addressed |
|---|---|
| 1. Development environment and tooling | `DEVELOPMENT_ROADMAP.md` environment baseline; `INTEGRATION_RESEARCH.md` §1 |
| 2. Agent-harness integration mechanisms | `INTEGRATION_RESEARCH.md` §2–§5; Qoder status in §3.8 |
| 3. Initial reference harness | `INTEGRATION_RESEARCH.md` §6; `INITIAL_DECISIONS.md` D-004/D-026 |
| 4. Modular architecture for the five systems | `ARCHITECTURE.md` §5 |
| 5. Canonical personality specification format | `ARCHITECTURE.md` §4; `INITIAL_DECISIONS.md` D-002 |
| 6. Adapter architecture | `ARCHITECTURE.md` §5.5; `INITIAL_DECISIONS.md` D-005/D-021/D-027 |
| 7. Testing strategy and statistical audit | `ARCHITECTURE.md` §7; `MVP_SCOPE.md` §6–§10, §8.4 |
| 8. Security, hierarchy, destructive actions | `ARCHITECTURE.md` §8; `TECHNICAL_RISKS.md` §2–§3 |
| 9. Phased roadmap | `DEVELOPMENT_ROADMAP.md` |
| 10. Technical risks and approval decisions | `TECHNICAL_RISKS.md`; `INITIAL_DECISIONS.md` D-011/D-026/D-027 |

## 12. Document map

| Document | Purpose |
|---|---|
| `PROJECT_OVERVIEW.md` | Vision, users, principles, success criteria, glossary (this file). |
| `ARCHITECTURE.md` | System design, canonical model, adapter contract, runtime flow, security boundaries, measurement design. |
| `MVP_SCOPE.md` | Exact MVP inclusions, exclusions, user journeys, acceptance criteria, definition of done. |
| `INTEGRATION_RESEARCH.md` | Verified harness mechanisms, comparison matrix, reference-harness recommendation, drift risks. |
| `DEVELOPMENT_ROADMAP.md` | Phased plan, exit gates, review cadence, effort estimates, release criteria. |
| `TECHNICAL_RISKS.md` | Risk register with detection, mitigation, triggers, fallbacks, and approval needs. |
| `INITIAL_DECISIONS.md` | Decision log (proposed/approved), assumptions, open questions, approval checklist. |

---

*End of Phase 0 overview. Nothing in this document authorizes implementation; see the approval checklist in `INITIAL_DECISIONS.md`.*
