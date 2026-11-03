# Qoder compatibility assessment

**Date:** 2026-11-01
**Phase:** 1
**Status:** **Incomplete — no compatibility claim.**
**Scope:** assessment only; no Qoder adapter is implemented.

## Result

Qoder's documentation describes skills and memory files, but no real integration test could be run in this environment. The Qoder CLI executable is not available, and installing or reconfiguring the host is outside the authorized Phase 1 scope.

| State | Evidence |
|---|---|
| **Documented** | Skills: `~/.qoder/skills/{name}/SKILL.md` and `.qoder/skills/{name}/SKILL.md`; auto-trigger or `/skill-name`; `/skills`, `/skills reload`; progressive disclosure. Memory: `~/.qoder/AGENTS.md`, project `AGENTS.md`, `AGENTS.local.md`, `.qoder/rules/`; project instructions injected every session. Sources: `https://docs.qoder.com/cli/Skills`, `https://docs.qoder.com/cli/how-memory-works`. |
| **Experimentally verified** | The Qoder Desktop environment and skill/plugin files exist under `~/.qoder`. **No Qoder skill, AGENTS.md, rule, managed-block, or uninstall test has run.** |
| **Unknown** | Auto-invocation reliability; whether managed HTML comments survive; `.qoder/rules` frontmatter/precedence; skill-standard compliance; context/token accounting; headless/non-interactive evaluation; Windows behavior; conflict behavior. |

## Evidence collected

- `command -v qoder`, `command -v qodercli`, and `command -v qc-cli`: no executable on PATH.
- `~/.qoder/bin` contains `qoder-computer-use` and `qoder-office-xlsx`, not a Qoder CLI.
- `~/.qoder/entry/qoder.cmd` delegates to `qoder-dispatcher.ps1`, which looks for `qodercli` on PATH and then `~/.qoder/bin/qodercli/qodercli.exe`; neither exists in this environment.
- `AppData/Local/Programs/Qoder` contains the IDE `Qoder.exe` versions, but no `qodercli.exe` or `qoder-cli.exe`.
- Environment reports `QODER_CLI=1` for this hosted session, but that is the host agent flag, not a runnable standalone CLI.

## Required integration test (when a CLI is available)

1. Pin the CLI version and executable path.
2. In a scratch repository, install a minimal `AGENTS.md` managed block and one test skill.
3. Verify that the instruction is loaded, the skill triggers (auto or slash), precedence is visible, and the user/project conflict is handled.
4. Uninstall and verify no managed residue.
5. Record observable evidence; do not infer from file presence alone.
6. Mark the assessment **incomplete** if the CLI cannot run non-interactively.

## Decision

No `Qoder-compatible` claim may be made. A Qoder adapter remains post-MVP and conditional on a passing test (D-026). Qoder-specific paths, rule files, and workarounds belong in a future adapter and its tests, never in the canonical core.
