export function isNewerVersion(remote: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split(/[-+.]/)
      .map((p) => Number.parseInt(p, 10))
      .filter((n) => !Number.isNaN(n));

  const rParts = parse(remote);
  const cParts = parse(current);
  const maxLen = Math.max(rParts.length, cParts.length, 3);

  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] ?? 0;
    const c = cParts[i] ?? 0;
    if (r !== c) {
      return r > c;
    }
  }
  return false;
}

export function formatUpdateNotice(current: string, latest: string): string {
  return [
    '',
    '┌────────────────────────────────────────────────────────┐',
    `│  Pembaruan Anti-Yapping tersedia: v${current} → v${latest}`.padEnd(57) + '│',
    '│  Jalankan perintah berikut untuk memperbarui:          │',
    '│  $ npx anti-yapping update                             │',
    '└────────────────────────────────────────────────────────┘',
    '',
  ].join('\n');
}

export async function checkRemoteUpdate(currentVersion: string): Promise<string | null> {
  if (process.env.HAHAHAH_NO_UPDATE_CHECK || process.env.CI) {
    return null;
  }
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/humanoiseLABS/anti-yapping/main/package.json',
      {
        signal: AbortSignal.timeout(1500),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    if (data.version && isNewerVersion(data.version, currentVersion)) {
      return data.version;
    }
  } catch {
    // Offline or timed out - silently ignore
  }
  return null;
}
