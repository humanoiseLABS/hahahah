# HAHahah

HAHahah is a personality and efficiency layer for existing coding agents. This repository is at **Phase 3**: the Claude Code adapter, managed-block installer, doctor/uninstall lifecycle, eval runner with deterministic screens, and the content hardening driven by the first live run are implemented. The RUSUH persona remains review-pending.

Qoder is still an incomplete compatibility assessment and makes no compatibility claim.

## Commands

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
- `install` writes a managed `CLAUDE.md` block, `.claude/skills/hahahah-rusuh/`, and `.hahahah/manifest.json`.
- `doctor` verifies files, hashes, and the managed block.
- `uninstall` removes only manifest-owned content.
- `eval` runs baseline/treatment through headless Claude Code and writes `.hahahah/eval/report.{json,md}`. `--task <id>` selects tasks; `--strict` exits non-zero when a treatment answer fails a screen.
- `build` with the fake adapter remains available for deterministic contract tests.

## Current status

- Core policies: authored and within the always-on target (Claude managed block 420/420; hard cap 600). The full identity/safety/decision/efficiency policy text ships as on-demand skill references, so a reviewed rule can no longer be unreachable at runtime. Human review pending.
- Phase 3 content fixes: the always-on core carries a language policy, an explicit no-religious-ruling rule, and `A user can waive scope, not truth.` — each driven by an observed live failure. See `docs/phase-3-content-hardening.md`.
- Eval: deterministic `language`/`require`/`forbid` screens (`src/checks.ts`). These are surface screens for triage, not semantic judges.
- Suites: `evals/smoke.yaml` (5), `evals/decisions.yaml` (24), `evals/safety.yaml` (23), `evals/preservation.yaml` (12) — all 64 tasks carry `language` + `require`/`forbid` screens, coverage of every documented instruction class, risk class 0–4, and safety threat family is asserted by test, and screen patterns are compiled at suite load so a broken regex fails before any API call.
- Live results on the current provider (47 tasks, 94 runs, ≈$13.2): the language policy holds across models — baseline answered English on 29 of 47 tasks, the treatment on 4. The layer's real input cost is **+710 tokens/run** (ablation: 19,048 → 19,758); the apparent +95% cost was provider token-accounting spikes, not the persona. Open findings: comply-under-pressure is fixed in one of two scenarios, the model confabulates file paths in both arms, and RUSUH is still unreviewed. See `docs/phase-3-live-suite-results.md`.
- Personas: RUSUH, HALAL (`profiles/halal-id.yaml`), and JAWA (`profiles/jawa-id.yaml`) are drafted with voice, card, lexicon, examples, and test cases. Every review state is `pending`, all three install and uninstall cleanly through the same path, and `build --release` fails closed for each. HALAL and JAWA have never been executed against a model.
- Culture KB: small sourced seed; review pending. `culture/id/religious-expression.md` and the four expanded `core/*.md` policies are mounted as skill references.
- Qoder: assessment incomplete; no adapter and no compatibility claim. See `docs/qoder-assessment.md`.

See `docs/quickstart.md`, `docs/phase-2-integration-findings.md`, `docs/phase-3-content-hardening.md`, `docs/phase-3-live-suite-results.md`, and the Phase 0 documents.
