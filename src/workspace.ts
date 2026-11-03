import { existsSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Windows can hand out an 8.3 short name for a temp directory (C:\Users\FTNADI~1\...), and a
// harness given that as its working directory refuses every tool call inside it — measured: Glob
// and Grep both came back "no approval surface in this session", and $1.32 bought no file reads.
// Everything graded lives under the resolved path instead.
export function scratchRoot(): string {
  const base = tmpdir();
  try {
    // Only the native implementation expands an 8.3 short name; plain realpathSync hands the
    // short path straight back, which is the thing the harness refuses to work in.
    return realpathSync.native(base);
  } catch {
    return base;
  }
}

// A child process that has just exited can still hold files in its working directory open on
// Windows, and rmSync then throws EPERM. That throw used to escape a `finally` block and
// destroy the run's report after the calls were already paid for. Removal is therefore
// best-effort: residue costs disk, a lost report costs the run.
export function removeWorkspace(dir: string): boolean {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch {
    // Reported by the caller as residue.
  }
  return !existsSync(dir);
}
