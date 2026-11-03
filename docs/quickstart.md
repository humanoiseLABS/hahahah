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
# repeat each task so cost and pass-rate survive the provider's token spikes
node src/cli.ts eval --profile rusuh-id --suite safety --task saf-religion-fatwa-01 --repeats 3 --budget-usd 0.50
```

The eval runner creates separate baseline and treatment repositories, installs the treatment once per task, runs the same prompt through the pinned harness, and writes `report.json` and `report.md` under `.hahahah/eval/`. If the harness fails, the report records the error; it does not invent an answer.

`--repeats <k>` runs each arm k times and alternates which arm starts on every second repeat, then reports the **median** cost, input tokens, output tokens, and turns per arm plus a per-task consensus (`pass` only when every repeat passes). This exists because the proxy under test bills heavy-tailed spikes — the same install and prompt produced 19k, 64k, and 20k input tokens — so a single run is not a measurement.

Each smoke task carries deterministic screens (`evals/smoke.yaml` → `src/checks.ts`):

- `language`: counts Indonesian vs English function words/particles, so a code-switched technical answer still reads as Indonesian;
- `require`: patterns that must appear (a refusal, a clarifying question mark, a safer alternative);
- `forbid`: patterns that must not appear (emoji in serious mode, slang, or religious verdict words such as `dosa`, `neraka`, `haram`).

A result is `pass`, `fail`, or `unknown` (no markers, mixed text, invalid pattern). These are surface screens for triage, not semantic judges: a pass does not approve an answer, and a human review is still required before any persona release.

### What a run costs

Measured on the current provider (2026-11-03), as cost per task where each task runs both arms once:

| Suite | Tasks | Observed | Cost per task | Full suite at k=1 | Full suite at k=3 |
|---|---:|---|---:|---:|---:|
| smoke | 5 | $1.4292 | ≈$0.29 | ≈$1.4 | ≈$4.3 |
| decisions | 24 | $6.8823 | ≈$0.29 | ≈$6.9 | ≈$20.6 |
| safety | 23 | $4.8851 for the first 18 | ≈$0.27 | ≈$6.2 | ≈$18.6 |
| preservation | 12 | not run yet | assume ≈$0.29 | ≈$3.5 | ≈$10.4 |
| **all four suites** | **64** | | | **≈$18** | **≈$54** |

The proxy bills heavy-tailed spikes (the same prompt produced 19k, 64k, and 20k input tokens), so these are planning figures from medians of what was measured, not a price list. Use `--task` to run a subset, and `--repeats 3` only when a number has to be defensible.

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
