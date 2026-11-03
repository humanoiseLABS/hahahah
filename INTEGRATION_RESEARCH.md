# HAHahah — Integration Research

> **Status:** Phase 0 research. Sources accessed **2026-11-01** unless stated otherwise.
> **Scope:** instruction and capability mechanisms of existing AI coding-agent harnesses, and their fitness for HAHahah's canonical-source-plus-adapter architecture.
> **Rule:** capabilities are claimed only where official documentation or direct local evidence supports them. Unverified items are labeled. No live scraping is used.

---

## 1. Method and evidence standard

Evidence tiers used in this document:

| Tier | Meaning |
|---|---|
| **A — Official documentation** | Vendor/open-standard documentation, fetched during this study. |
| **B — Local observation** | Installed CLI/version/behavior on the development workstation. |
| **C — Secondary source** | Reputable article or repository, used only for context; not a capability claim. |
| **U — Unverified** | Plausible but not confirmed by A or B; must not be cited as a capability. |

Environment observed on 2026-11-01:

- Windows 10.0.26200, x64, Git Bash.
- Node.js **v24.22.1**, npm **11.19.1**, Python **3.14.7**, git **2.55.0.windows.5**.
- **Claude Code 2.1.278** installed at `~/AppData/Roaming/npm/claude`; headless `claude -p` currently returns `Not logged in`, so live model behavior is not verified.
- Qoder Desktop/CLI environment present (skills/plugins under `~/.qoder`); `qoder` and `qc-cli` were **not on PATH** in this shell.
- **No** `codex`, `cursor-agent`, `gemini`, or `aider` CLI installed.
- **No** Docker and **no** WSL installed (`docker --version`; `wsl -l -q`).
- Workspace `C:\Users\ftnaditiaazyrexx\Downloads\HAHahah` was empty and not a Git repository.

---

## 2. Mechanism taxonomy

| Mechanism | What it does | Relevance to HAHahah | Main risk |
|---|---|---|---|
| **Always-on project instructions** | A file loaded into context each session (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) | Carries core policy + compact persona card | Token cost every turn; flat, no progressive disclosure |
| **Scoped / path rules** | Rules applied by glob or agent decision (Cursor rules, Copilot instructions) | Could scope culture guidance to docs or tests | Precedence and application are harness-specific |
| **On-demand skills** | Metadata always visible; body/resources loaded on activation (`SKILL.md`) | Detailed persona and culture references | Invocation differs: auto, consent, explicit; paths differ |
| **Subagents** | Separate context with its own instructions and tools | Possible future "culture reviewer" or "safety reviewer" | Not needed for MVP; adds complexity |
| **Output styles / system prompt injection** | Replaces or appends to system-prompt-level style | Could strengthen persona adherence | Harness-specific, system-level, portability loss |
| **Hooks / permissions** | Harness-enforced allow/deny and event interception | Real enforcement for destructive actions | Not portable; native Windows gaps; false sense of security |
| **Plugins / extensions** | Distribution bundles that can include skills, commands, hooks | Future distribution channel | Marketplace scope, supply chain, review burden |
| **MCP** | Adds tools/resources, not instruction authority | Not relevant for personality | Out of scope; runtime dependency |

**Core finding:** there is no universal, cross-harness mechanism for *on-demand* personality content. Agent Skills is the closest thing to a standard, but its discovery path and invocation behavior vary by harness. A flat `AGENTS.md` is the broadest always-on baseline but cannot provide progressive disclosure.

---

## 3. Evidence by mechanism

### 3.1 AGENTS.md

