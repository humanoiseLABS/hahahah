# Harness parity: portable AGENTS.md, opencode runner, permission posture

Measured on this machine, 2026-11-04. Raw reports:
[evidence/harness-parity](evidence/harness-parity). Nothing below is a projection — each number
comes from a command that ran.

## 1. Portable `agents-md` adapter

For harnesses that read a repo-level `AGENTS.md` and the vendor-neutral Agent Skills location
`.agents/skills/` (Cursor, Codex, Qoder CLI per `INTEGRATION_RESEARCH.md` §3.2), and that do not
look at `.claude/` at all.

New: [src/adapters/agents-md.ts](../src/adapters/agents-md.ts). Declared in all three profiles,
registered in the build map.

Layout it emits:

| Artifact | Path |
| --- | --- |
| always-on core + persona card | `AGENTS.md` (managed block) |
| voice / adaptive engine | `.agents/skills/hahahah-rusuh/SKILL.md` |
| lexicon, core policies, culture | `.agents/skills/hahahah-rusuh/references/**` |

Proven by [test/agents-md-adapter.test.ts](../test/agents-md-adapter.test.ts): no `CLAUDE.md` is
created, the skill tree lands under `.agents/`, and install → doctor → uninstall round-trips while
preserving a pre-existing user `AGENTS.md`.

**What is NOT proven:** no third-party harness was run against this output on this machine — only
Claude Code and opencode are installed here. The layout follows the documented paths; the
consumption side is unverified until someone points Cursor or Codex at a real install.

## 2. opencode headless runner

New: [src/opencode.ts](../src/opencode.ts) — `opencode run --format json --dir <workspace>`.

| Surface | Measured behaviour |
| --- | --- |
| Output format | NDJSON events, **not** one JSON object. Text arrives in `type:"text"` parts, cost and tokens on the last `type:"step_finish"`, failures as `type:"error"`. A single `JSON.parse` of stdout always fails. |
| Windows launch | `spawnSync opencode` → `ENOENT`. opencode here is a `.cmd` shim, so the runner wraps it in `cmd.exe /d /s /c`, the same way `runClaude` already does. |
| Cost | A free-tier model reports `cost: 0`. `--budget-usd` is therefore a **declared ceiling**, not a measured spend; the runner only errors when a non-zero cost exceeds it. |
| Turns | `num_turns` is counted from `step_finish` events. |

Wired through `--harness claude|opencode` on `eval` and `fixtures run`
([src/cli.ts](../src/cli.ts)). The flag also picks the **adapter** the treatment is installed
for, because a mismatch measures nothing: opencode reads `AGENTS.md`, Claude reads `CLAUDE.md`.
`fixtures diagnose` stays Claude-only — it streams `stream-json`, which opencode does not offer.

### Live evidence

Conversational suite, 2 tasks × 2 arms, `opencode/beam-free`, ceiling $0.40, spent **$0.0000**:

| Task | Baseline | Treatment |
| --- | --- | --- |
| `rv-greet-01` | `Halo juga, gila!` — screen `fail` | `RUSUH: halo juga, bang! Siap gasss hari ini?` — screen `unknown` |
| `rv-serious-incident-01` | `Stop all writes immediately; don't run any commands...` — **`fail`: language en** | `Hentikan traffic/write ke DB sekarang, jangan sentuh disk...` — **`pass`** |

The incident task is the real signal: without the layer the model answered an Indonesian outage in
English; with it, it stayed Indonesian. That is the language rule working on a second harness.

The greeting `unknown` is honest, not a bug: `detectLanguage` returns `unknown` for text with no
markers rather than guessing, and a 7-word reply has too few. Do not read it as a pass.

Coding fixture, `cod-health-check-partial`, treatment arm only, 5 turns:

```
changedFiles: ["src/health.js"]   pass/fail: 4/0   grade: solved
```

## 3. The `--dir` defect (found while proving the above)

The first coding run graded **`failed`** with `changedFiles: []`, while the agent's own reply said
*"Created src/health.js (and src/health.ts)"*. A minimal probe confirmed it: opencode answered
`PROBE.txt dibuat.` and the workspace stayed empty — the file landed in the **project root of the
tool that launched it**, i.e. inside this repo. `src/health.ts`, `src/health.js` and `PROBE.txt`
appeared here as untracked residue and were deleted after confirming they were not tracked.

Cause: setting only the spawn `cwd` is not enough — opencode resolves its own project root.
Passing `--dir <workspace>` fixes it, and the same fixture then graded `solved`.

This is the dangerous shape of bug for this project: had it stayed unfixed, every opencode coding
study would have graded a directory the agent never touched, and `untouched` would have looked
like a persona failure instead of an instrumentation failure. Pinned by
`opencodeArgs pins the workspace with --dir so the grade sees the edits`.

## 4. Permission posture

The default opencode `build` agent resolves to `"*": allow` — looser than the study posture, and
loose enough to let an agent run shell commands on this unsandboxed host. The runner therefore
writes its own config to a scratch directory and points `OPENCODE_CONFIG` at it, rather than
trusting or modifying the target repo's `opencode.json`:

```json
{ "permission": { "edit": "allow", "bash": "deny", "webfetch": "deny",
                  "external_directory": "deny", "doom_loop": "deny" } }
```

Measured enforcement, before the runner existed: a model told to run `echo` returned
`Ditolak: tool bash tidak tersedia` with an `invalid` tool call listing the available tools —
`edit`, `write`, `read`, `grep`, `glob`, `skill`, `task`, `todowrite`, `websearch`. So shell is
gone and writes are present: the same shape as Claude Code's `--permission-mode acceptEdits` with
no shell. The coding run in §2 is the end-to-end proof that writes actually land.

Two notes on parity, because it is not exact:

- `opencode debug agent build` prints the same `"*": allow` list **even with the config applied**
  — that command does not reflect `OPENCODE_CONFIG`. Judging enforcement from it is wrong; the
  live tool-availability probe above is what proves it.
- `capabilities.toolPermissions` on the opencode adapter stays `false`. The adapter renders no
  permission file, because writing `opencode.json` into someone's project would silently widen
  what an install does to that repo. The posture lives in the runner, which owns the workspace.

## 5. Remaining limits

- opencode output has no per-turn token split comparable to Claude's cache fields; usage is the
  last `step_finish` totals only.
- Free-tier `cost: 0` means no spend can be reported for opencode runs, so cost comparisons between
  harnesses are not possible here — only token and turn counts.
- `--auto` exists on opencode and is self-labelled dangerous; the runner never uses it.
- The `.agents/skills/` consumption path is documented, not observed.
- `runOpencode` writes one scratch config directory per call and does not delete it; it is inside
  the scratch root and harmless, but it is unbounded across a long campaign.
