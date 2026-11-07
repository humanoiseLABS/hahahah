# HAHahah quickstart

> **Status:** **+62 Mode** (`--profile rusuh-id`) is signed off and published on npm as [`hahahah-ai`](https://www.npmjs.com/package/hahahah-ai). `HALAL` and `JAWA` remain review-pending drafts.
> **Harness:** Claude Code 2.1.x and opencode 1.18.x verified; adapters also provided for Antigravity, `AGENTS.md` (Cursor/Codex), Qoder, and GitHub Copilot.

## Prerequisites

- Node.js 22+
- A coding agent installed (e.g., Claude Code, opencode, Antigravity, Cursor, Copilot)
- A project directory to install into

## Quick Install via `npx` (No Repo Clone Required)

Run directly inside your project directory:

```bash
# Preview token budget and planned files without writing
npx hahahah-ai measure --profile rusuh-id --adapter claude-code
npx hahahah-ai install --profile rusuh-id --target . --dry-run

# Install +62 Mode into the current project
npx hahahah-ai install --profile rusuh-id --target .

# Verify installation integrity
npx hahahah-ai doctor --target .

# Update or uninstall at any time
npx hahahah-ai update --target .
npx hahahah-ai uninstall --target .
```

## Local Repository Development & Inspection

If you cloned this repository to contribute or run evaluations:

```bash
npm ci
npm run typecheck
npm test
node src/cli.ts measure --profile rusuh-id --adapter claude-code
node src/cli.ts install --profile rusuh-id --target /path/to/your-project --dry-run
```

`measure` prints token usage and budget status without writing. `install --dry-run` prints the plan without changing files.

## Install from Local Checkout

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

## Coding fixtures

```bash
# free: prove every fixture is red in its task state and green with the reference solution
node src/cli.ts fixtures check

# free: print what a study would cost, call no model
node src/cli.ts fixtures run --budget-usd 0.35
node src/cli.ts fixtures run --id cod-expiry-gte --limit 1 --budget-usd 0.35

# spend: only after stating the ceiling you approve
node src/cli.ts fixtures run --budget-usd 0.35 --max-total-usd 45 --live
# a preflight costs half as much on one arm, and cannot compare the two
node src/cli.ts fixtures run --id cod-expiry-gte --arm treatment --budget-usd 1 --max-total-usd 3 --live
```

`fixtures run` is the model-facing half. For each fixture it seeds two disposable repositories with the same broken files, installs the profile in the treatment one only, sends the same brief to both, then **executes the fixture's own test suite in each workspace** and grades the result. That makes this a correctness signal rather than a text screen, so it is the one measurement here that can say whether the persona layer changed whether the task was actually solved. Reports land in `.hahahah/coding/report.json` and `report.md`, which stay untracked like the eval reports.

Grades, per run: `solved` (the untouched tests passed), `failed` (a real attempt that did not pass), `tampered` (a test file was edited, deleted, or added — never counted as solved, even when the suite then goes green), `untouched` (the agent replied without changing any file), `error` (the run did not complete, or the grader itself could not run, so it is not scored at all). Fixtures marked `hidden` are held out and tallied separately in the report, so a score on the visible set cannot stand in for one on tasks the content was not authored against.

The grading command is pinned so that two runs of the same fix give the same grade on two different machines. It runs **only the test files the fixture declares** — bare `node --test` also discovers `*_test.js`, `*-test.js` and `test-*.js`, so a scratch file the agent left behind could otherwise add undeclared passes or fail the grade for an unrelated reason (measured: bare discovery reported `pass=4` where the fixture declares 2). It runs the same Node binary that is running this tool, seeds its own `package.json` so ESM loading does not depend on a manifest somewhere above the temp directory, pins `TZ=UTC` (a defensible `date.getDay()` fix measured 3/3 in Jakarta and 1/3 in Los Angeles before this), and passes no inherited environment variables.

Spend is opt-in and bounded. Without `--live` nothing is called. With `--live` the command refuses unless you pass `--max-total-usd`, and refuses again when `fixtures × repeats × 2 × --budget-usd` exceeds it, so a 60-fixture campaign cannot start by accident.

Read that projection as the sum of the caps, not as the bill. The harness checks its budget between turns and stops only after going past it, so a capped run overshoots: measured on 2026-11-04, arms capped at $0.35 each reported $0.51 and $0.41. A run that dies on the cap also returns no agent text, so it grades `error` and cannot be audited afterwards — budget per run generously rather than tightly, or the study pays for unexplainable gaps.

A run always writes its report. If the harness still holds a workspace open when the tool cleans up, the directory is listed under `Workspace residue` in `report.md` and left for you to delete rather than aborting the run. A harness that hangs or cannot reach the API shows up as `error` with its own message, not as a failed task — check the provider before reading that as anything about the persona.

Two limits to read before trusting a number from this:

- The agent runs headless with `--permission-mode acceptEdits` and `--permission-prompts none`: file edits are accepted, everything else (including the shell, so the agent cannot run the tests itself) is denied. Pass rates are conditioned on that and are not a claim about interactive use.
- That posture is now **measured, not read out of `--help`**: a live `fixtures diagnose` run showed `Read`/`Glob`/`Edit` granted and `Bash` denied. It also found a trap worth knowing on Windows — if the scratch directory arrives as a short 8.3 path (`C:\Users\FTNADI~1\…`), the harness demands approval for *every* tool and there is nobody to ask, so the run reads nothing and still bills you. `scratchRoot()` resolves it; the diagnostic below is how you see it happen.

```bash
# one arm, one fixture, with the harness event stream kept: what did it try, what was refused
node src/cli.ts fixtures diagnose --id cod-expiry-gte --budget-usd 0.5 --max-total-usd 1 --live
```

It prints the tools attempted, any `DENIED:` line verbatim, which files the agent changed, and the test counts from grading the workspace it left behind. The raw stream and the workspace are both kept on disk and their paths are printed, because deleting them is what made the first three paid runs unexplainable.

## Uninstall

```bash
node src/cli.ts uninstall --target /path/to/your-project --dry-run
node src/cli.ts uninstall --target /path/to/your-project
```

Only manifest-owned files and the managed block are removed. User content outside the block is preserved. If you created `CLAUDE.md` only through HAHahah and nothing else remains, it is removed.

## Safety notes

- Neither runner uses `--dangerously-skip-permissions` or `--permission-mode bypassPermissions`. The coding study widens the agent's reach to file edits and nothing else, because its task is to edit files.
- Native Windows shell execution is unsandboxed; use a disposable repository and a hard `--budget-usd` cap.
- Qoder compatibility is unverified; see `docs/qoder-assessment.md`.
- RUSUH linguistic, cultural, and safety reviews remain pending.
