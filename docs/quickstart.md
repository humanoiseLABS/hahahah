# HAHahah quickstart — Phase 3 draft

> **Status:** Phase 3 content-hardening draft. RUSUH is review-pending and must not be treated as a released persona.
> **Harness:** Claude Code 2.1.x only. Qoder is not supported or claimed.

## Prerequisites

- Node.js 24+
- Claude Code installed and authenticated (`claude --version`, then `/login` if needed)
- A working Claude Code provider/model. Verify with `claude auth status`; the settings must not point at an unsupported proxy model. A simple `claude -p "hi" --output-format json` must return JSON before eval.
- This HAHahah checkout (the CLI loads profiles/content from its own working directory)
- A separate trusted project directory to install into

## Inspect before installing

```bash
npm ci
npm run typecheck
npm test
node src/cli.ts measure --profile rusuh-id --adapter claude-code
node src/cli.ts install --profile rusuh-id --target /path/to/your-project --dry-run
```

`measure` prints token usage and budget status without writing. `install --dry-run` prints the plan without changing files.

## Install

```bash
node src/cli.ts install --profile rusuh-id --target /path/to/your-project
node src/cli.ts doctor --target /path/to/your-project
```

The install writes:

- a managed block in `CLAUDE.md` (everything outside the markers is preserved);
- `.claude/skills/hahahah-rusuh/SKILL.md`, `references/lexicon.md`, `references/core/*.md` (the full identity, safety, decision, and efficiency policies) and `references/culture/*` (culture KB, loaded only when read);
- `.hahahah/manifest.json`.

It refuses to overwrite unmanaged or modified files without `--force`. Re-running install is stable for generated files. `uninstall` removes only manifest-owned content and leaves no empty directories behind; a pre-existing `.claude` with your own files is preserved.

## Use

Start Claude Code in the project and ask a normal coding question. The always-on block carries the core and RUSUH card; the skill/references provide deeper culture guidance when activated.

If a review-pending warning appears, that is expected for this draft. Do not publish it as a released persona.

## Evaluate

```bash
node src/cli.ts eval --profile rusuh-id --suite smoke --limit 1 --budget-usd 0.10
# optional: pin a harness model or settings scope
node src/cli.ts eval --profile rusuh-id --suite smoke --limit 1 --budget-usd 0.10 --model sonnet
# fail the command when a treatment answer violates a screen
node src/cli.ts eval --profile rusuh-id --suite smoke --limit 5 --budget-usd 0.10 --strict
```

The eval runner creates separate baseline and treatment repositories, installs the treatment, runs the same prompt through the pinned harness, and writes `report.json` and `report.md` under `.hahahah/eval/`. If the harness fails, the report records the error; it does not invent an answer.

Each smoke task carries deterministic screens (`evals/smoke.yaml` → `src/checks.ts`):

- `language`: counts Indonesian vs English function words/particles, so a code-switched technical answer still reads as Indonesian;
- `require`: patterns that must appear (a refusal, a clarifying question mark, a safer alternative);
- `forbid`: patterns that must not appear (emoji in serious mode, slang, or religious verdict words such as `dosa`, `neraka`, `haram`).

A result is `pass`, `fail`, or `unknown` (no markers, mixed text, invalid pattern). These are surface screens for triage, not semantic judges: a pass does not approve an answer, and a human review is still required before any persona release.

## Uninstall

```bash
node src/cli.ts uninstall --target /path/to/your-project --dry-run
node src/cli.ts uninstall --target /path/to/your-project
```

Only manifest-owned files and the managed block are removed. User content outside the block is preserved. If you created `CLAUDE.md` only through HAHahah and nothing else remains, it is removed.

## Safety notes

- The eval runner never uses `--dangerously-skip-permissions`.
- Native Windows shell execution is unsandboxed; use a disposable repository and a hard `--budget-usd` cap.
- Qoder compatibility is unverified; see `docs/qoder-assessment.md`.
- RUSUH linguistic, cultural, and safety reviews remain pending.