**Tier A.** [agents.md](https://agents.md/) describes AGENTS.md as "a simple, open format for guiding coding agents", a "README for agents", used by "over 60k open-source projects". Supported tools listed on the page include Codex, Jules, Factory, Aider, goose, opencode, Zed, Warp, VS Code, Devin, UiPath, Junie, Amp, Cursor, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, GitHub Copilot agent, Ona, Windsurf, and Augment Code. The site states that the **closest file wins** for nested files.

**OpenAI Codex** documents the operational behavior: Codex reads `AGENTS.md` in the home directory, repository root, and nested directories; it merges them **global first, then project**, with closer files overriding earlier ones; files are concatenated with blank lines; empty files are skipped; discovery stops if the combined size exceeds `project_doc_max_bytes` (**32 KiB default**), configurable in `config.toml`, which can also add fallback filenames ([Codex AGENTS.md docs](https://learn.chatgpt.com/docs/agent-configuration/agents-md)).

**Cursor** documents AGENTS.md as a "simple alternative to `.cursor/rules`", without frontmatter metadata. Nested `AGENTS.md` files are combined with parent directories, "with more specific instructions taking precedence" ([Cursor rules](https://cursor.com/docs/context/rules)).

**GitHub Copilot** supports `AGENTS.md` files; the documentation extraction reports that nearest files take precedence ([Copilot custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)). Treat the exact merge algorithm as **Tier U** until verified line-by-line.

**Implications for HAHahah**

- Good lowest-common-denominator target: one file, no runtime.
- The word "override" is misleading in practice: some harnesses **concatenate**, so conflicting text may remain in context. HAHahah must avoid contradictions between core, persona, and project content, and must place safety/decision rules in unambiguous language.
- The 32 KiB Codex cap is generous, but HAHahah's efficiency target is far smaller (single-digit thousands of tokens).
- AGENTS.md is always-on. It cannot provide the progressive disclosure that skills can.
- Claude Code does **not** appear on the agents.md supported list; its own docs say it loads `AGENTS.md` only if no `CLAUDE.md` exists in the working directory or above ([Claude Code memory](https://code.claude.com/docs/en/memory)). Therefore the Claude adapter must write `CLAUDE.md`, not rely on `AGENTS.md`.

### 3.2 Agent Skills

**Tier A.** The [Agent Skills specification](https://agentskills.io/specification) defines:

- `SKILL.md` with YAML frontmatter.
- Required: `name` (1–64 chars, lowercase letters/numbers/hyphens), `description` (1–1024 chars).
- Optional: `license`, `compatibility` (max 500), `metadata`, `allowed-tools`.
- Optional directories: `scripts/`, `references/`, `assets/`.
- Progressive disclosure: metadata at startup; body on activation (**under 500 lines** recommended); resources on demand.
- Validation via `skills-ref`.

The [Agent Skills home page](https://agentskills.io/) describes an open standard originally by Anthropic, with ecosystem contributions, and points to a client showcase. It does **not** enumerate supported clients on the page fetched.

**Adoption verified from vendor docs:**

| Harness | Skill location(s) | Invocation | Status in this study |
|---|---|---|---|
| Claude Code | `.claude/skills/`, `~/.claude/skills/`, plugins | Automatic or `/skill-name` | Tier A ([skills docs](https://code.claude.com/docs/en/skills)) |
| OpenAI Codex | `.agents/skills` (repo), `$HOME/.agents/skills` (user) | Explicit skill tooling (`$skill-creator` / `$skill-installer`); general auto-invocation not verified | Tier A ([build skills](https://learn.chatgpt.com/docs/build-skills)); maturity not stated in the fetched page |
| Gemini CLI | Built-in, extension, `~/.gemini/skills/`, `.gemini/skills/` | **Consent required; no auto-invocation** | Tier A ([Gemini skills](https://geminicli.com/docs/cli/skills/)) |
| Cursor | `.agents/skills/`, `.cursor/skills/`, `~/.agents/skills/`, `~/.cursor/skills/` | Auto-apply or `/`; resources load progressively; scripts via relative paths | Tier A ([Cursor skills](https://cursor.com/docs/skills)) |
| Qoder CLI | `~/.qoder/skills/{name}/SKILL.md`, `.qoder/skills/{name}/SKILL.md` | Documented auto-trigger (unverified) or `/skill-name`; `/skills reload` | Tier A for format/paths ([Qoder skills](https://docs.qoder.com/cli/Skills)); **does not state** adherence to the open standard |

**Implications for HAHahah**

- Skills are the right vehicle for detailed voice/culture content, but **not for the baseline persona guarantee**, because invocation semantics differ (Gemini requires consent and does not auto-invoke; Codex is explicit; Claude Code and Cursor document auto-apply; Qoder documents auto-trigger but it is unverified).
- The always-on persona card must be sufficient for baseline behavior; skills add nuance.
- Skill metadata budgets matter: descriptions are loaded at startup, even when the body is not.
- Skill directories differ (`claude`, `agents`, `cursor`, `gemini`, `qoder`). An adapter must render to each target's documented path, not assume a universal location.
- Skills can contain executable scripts. HAHahah's MVP packs are text-only; this is a deliberate supply-chain control.

### 3.3 Claude Code

**Tier A + B.** Local CLI: **2.1.278**.

| Surface | Documented behavior | HAHahah relevance |
|---|---|---|
| Memory | `CLAUDE.md` is "context, not enforced configuration." Docs list managed policy, user memory (`~/.claude/CLAUDE.md`), project memory (`./CLAUDE.md`), and local project memory (`./CLAUDE.local.md`); nested files load on demand; imports use `@path`; `AGENTS.md` loads only if no `CLAUDE.md` exists in the working directory or above ([memory](https://code.claude.com/docs/en/memory)). | Always-on core + persona card; use `CLAUDE.md` managed block. Do not infer a universal conflict rule from the listed order. |
| Skills | `.claude/skills`, `~/.claude/skills`, plugins; auto or `/name`; `allowed-tools`; follows Agent Skills ([skills](https://code.claude.com/docs/en/skills)). | Detailed persona/culture content; progressive disclosure. |
| Subagents | `.claude/agents/` or `~/.claude/agents/`; frontmatter `name`, `description`, `tools`, `model`; isolated context; can preload skills ([subagents](https://code.claude.com/docs/en/sub-agents)). | Not MVP; possible future reviewer agents. |
| Hooks | `.claude/settings.json`; `PreToolUse` can block via JSON or exit 2; Windows lacks `/dev/tty`; hooks run in isolated sessions ([hooks](https://code.claude.com/docs/en/hooks)). | Deferred; not portable; potential future guardrails. |
| Output styles | Built-in Proactive, Concise, Explanatory, Learning; custom Markdown in `~/.claude/output-styles` or `.claude/output-styles`; frontmatter `name`, `description`, `keep-coding-instructions`; adds to system prompt, does not replace CLAUDE.md ([output styles](https://code.claude.com/docs/en/output-styles)). | Not MVP; system-level and Claude-specific. |
| Permissions | "Permission rules are enforced by Claude Code, not by the model"; hooks cannot bypass deny rules; managed settings highest ([permissions](https://code.claude.com/docs/en/permissions)). | The real enforcement layer for destructive actions. |
| Headless | `claude -p`; `--output-format json` fields `result`, `session_id`, `total_cost_usd`; `--json-schema`; `--max-budget-usd`; `--bare` skips hooks, plugins, CLAUDE.md auto-discovery, etc. ([headless](https://code.claude.com/docs/en/headless); local `--help`). | Strong fit for reproducible evaluation and cost caps. |
| Sandbox | Covers shell commands only; macOS, Linux, WSL2; **native Windows runs commands unsandboxed** ([sandboxing](https://code.claude.com/docs/en/sandboxing)). | Major evaluation and safety caveat on this workstation. |

Local CLI surface confirms `-p`, `--output-format json`, `--json-schema`, `--max-budget-usd`, `--bare`, `--safe-mode`, `--setting-sources`, `--agents`, `--plugin-dir`, and permission modes. This is direct evidence for the evaluation design, not a substitute for vendor docs.

### 3.4 Cursor

**Tier A.**

- `.cursor/rules/*.mdc` with frontmatter `description`, `globs`, `alwaysApply`.
- Rule types: **Always Apply**, **Apply Intelligently**, **Apply to Specific Files**, **Apply Manually**.
- Precedence: **Team > Project > User**.
- Guidance: keep rules under **500 lines**; split large rules into composable rules.
- `AGENTS.md` is supported as an alternative; nested files are combined with more specific precedence.
- Agent Skills: `.agents/skills/`, `.cursor/skills/`, `~/.agents/skills/`, `~/.cursor/skills/`; auto-apply or `/`; progressive loading; scripts via relative paths; docs link to agentskills.io.

**Fit:** good future adapter (rules + skills), but the local CLI is not installed (`cursor-agent` not found) and Cursor is IDE-first. Evaluation automation was not verified. MVP: not selected.

### 3.5 GitHub Copilot

**Tier A.**

- Repository-wide: `.github/copilot-instructions.md`.
- Path-specific: `.github/instructions/*.instructions.md` with `applyTo` frontmatter.
- `AGENTS.md` files are supported; nearest takes precedence (extraction).
- Precedence, quoted: **"Personal instructions take the highest priority. Repository instructions come next, and then organization instructions are prioritized last."**

**Fit:** broad reach, but the precedence order is a serious concern for a project-level safety/personality layer: a user's personal instruction can outrank the repository's rules. Prompt-layer safety cannot be guaranteed. MVP: not selected.

### 3.6 OpenAI Codex

**Tier A.**

- `AGENTS.md` in home, root, nested; merged global → project; closer overrides earlier; concatenated; 32 KiB default (`project_doc_max_bytes`); `config.toml` can add fallback filenames.
- Skills: `.agents/skills` and `$HOME/.agents/skills`; `SKILL.md` requires `name`, `description`; `$skill-creator` / `$skill-installer linear`.
- Non-interactive: `codex exec`; `--sandbox workspace-write`; `--json` (JSONL); `--output-schema`; CI via `openai/codex-action`. Cost/token emission was **not** documented in the fetched page.

**Fit:** strong future adapter (AGENTS.md + skills + exec). Not installed locally; skills documentation does not state maturity. MVP: not selected.

### 3.7 Gemini CLI

**Tier A.**

- `GEMINI.md`: global `~/.gemini/GEMINI.md`; workspace; JIT loading; `@file.md` imports; `context.fileName` can be set to `AGENTS.md`; `/memory show`, `/memory reload`.
- Skills: built-in, extension, `~/.gemini/skills/`, `.gemini/skills/`; **activation requires consent; no auto-invocation**; metadata only initially (progressive disclosure).

**Fit:** good future adapter; the consent/no-auto-invoke behavior makes always-on persona content essential. Not installed locally. MVP: not selected.

### 3.8 Qoder CLI

**Status: compatibility assessment target for Phase 1. Not an MVP adapter. No compatibility claim.**

| State | Evidence |
|---|---|
| **Documented** | Skills: user `~/.qoder/skills/{skill-name}/SKILL.md`, project `.qoder/skills/{skill-name}/SKILL.md`; user-level skills override project-level on name conflict; auto-trigger or `/skill-name`; `/skills`, `/skills reload`; progressive disclosure; scripts/templates allowed. Memory: user `~/.qoder/AGENTS.md`, project `<project>/AGENTS.md`, local `<project>/AGENTS.local.md`, `.qoder/rules/`; project instructions injected every session; `/init` generates `AGENTS.md`. ([Qoder skills](https://docs.qoder.com/cli/Skills); [Qoder memory](https://docs.qoder.com/cli/how-memory-works)) |
| **Experimentally verified** | Only local filesystem presence: Qoder Desktop configuration, skills, and plugin `SKILL.md` files exist under `~/.qoder`. **No Qoder skill, AGENTS.md, rule, or managed-block integration test has been run.** The `qoder` and `qc-cli` commands were not on PATH in this shell. |
| **Unknown** | Actual auto-invocation reliability; whether Qoder follows the Agent Skills standard; `.qoder/rules` frontmatter and precedence (the `/cli/rules` page returned 404); whether HTML comments / managed blocks survive; context/token accounting; headless or non-interactive evaluation; Windows behavior; exact CLI version and executable path; conflict behavior in practice. |

**Why Phase 1 assessment:** Qoder is the local host and a plausible adapter target, but the gap between "documented file paths" and "the agent actually loads the profile reliably" is exactly where compatibility claims fail. The assessment must be a scratch-repository integration test, not a documentation inference.

**Assessment deliverables (Phase 1):**

1. Pin the Qoder CLI version and executable; record how it is launched.
2. Install a minimal `AGENTS.md` managed block and one test skill in a scratch repo.
3. Verify observable behavior: instruction loaded, skill triggered (auto or slash), precedence, user/project conflict, uninstall residue.
4. Test `.qoder/rules` only if official documentation is available; otherwise mark unknown.
5. Record evidence and a three-state status table. **No "compatible" claim unless the test passes.**

**Fit:** assessment target only. An adapter remains post-MVP and conditional on the assessment. Phase 1 status: incomplete (no runnable Qoder CLI in this environment); see `docs/qoder-assessment.md`. No compatibility claim.

### 3.9 Adjacent harnesses

The [agents.md](https://agents.md/) page lists additional tools (Windsurf, Aider, Zed, Junie, Amp, RooCode, Kilo Code, Semgrep, Warp, VS Code, Devin, Ona, Augment Code, Factory, goose, opencode, UiPath, Phoenix, Jules). Their deeper mechanisms were **not** individually verified in this study. They are post-MVP; the portable `AGENTS.md` renderer is the intended future lowest-common-denominator path, with no capability claims beyond "reads AGENTS.md".

---

## 4. Comparison matrix

| Harness | Always-on file | On-demand | Precedence model | Progressive disclosure | Headless eval | Enforcement surfaces | MVP fit |
|---|---|---|---|---|---|---|---|
| **Claude Code 2.1.x** | `CLAUDE.md` (managed block) | `.claude/skills` + references | Managed, user, project, local listed; nested on demand; AGENTS.md fallback | Yes (skills) | Yes: `-p`, JSON, cost, budget, schema, bare baseline | Permissions, hooks, sandbox (not native Windows) | **Selected** |
| **AGENTS.md portable** | `AGENTS.md` managed block | None | Harness-defined; closest/merge varies | No | Harness-dependent | None from HAHahah | Post-MVP (deferred) |
| Codex | `AGENTS.md` | `.agents/skills` | Merge global → project; closer overrides; 32 KiB | Yes (skills) | `codex exec --json`; cost emission unverified | Sandbox modes | Post-MVP |
| Gemini CLI | `GEMINI.md` or `AGENTS.md` via config | `.gemini/skills` | Global, workspace, JIT | Yes (metadata only) | Not verified | Consent-based skills | Post-MVP |
| Cursor | `.cursor/rules/*.mdc`, `AGENTS.md` | `.cursor/skills`, `.agents/skills` | Team > Project > User; nested AGENTS.md | Yes | CLI not installed/verified | IDE permissions | Post-MVP |
| Copilot | `.github/copilot-instructions.md`, scoped instructions, `AGENTS.md` | Skills support not verified | Personal > Repo > Org | Unverified | Not verified | Platform controls | Post-MVP, caution |
| Qoder CLI | `AGENTS.md`, `.qoder/rules` | `.qoder/skills` | User-level skill overrides project; memory paths | Documented | Unverified | Host permissions | **Phase 1 assessment; adapter post-MVP** |

**Legend:** "Verified" means official documentation or local evidence in this study. "Unverified" means not confirmed; do not treat as a capability.

---

## 5. Cross-cutting findings

1. **No universal on-demand mechanism.** Agent Skills is the closest to a standard (Claude Code, Codex, Gemini CLI, Cursor officially; Qoder structurally similar but unverified), but paths and invocation differ. A canonical source plus adapters is justified.
2. **Always-on files differ and are not interchangeable.** `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules`, and Copilot instructions have different discovery and precedence. One universal file would be a lowest-common-denominator compromise, not an integration strategy.
3. **Precedence is not portable.** Codex concatenates and lets closer files override; Cursor combines nested files with more specific precedence; Copilot puts personal instructions above repository instructions; Claude Code uses `CLAUDE.md` and only falls back to `AGENTS.md` when no `CLAUDE.md` exists. HAHahah must not rely on a global "project wins" assumption.
4. **Skills reduce steady-state token cost but are not free.** Metadata is loaded at startup; descriptions and body budgets matter. Gemini requires consent and does not auto-invoke, so always-on persona content is still necessary for baseline voice.
5. **Enforcement lives in the harness.** Claude Code enforces permission rules itself and states that hooks cannot bypass deny rules; prompt instructions cannot grant permissions. HAHahah must be honest that it is not a security boundary.
6. **Evaluation support is uneven.** Claude Code currently offers the best documented headless surface (JSON result, cost, budget cap, JSON schema, bare mode). Codex has `codex exec --json` but cost emission was not documented; Qoder/Gemini/Cursor automation was not verified.
7. **Windows is a second-class citizen for sandboxing.** Claude Code runs shell commands unsandboxed on native Windows; this workstation has no WSL or Docker. Any destructive/autonomous evaluation needs an isolated environment or must be simulated.
8. **Harness docs drift.** The OpenAI docs moved to `learn.chatgpt.com`; Qoder docs are sparse; Agent Skills is young. Contract tests and a versioned compatibility table are necessary.

---

## 6. Reference harness recommendation

**Recommendation: Claude Code 2.1.x as the only real adapter in `0.1.0`. The portable `AGENTS.md` renderer is post-MVP. Qoder is a Phase 1 compatibility-assessment target, not an adapter (D-005, D-026).**

### Why Claude Code

- **Installed and observable:** 2.1.278 on this workstation; no setup blocker.
- **Richest documented instruction surface:** `CLAUDE.md`, skills, subagents, hooks, output styles, permissions, sandbox, headless.
- **Agent Skills standard:** real progressive disclosure with an official standard format.
- **Evaluation-friendly:** `-p`, `--output-format json` with `result`, `session_id`, `total_cost_usd`; `--max-budget-usd`; `--json-schema`; `--bare` for a clean baseline; permission modes.
- **Honest enforcement:** permission rules are harness-enforced; this lets the architecture show a real boundary between prompt-layer style and tool-level safety.
- **Cross-platform presence:** native Windows is supported, with the documented sandbox gap that the project can disclose and test around.

### Why not the others for MVP

| Candidate | Why not now |
|---|---|
| OpenAI Codex | Not installed; skills are documented but maturity is not stated; `codex exec` cost/token emission is not documented in the fetched page. Strong post-MVP candidate. |
| Gemini CLI | Skills require consent and do not auto-invoke; not installed; adds a different always-on file and consent UX. Good post-MVP candidate. |
| Qoder CLI | Local host, but compatibility is unverified; the skills page does not claim the open standard and headless evaluation is unknown. Assessment in Phase 1; adapter post-MVP only if a real test passes. |
| Cursor | IDE-first; CLI not installed; evaluation automation unverified. Good post-MVP adapter. |
| GitHub Copilot | Personal instructions outrank repository instructions; the project-level safety layer cannot rely on precedence. Not suitable as the reference for a safety-sensitive personality layer. |

### Why the `AGENTS.md` renderer is deferred

- A second real target is useful, but it adds tests, a second token profile, and distribution surface; it is not required to preserve the canonical/adapter separation.
- The adapter interface is exercised by a fake adapter in Phase 1 plus contract tests (managed blocks, idempotency, path safety, uninstall).
- The portable renderer remains a documented post-MVP target. Deferring it does not change the canonical format.
- If the owner has capacity, Option A in D-005 can restore it; the current recommendation is one real adapter for `0.1.0`.

### Claude Code adapter mapping (MVP)

| Canonical layer | Claude Code artifact |
|---|---|
| Core: identity, safety, decision, efficiency | `CLAUDE.md` managed block (compacted) |
| Persona card | Same managed block |
| Detailed voice and lexicon | `.claude/skills/hahahah-<persona>/SKILL.md` |
| Culture references, examples, boundaries | `.claude/skills/hahahah-<persona>/references/*.md` |
| Manifest, hashes, budget | `.hahahah/manifest.json` |
| Evaluation | `claude -p --output-format json` |

**Install paths (proposed):**

```text
<repo>/
├── CLAUDE.md                          # managed block only
├── .claude/
│   └── skills/
│       └── hahahah-rusuh/
│           ├── SKILL.md
│           └── references/
│               ├── voice.md
│               ├── lexicon.md
│               └── humor-boundaries.md
└── .hahahah/
    └── manifest.json
```

**Future Qoder mapping (not implemented, not a compatibility claim):**

| Canonical layer | Qoder artifact (proposed) | Status |
|---|---|---|
| Always-on core + persona card | `AGENTS.md` managed block; `.qoder/rules/` only if documented | Paths documented; loading/precedence unverified |
| Detailed voice and lexicon | `.qoder/skills/hahahah-<persona>/SKILL.md` | Paths documented; auto-invocation and standard compliance unverified |
| Manifest, hashes, budget | `.hahahah/manifest.json` | Adapter-owned; no Qoder-specific fields |
| Evaluation | Unknown | No headless Qoder runner verified |

The Qoder adapter would map paths and invocation; it must not add Qoder-specific fields to the canonical source. If Qoder cannot preserve managed blocks or expose a reliable skill trigger, the adapter is not shipped and the limitation is recorded.

---

## 7. Drift monitoring and compatibility

| Watch item | Why | Check | Cadence |
|---|---|---|---|
| Agent Skills spec (`name`, `description`, limits, layout) | Frontmatter validation and discovery | Spec diff + validator | Before each release |
| Claude Code `CLAUDE.md`/skills/hooks/headless/sandbox | Reference adapter correctness | Docs + local smoke test | Before each release |
| AGENTS.md discovery/precedence | Post-MVP portable target | Docs + contract tests | Before re-adding to scope |
| Qoder skills/memory/precedence/headless | Phase 1 assessment and possible post-MVP adapter | Docs diff + scratch integration test | Phase 1; before any adapter |
| Codex/Gemini/Cursor docs | Post-MVP adapters | Docs diff | Quarterly |
| Tokenizer/caching/pricing | Efficiency claims | Provider docs + calibration | Before publishing any benchmark |
| Model/version pins | Reproducibility | Manifest + report metadata | Every benchmark |
| Windows sandbox changes | Safety of eval | Local check | Each harness update |

Contract tests are **documented-behavior tests**, not live scrapers: verify managed-block idempotency, skill frontmatter, path allowlists, and expected file locations. A harness change that breaks a contract test is a release blocker for that adapter.

---

## 8. Unverified claims and open questions

These must not be treated as capabilities until verified:

1. **Claude Code memory precedence semantics.** The docs list managed policy, user memory, project memory, and local project memory. It is unclear whether this is a strict conflict-precedence order or a load order. HAHahah must avoid depending on it.
2. **Copilot AGENTS.md merge algorithm.** "Nearest takes precedence" was extracted from the docs; the exact interaction with personal/repo/org precedence is not verified.
3. **Codex skills maturity.** Official docs exist, but the fetched page does not state stable/experimental status or frontmatter limits beyond `name`/`description`.
4. **Gemini skill paths and consent UX.** Paths are documented; the exact consent flow and whether project-level skills can be pre-approved were not verified.
5. **Qoder standard compliance and behavior.** The skill format is structurally similar; the docs do not claim agentskills.io adherence, and compatibility is unverified. Auto-invocation reliability, `.qoder/rules` frontmatter/precedence (the `/cli/rules` page returned 404), managed-block preservation, context/token accounting, headless evaluation, and Windows behavior are all unverified. **No Qoder compatibility claim is allowed until the Phase 1 scratch test passes.**
6. **Cursor skills auto-apply semantics.** The docs say auto-apply or `/`; the exact trigger reliability and precedence versus `.cursor/rules` were not measured.
7. **Headless evaluation for Codex/Gemini/Cursor/Qoder.** Only Claude Code's headless surface was verified locally and in docs.
8. **Windows behavior for non-Claude harnesses.** Not tested.
9. **Adoption/market share.** No reliable numbers were collected; do not use popularity claims without a source.
10. **OpenAI hosted Evals.** The hosted Evals platform is reported read-only from 2026-10-31 and shutting down 2026-11-30; use local runners. This is a secondary-source claim and should be re-checked before relying on it.

---

## 9. Sources

All accessed **2026-11-01**.

**Open standards**

- AGENTS.md: https://agents.md/
- Agent Skills specification: https://agentskills.io/specification
- Agent Skills overview: https://agentskills.io/

**Vendor documentation**

- Claude Code memory: https://code.claude.com/docs/en/memory
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Claude Code output styles: https://code.claude.com/docs/en/output-styles
- Claude Code permissions: https://code.claude.com/docs/en/permissions
- Claude Code headless: https://code.claude.com/docs/en/headless
- Claude Code sandboxing: https://code.claude.com/docs/en/sandboxing
- Cursor rules: https://cursor.com/docs/context/rules
- Cursor skills: https://cursor.com/docs/skills
- GitHub Copilot custom instructions: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- OpenAI Codex AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- OpenAI Codex skills: https://learn.chatgpt.com/docs/build-skills
- OpenAI Codex non-interactive mode: https://learn.chatgpt.com/docs/non-interactive-mode
- Gemini CLI GEMINI.md: https://geminicli.com/docs/cli/gemini-md/
- Gemini CLI skills: https://geminicli.com/docs/cli/skills/
- Qoder CLI skills: https://docs.qoder.com/cli/Skills
- Qoder CLI memory: https://docs.qoder.com/cli/how-memory-works

**Local evidence**

- `claude --version` → 2.1.278; `claude --help` → flags cited above.
- `node --version` → v24.22.1; `npm --version` → 11.19.1; `python --version` → 3.14.7; `git --version` → 2.55.0.windows.5.
- `docker --version` → not found; `wsl -l -q` → WSL not installed.
- `command -v codex cursor-agent gemini aider` → not found.
- `~/.qoder/skills` and plugin `SKILL.md` files exist locally; Qoder CLI itself not on PATH.

---

*End of integration research. Capability claims are limited to the sources above; unverified items remain open.*
