import { existsSync, rmSync } from 'node:fs';

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
