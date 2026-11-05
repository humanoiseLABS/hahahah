# HAHahah

HAHahah is a personality and efficiency layer for existing coding agents. This repository is at **Phase 3**: the Claude Code adapter, managed-block installer, doctor/uninstall lifecycle, eval runner with deterministic screens, and the content hardening driven by the first live run are implemented. The RUSUH persona remains review-pending.

Qoder is still an incomplete compatibility assessment and makes no compatibility claim.

## Commands

## Install: pick the adapter for the agent you actually run

`--adapter` decides **which files land where**. Pick it from the agent, not from the folder — installing
for the wrong one writes files that agent never reads, and the persona silently does nothing.

| Agent you run | Command | What it writes |
|---|---|---|
| Claude Code (default) | `install --profile rusuh-id --target <project>` | `CLAUDE.md` block + `.claude/skills/hahahah-rusuh/` |
| opencode | `install --adapter opencode --target <project>` | `AGENTS.md` block + `.claude/skills/` (opencode reads that tree) |
| Antigravity, one project | `install --adapter antigravity --target <project>` | `AGENTS.md` block + `.agents/rules/*.md` |
| Antigravity, every project | `install --adapter antigravity --target ~/.gemini --scope global` | `AGENTS.md` block + `config/rules/*.md` |
| Cursor / Codex / Qoder CLI / anything reading `AGENTS.md` | `install --adapter agents-md --target <project>` | `AGENTS.md` block + `.agents/skills/` |

`node src/cli.ts` with no arguments prints this same table. Uninstall needs only `--target`: the
manifest remembers the adapter, the scope, and every path it wrote.

### How far each of those claims actually goes

Two different things get confused easily, so they are recorded separately: what the vendor
documents, and what anyone has **observed** on real hardware. `test/adapter-coverage.test.ts`
fails CI if an adapter is registered without a row here, if the emitted paths or required
frontmatter drift from the documented ones, or if this table stops matching the registry.

| Adapter | Always-on file | On-demand layer | Verification status | Source of the expectation |
|---|---|---|---|---|
| `claude-code` | `CLAUDE.md` | `.claude/skills/…/SKILL.md` | verified on this machine | https://code.claude.com/docs/en/skills |
| `opencode` | `AGENTS.md` | `.claude/skills/…/SKILL.md` | verified on this machine | opencode 1.18.31 `debug skill` listed the installed skill locally |
| `agents-md` | `AGENTS.md` | `.agents/skills/…/SKILL.md` | documented, not verified | https://agentskills.io/specification |
| `antigravity` | `AGENTS.md` | `.agents/rules/*.md` | documented, not verified | https://antigravity.google/docs/rules/ |

"Documented, not verified" means the files are exactly where the vendor says the agent will look,
and the install round-trips — but no Cursor, Codex, Qoder or Antigravity run on this machine has
yet been shown reading them. Do not present those two rows as tested compatibility.

```bash
npm ci
npm run typecheck
npm test
npm run measure
node src/cli.ts measure --profile rusuh-id --adapter claude-code
node src/cli.ts install --profile rusuh-id --target /path/to/project --dry-run
node src/cli.ts install --profile rusuh-id --target /path/to/project
node src/cli.ts doctor --target /path/to/project
node src/cli.ts eval --profile rusuh-id --suite smoke --limit 1 --budget-usd 0.10
node src/cli.ts eval --profile rusuh-id --suite safety --task saf-religion-fatwa-01 --budget-usd 0.20 --strict
node src/cli.ts eval --profile rusuh-id --suite decisions --limit 4 --budget-usd 0.20
node src/cli.ts uninstall --target /path/to/project
```

- `measure` prints token budgets without writing.
- `install` writes the managed block, the adapter's skill or rules tree, and `.hahahah/manifest.json`.
- `doctor` verifies files, hashes, and the managed block.
- `uninstall` removes only manifest-owned content.
- `eval` runs baseline/treatment headless; `--harness claude|opencode` picks the CLI *and* the adapter the treatment is installed for, since a mismatch measures nothing. `--task <id>` selects tasks; `--strict` exits non-zero when a treatment answer fails a screen.
- `build` with the fake adapter remains available for deterministic contract tests.

## Current status

- Core policies: authored and within the always-on target (Claude managed block 420/420; hard cap 600). The full identity/safety/decision/efficiency policy text ships as on-demand skill references, so a reviewed rule can no longer be unreachable at runtime. Human review pending.
- Phase 3 content fixes: the always-on core carries a language policy, an explicit no-religious-ruling rule, and `A user can waive scope, not truth.` — each driven by an observed live failure. See `docs/phase-3-content-hardening.md`.
- Eval: deterministic `language`/`require`/`forbid` screens (`src/checks.ts`). These are surface screens for triage, not semantic judges.
- Suites: `evals/smoke.yaml` (5), `evals/decisions.yaml` (24), `evals/safety.yaml` (23), `evals/preservation.yaml` (12) — all 64 tasks carry `language` + `require`/`forbid` screens, coverage of every documented instruction class, risk class 0–4, and safety threat family is asserted by test, and screen patterns are compiled at suite load so a broken regex fails before any API call.
- Live results on the current provider (64 tasks across four suites, ≈$22.1): the language policy holds across models — baseline answered English on 29 of 47 tasks in the first two suites, the treatment on 4; the 5 newest injection vectors were refused cleanly 5/5. The layer's real input cost is **+710 tokens/run** (ablation: 19,048 → 19,758); the apparent +95% cost was provider token-accounting spikes, not the persona, which is why the runner now reports medians over k repeats. Open behaviour findings: a payment-path caution dropped under a length constraint, and one reply came back with unfilled `[placeholders]`. See `docs/phase-3-live-suite-results.md`.
- Coding fixtures: `fixtures/` holds the full set of 60 planned micro-tasks (10 marked hidden holdout), each a broken file plus a real `node --test` suite and a reference solution. `node src/cli.ts fixtures check` proves every fixture is red before the fix and green after it, and runs in CI — it already caught one fixture whose own test assertion was wrong. The runner only accepts `node --test`: no shell, no inherited `NODE_OPTIONS`, no option or traversal in the target. `node src/cli.ts fixtures run` is the model-facing half: it seeds the same broken files into a bare and an installed repository, sends both arms the identical brief, then grades each workspace by executing the fixture's own tests — so a `solved` here is a fix that works, not an answer that reads well. Editing, deleting, or adding a test file is graded `tampered` and never counted as solved; a run that did not complete is `error` and is not scored. Spend is opt-in: without `--live` nothing is called, and with `--live` the command refuses until `--max-total-usd` states the approved ceiling. Two independent review rounds then closed seven briefs that under-stated a rule their own test enforced, loosened two assertions that pinned style instead of behaviour, and pinned the grading environment after measurement showed a host could move a grade — declared test files only, `process.execPath`, `TZ=UTC`, seeded module manifest (`TECHNICAL_RISKS.md` R-35, `docs/phase-3-live-suite-results.md` §11). The preflight is answered, and the culprit was ours: `os.tmpdir()` on this machine returns a Windows 8.3 short path, the harness then required approval for *every* tool inside it (even `Glob`), and three paid runs read nothing at all. With the temp root resolved through `realpathSync.native`, a live arm read the tests, found the boundary bug on its own, and wrote the fix: `acceptEdits` really does grant `Read`/`Glob`/`Edit` headless, and `Bash` is refused exactly as designed. Still open: a per-run budget big enough for a run to finish (≈$1-1.5 per arm measured, so a 60-fixture k=1 pass is $120-180 — see `docs/phase-3-live-suite-results.md` §15), and a reviewer reading each brief against its reference solution — the validator proves a fixture is solvable and gradeable, not that the reference solution is the only defensible reading.
- Provenance: verified KBBI and NU Online citations for the religious expressions live in `culture/id/sources.md`, which is deliberately not mounted — references cost runtime tokens, citations do not. *MasyaAllah* and *Subhanallah* still have no verified URL, and inventing a `decay_class` for religious vocabulary was rejected as a distortion rather than a fix.
- Personas: RUSUH, HALAL (`profiles/halal-id.yaml`), and JAWA (`profiles/jawa-id.yaml`) are drafted with voice, card, lexicon, examples, and a 12-scenario rubric file each — the count is a test assertion, not a note. Every review state is `pending`, all three install and uninstall cleanly through the same path, and `build --release` fails closed for each. Only RUSUH has been executed against a model; HALAL and JAWA have not.
- Culture KB: small sourced seed; review pending. `culture/id/religious-expression.md` and the four expanded `core/*.md` policies are mounted as skill references; `culture/jv/registers.yaml` now carries `hahahah.culture.registers/v1` so the Javanese register map can be mounted at all, and its `reviewed_by: pending` state blocks release.
- Harnesses: **Claude Code** is the reference target and is verified end-to-end (install, doctor, uninstall, live run, permission posture measured). **opencode** (1.18.31) has its own adapter plus a headless runner (`--harness opencode`): `opencode debug skill` lists the installed skill, a live `opencode run` confirmed the `AGENTS.md` block reaches model context, and a coding fixture graded `solved` with the edit landing in the graded workspace — see `docs/harness-parity.md`. Its study posture is enforced through `OPENCODE_CONFIG` (edit allow, bash/webfetch/external_directory deny) rather than by writing into the target repo. **antigravity** has an adapter that writes `.agents/rules/*.md` with `always_on`/`model_decision` triggers, plus `--scope global` for `~/.gemini/config/rules/`; that layout follows the vendor docs and has **not** been observed loading. **agents-md** emits the vendor-neutral `AGENTS.md` + `.agents/skills/` pair; it is exercised by install/doctor/uninstall round-trips but no Cursor/Codex/Qoder run has read it on this machine. Qoder itself remains unverified — `docs/qoder-assessment.md` still says "Incomplete — no compatibility claim".

See `docs/quickstart.md`, `docs/phase-2-integration-findings.md`, `docs/phase-3-content-hardening.md`, `docs/phase-3-live-suite-results.md`, and the Phase 0 documents.
