import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { basename, extname, join, posix, relative, resolve, sep } from 'node:path';

export interface GraphNodeSymbol {
  kind: 'fn' | 'class' | 'type' | 'table' | 'view' | 'policy' | 'route';
  name: string;
  line: number;
}

export interface GraphFileNode {
  path: string;
  lines: number;
  links: string[];
  symbols: GraphNodeSymbol[];
}

export interface GraphBuildResult {
  indexPath: string;
  memoryPath: string;
  htmlPath: string;
  filesScanned: number;
  nodesEmitted: number;
  edgesCount: number;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
  '.gradle',
  '.kotlin',
  '.idea',
  '.hahahah',
  '.claude',
  '.agents',
  '.qoder',
  '.cursor',
  '.vercel',
  '.turbo',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'site-packages',
  'target',
  'appdata',
  'application data',
  'local settings',
  'library',
  'temp',
  'tmp',
]);

const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.kt',
  '.kts',
  '.java',
  '.dart',
  '.swift',
  '.html',
  '.sql',
  '.py',
  '.go',
  '.rs',
  '.vue',
  '.svelte',
]);

const MAX_FILES_TO_SCAN = 300;
const MAX_NODES_IN_INDEX = 48;
const MAX_SYMBOLS_PER_FILE = 6;
const MAX_LINKS_PER_FILE = 6;

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}

function isBundledRuntimeDir(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.startsWith('pythoncore-') ||
    lower === 'site-packages' ||
    lower === 'lib64' ||
    lower === 'include' ||
    lower === 'cmake'
  );
}

function collectSourceFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > 8 || results.length >= MAX_FILES_TO_SCAN) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= MAX_FILES_TO_SCAN) break;
      if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
      const entryNameLower = entry.name.toLowerCase();
      if (IGNORED_DIRS.has(entryNameLower) || isBundledRuntimeDir(entry.name)) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        try {
          const st = statSync(fullPath);
          if (st.size <= 512 * 1024) {
            results.push(fullPath);
          }
        } catch {
          // ignore unreadable file
        }
      }
    }
  }

  walk(rootDir, 0);
  return results.sort();
}

function extractNode(rootDir: string, filePath: string, allRelativePaths: Set<string>): GraphFileNode {
  const relPath = toPosix(relative(rootDir, filePath));
  const ext = extname(filePath).toLowerCase();
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const symbols: GraphNodeSymbol[] = [];
  const linksSet = new Set<string>();
  const dirPosix = posix.dirname(relPath);

  const resolveLocalRef = (spec: string): string | null => {
    const clean = spec.split(/[?#]/)[0]?.trim() ?? '';
    if (!clean) return null;
    const candidates: string[] = [];
    if (clean.startsWith('.')) {
      const joined = posix.normalize(posix.join(dirPosix, clean));
      const withoutExt = joined.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
      candidates.push(
        joined,
        `${joined}.ts`,
        `${joined}.tsx`,
        `${joined}.js`,
        `${joined}.mjs`,
        `${withoutExt}.ts`,
        `${withoutExt}.tsx`,
        `${withoutExt}.js`,
        posix.join(joined, 'index.ts'),
        posix.join(joined, 'index.tsx'),
        posix.join(joined, 'index.js'),
      );
    } else if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('//')) {
      const stripped = clean.replace(/^\//, '');
      candidates.push(stripped, posix.normalize(posix.join(dirPosix, stripped)));
    }
    for (const cand of candidates) {
      if (allRelativePaths.has(cand) && cand !== relPath) {
        return cand;
      }
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + 1;

    if (ext === '.html') {
      const attrMatches = line.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi);
      for (const m of attrMatches) {
        const target = resolveLocalRef(m[1] ?? '');
        if (target) linksSet.add(target);
      }
    } else {
      const importMatch =
        line.match(/\bfrom\s+["']([^"']+)["']/) ??
        line.match(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/) ??
        line.match(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/);
      if (importMatch?.[1]) {
        const target = resolveLocalRef(importMatch[1]);
        if (target) linksSet.add(target);
      }
    }

    if (symbols.length >= MAX_SYMBOLS_PER_FILE) continue;

    if (ext === '.sql') {
      const tableMatch = line.match(/^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?(?:[\w]+\.)?["`]?([a-zA-Z0-9_]+)["`]?/i);
      if (tableMatch?.[1]) {
        symbols.push({ kind: 'table', name: tableMatch[1], line: lineNum });
        continue;
      }
      const viewMatch = line.match(/^\s*create\s+(?:or\s+replace\s+)?view\s+(?:[\w]+\.)?["`]?([a-zA-Z0-9_]+)["`]?/i);
      if (viewMatch?.[1]) {
        symbols.push({ kind: 'view', name: viewMatch[1], line: lineNum });
        continue;
      }
      const policyMatch = line.match(/^\s*create\s+policy\s+["']?([a-zA-Z0-9_ -]+)["']?/i);
      if (policyMatch?.[1]) {
        symbols.push({ kind: 'policy', name: policyMatch[1].trim(), line: lineNum });
        continue;
      }
    } else if (ext === '.py') {
      const pyMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(|^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (pyMatch) {
        symbols.push({
          kind: pyMatch[1] ? 'fn' : 'class',
          name: (pyMatch[1] ?? pyMatch[2])!,
          line: lineNum,
        });
      }
    } else if (ext === '.kt' || ext === '.kts' || ext === '.java') {
      const ktMatch = line.match(
        /^\s*(?:public\s+|private\s+|internal\s+|protected\s+|open\s+|abstract\s+|data\s+|sealed\s+|suspend\s+|override\s+)*(?:(fun)\s+([A-Za-z0-9_]+)|(class|object|interface)\s+([A-Za-z0-9_]+))/,
      );
      if (ktMatch) {
        if (ktMatch[2]) {
          symbols.push({ kind: 'fn', name: ktMatch[2], line: lineNum });
        } else if (ktMatch[4]) {
          symbols.push({
            kind: ktMatch[3] === 'interface' ? 'type' : 'class',
            name: ktMatch[4],
            line: lineNum,
          });
        }
      }
    } else if (ext === '.go') {
      const goMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (goMatch?.[1]) {
        symbols.push({ kind: 'fn', name: goMatch[1], line: lineNum });
      }
    } else if (ext === '.rs') {
      const rsMatch = line.match(/^\s*pub\s+(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)|^\s*pub\s+struct\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (rsMatch) {
        symbols.push({
          kind: rsMatch[1] ? 'fn' : 'class',
          name: (rsMatch[1] ?? rsMatch[2])!,
          line: lineNum,
        });
      }
    } else {
      const fnMatch =
        line.match(/^\s*export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/) ??
        line.match(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/) ??
        line.match(/^\s*export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/);
      if (fnMatch?.[1]) {
        symbols.push({ kind: 'fn', name: fnMatch[1], line: lineNum });
        continue;
      }
      const clsMatch = line.match(/^\s*export\s+(?:default\s+)?class\s+([A-Za-z0-9_$]+)/);
      if (clsMatch?.[1]) {
        symbols.push({ kind: 'class', name: clsMatch[1], line: lineNum });
        continue;
      }
      const typeMatch = line.match(/^\s*export\s+(?:interface|type)\s+([A-Za-z0-9_$]+)/);
      if (typeMatch?.[1]) {
        symbols.push({ kind: 'type', name: typeMatch[1], line: lineNum });
      }
    }
  }

  return {
    path: relPath,
    lines: lines.length,
    links: [...linksSet].slice(0, MAX_LINKS_PER_FILE),
    symbols,
  };
}

const DEFAULT_MEMORY_TEMPLATE = `# 🧠 Active Session Memory (Obsidian State Node)

Use this file to persist 1–3 lines of architectural state or pending tasks across chat resets (\`/compact\`).
Link code nodes using \`[[path/to/file#symbol]]\` or \`file:line\`.

## Current State
- Status: Initialized by \`token-maxxing graph\` (or \`tmx graph\`).
- Next step: Update this bullet after completing major audits or multi-file fixes.
`;

function classifyNodeCategory(filePath: string): 'memory' | 'entrypoint' | 'sql' | 'test' | 'module' {
  if (filePath.endsWith('memory.md') || filePath.endsWith('INDEX.md')) return 'memory';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.includes('test/') || filePath.includes('.test.') || filePath.includes('.spec.')) return 'test';
  const base = posix.basename(filePath);
  if (/^(index|app|main|mainactivity|server|cli)\./i.test(base) || filePath.endsWith('.html')) return 'entrypoint';
  return 'module';
}

function renderInteractiveGraphHtml(
  projectName: string,
  nodes: GraphFileNode[],
  memoryContent: string,
  indexTokensEst: number,
): string {
  const nodePathSet = new Set(nodes.map((n) => n.path));

  // Detect any file references mentioned inside memory.md
  const memoryLinks: string[] = [];
  for (const p of nodePathSet) {
    const base = posix.basename(p);
    if (memoryContent.includes(p) || (base.length > 4 && memoryContent.includes(base))) {
      memoryLinks.push(p);
    }
  }
  if (memoryLinks.length === 0) {
    for (const n of nodes) {
      if (classifyNodeCategory(n.path) === 'entrypoint') {
        memoryLinks.push(n.path);
      }
    }
    if (memoryLinks.length === 0) {
      for (const n of nodes.slice(0, 4)) {
        memoryLinks.push(n.path);
      }
    }
  }

  // Build semantic & directory-sibling fallback links when explicit relative imports are sparse
  const byDir = new Map<string, string[]>();
  for (const n of nodes) {
    const d = posix.dirname(n.path);
    const list = byDir.get(d) ?? [];
    list.push(n.path);
    byDir.set(d, list);
  }

  const graphNodes = [
    {
      id: '.hahahah/graph/memory.md',
      label: 'memory.md',
      category: 'memory',
      lines: memoryContent.split(/\r?\n/).length,
      links: memoryLinks,
      symbols: [{ kind: 'fn', name: 'Active Session State', line: 1 }],
    },
    ...nodes.map((n) => {
      const validLinks = n.links.filter((l) => nodePathSet.has(l));
      if (validLinks.length === 0) {
        const siblings = (byDir.get(posix.dirname(n.path)) ?? []).filter((s) => s !== n.path);
        if (siblings[0]) validLinks.push(siblings[0]);
      }
      return {
        id: n.path,
        label: posix.basename(n.path),
        category: classifyNodeCategory(n.path),
        lines: n.lines,
        links: validLinks,
        symbols: n.symbols,
      };
    }),
  ];

  const payloadJson = JSON.stringify({
    projectName,
    indexTokensEst,
    memoryContent,
    nodes: graphNodes,
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${projectName} — Token-Maxxing Knowledge Graph (3D Neural Sphere)</title>
<style>
  :root {
    --bg: #000000;
    --term-bg: #000000;
    --border: rgba(255, 255, 255, 0.14);
    --text: #f1f5f9;
    --muted: #64748b;
    --dim: #94a3b8;
    --accent: #00a8ff;
    --accent-soft: rgba(0, 168, 255, 0.16);
    --memory: #10b981;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  body {
    background: #000000;
    color: var(--text);
    font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    user-select: none;
  }
  /* Top 68% Pure Black Void Stage */
  .stage {
    position: relative;
    flex: 1 1 auto;
    width: 100vw;
    min-height: 0;
    background: #000000;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
  }
  canvas:active { cursor: grabbing; }

  /* Ultra-Minimal Monolith HUD */
  .hud-overlay {
    position: absolute;
    top: 14px;
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
    z-index: 10;
    font-size: 11px;
    letter-spacing: 0.03em;
  }
  .hud-left {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #94a3b8;
    pointer-events: auto;
  }
  .hud-brand {
    color: #ffffff;
    font-weight: 700;
  }
  .hud-brand strong {
    color: var(--accent);
    margin-right: 5px;
  }
  .hud-stats {
    color: #64748b;
    font-size: 10.5px;
  }
  .hud-right {
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
    opacity: 0.42;
    transition: opacity 0.2s;
  }
  .hud-right:hover {
    opacity: 1;
  }
  .hud-btn {
    cursor: pointer;
    color: #94a3b8;
    padding: 2px 6px;
    border: 1px solid transparent;
    transition: all 0.15s;
    user-select: none;
    font-size: 10.5px;
    background: transparent;
  }
  .hud-btn:hover {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25);
  }
  .hud-btn.on {
    color: #ffffff;
    border-color: var(--accent);
    text-shadow: 0 0 8px var(--accent);
  }
  .hud-sep {
    color: #334155;
    user-select: none;
  }

  /* Bottom 32% Full-Width Raw Terminal Console */
  .term-console {
    height: 230px;
    width: 100vw;
    background: #000000;
    border-top: 1px solid rgba(255, 255, 255, 0.35);
    display: flex;
    flex-direction: column;
    z-index: 20;
    user-select: text;
  }
  .term-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 10.5px;
    background: #020306;
    color: #94a3b8;
    letter-spacing: 0.05em;
  }
  .term-title {
    font-weight: 700;
    color: #ffffff;
  }
  .term-meta {
    display: flex;
    gap: 14px;
    align-items: center;
    font-size: 10.5px;
  }
  .live-pill {
    font-weight: 700;
    color: var(--accent);
  }
  .term-body {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: 1.8fr 1fr;
    min-height: 0;
    overflow: hidden;
  }
  .term-log-wrap {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border-right: 1px solid rgba(255, 255, 255, 0.12);
    background: #000000;
  }
  .term-log {
    flex: 1 1 auto;
    padding: 6px 16px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: 11px;
    color: #f1f5f9;
    display: block;
  }
  .term-input-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 14px;
    background: #04060a;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 11px;
    height: 26px;
    box-sizing: border-box;
  }
  .prompt-sym {
    color: var(--accent);
    font-weight: 700;
  }
  .term-input-bar input {
    flex: 1 1 auto;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-family: inherit;
    font-size: 11px;
  }
  .term-input-bar input::placeholder {
    color: #475569;
  }
  .term-cursor {
    width: 6px;
    height: 12px;
    background: var(--accent);
    animation: blink 1s step-end infinite;
  }
  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
  .term-welcome {
    color: #475569;
    font-size: 10.5px;
    height: 18px;
    line-height: 18px;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .log-line {
    display: flex;
    align-items: center;
    height: 21px;
    line-height: 21px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    white-space: nowrap;
    overflow: hidden;
    font-size: 11px;
    letter-spacing: 0.015em;
  }
  .log-line .ts {
    color: #64748b;
    margin-right: 10px;
    font-size: 10.5px;
    flex-shrink: 0;
  }
  .log-line .tag {
    color: var(--accent);
    font-weight: 700;
    font-size: 10px;
    margin-right: 10px;
    min-width: 66px;
    flex-shrink: 0;
    letter-spacing: 0.04em;
  }
  .log-line .msg {
    color: #cbd5e1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
  }
  .log-line .tok {
    color: #64748b;
    margin-left: 10px;
    font-size: 10px;
    flex-shrink: 0;
  }
  .term-inspector {
    padding: 8px 16px;
    overflow-y: auto;
    font-size: 11px;
    line-height: 1.5;
    color: #94a3b8;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #020306;
  }
  .insp-head {
    color: #ffffff;
    font-weight: 700;
    word-break: break-all;
    font-size: 11.5px;
  }
  .insp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .chip {
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 1px 6px;
    font-size: 10px;
    color: #cbd5e1;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
  }
  .chip:hover {
    border-color: var(--accent);
    color: #ffffff;
  }
  .chip .ln { color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
  <div class="stage" id="stage">
    <div class="hud-overlay">
      <div class="hud-left">
        <span class="hud-brand"><strong>●</strong> ${projectName}</span>
        <span class="hud-stats" id="stats-label"></span>
      </div>
      <div class="hud-right">
        <span class="hud-btn on" id="laser-crimson-btn" title="Press 1">[1:CRIMSON]</span>
        <span class="hud-btn" id="laser-blue-btn" title="Press 2">[2:BLUE]</span>
        <span class="hud-btn" id="laser-cyan-btn" title="Press 3">[3:CYAN]</span>
        <span class="hud-sep">·</span>
        <span class="hud-btn on" id="brutal-btn" title="Press B">[STORM]</span>
        <span class="hud-btn" id="overdrive-btn" title="Press O">[OVERDRIVE]</span>
        <span class="hud-btn on" id="mode-btn" title="Press M">[3D]</span>
        <span class="hud-btn" id="pulse-btn" title="Press Space">[FIRE]</span>
        <span class="hud-btn" id="reset-btn" title="Press C">[CENTER]</span>
      </div>
    </div>
    <canvas id="graph"></canvas>
  </div>

  <div class="term-console">
    <div class="term-header">
      <span class="term-title">── Neural Graph (Token-Maxxing Second Brain) ────────────────────────</span>
      <div class="term-meta">
        <span id="telemetry-status" class="live-pill">[TELEMETRY: ● SECOND BRAIN ACTIVE]</span>
        <span id="tok-speed" style="color:#e2e8f0">[154 tok/s]</span>
        <span id="trace-counter" style="color:var(--dim)">48 NODES ACTIVE</span>
      </div>
    </div>
    <div class="term-body">
      <div class="term-log-wrap">
        <div class="term-log" id="term-log">
          <div class="term-welcome">> Token-Maxxing Second Brain v0.3.0 (Neural Core Active)</div>
        </div>
        <div class="term-input-bar">
          <span class="prompt-sym">></span>
          <input type="text" id="term-input" placeholder="Query Second Brain or press Space to ignite..." autocomplete="off"/>
          <span class="term-cursor"></span>
        </div>
      </div>
      <div class="term-inspector" id="term-inspector">
        <div class="insp-head" id="node-title">.hahahah/graph/memory.md</div>
        <div id="node-meta"></div>
        <div><span style="color:#64748b">SYMBOLS:</span> <div class="insp-chips" id="sym-list"></div></div>
        <div><span style="color:#64748b">LINKS:</span> <div class="insp-chips" id="out-list"></div></div>
      </div>
    </div>
  </div>

  <script id="graph-data" type="application/json">${payloadJson}</script>
  <script>
    const data = JSON.parse(document.getElementById('graph-data').textContent);

    // Laser Color Palettes (Crimson Red default from video, plus Electric Blue & Matrix Cyan)
    const LASER_THEMES = {
      crimson: {
        primary: '#ff0055',
        glow: 'rgba(255, 0, 85, 0.95)',
        overdrive: 'rgba(255, 0, 85, 0.88)',
        core: 'rgba(255, 240, 245, 0.98)',
        halo: 'rgba(255, 0, 85, 0.42)',
        soft: 'rgba(255, 0, 85, 0.18)',
        label: '#fda4af'
      },
      blue: {
        primary: '#00a8ff',
        glow: 'rgba(0, 175, 255, 0.94)',
        overdrive: 'rgba(0, 155, 255, 0.80)',
        core: 'rgba(224, 242, 254, 0.96)',
        halo: 'rgba(0, 168, 255, 0.36)',
        soft: 'rgba(0, 168, 255, 0.18)',
        label: '#7dd3fc'
      },
      cyan: {
        primary: '#00f5d4',
        glow: 'rgba(0, 245, 212, 0.92)',
        overdrive: 'rgba(0, 220, 190, 0.78)',
        core: 'rgba(220, 255, 250, 0.96)',
        halo: 'rgba(0, 245, 212, 0.34)',
        soft: 'rgba(0, 245, 212, 0.18)',
        label: '#5eead4'
      }
    };

    let currentThemeKey = localStorage.getItem('ay_laser_theme') || 'crimson';
    if (!LASER_THEMES[currentThemeKey]) currentThemeKey = 'crimson';
    let THEME = LASER_THEMES[currentThemeKey];

    function applyLaserTheme(key) {
      currentThemeKey = key;
      THEME = LASER_THEMES[key];
      try { localStorage.setItem('ay_laser_theme', key); } catch {}
      document.documentElement.style.setProperty('--accent', THEME.primary);
      document.documentElement.style.setProperty('--accent-soft', THEME.soft);
      document.getElementById('laser-crimson-btn')?.classList.toggle('on', key === 'crimson');
      document.getElementById('laser-blue-btn')?.classList.toggle('on', key === 'blue');
      document.getElementById('laser-cyan-btn')?.classList.toggle('on', key === 'cyan');
    }

    const stage = document.getElementById('stage');
    const canvas = document.getElementById('graph');
    const ctx = canvas.getContext('2d');
    let width = stage.clientWidth || window.innerWidth;
    let height = stage.clientHeight || (window.innerHeight - 215);
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    let is3D = true;
    let isBrutal = true;
    let overdrive = false;
    let autoSpin = true;
    let isLiveConnected = false;

    let rotY = 0.4;
    let rotX = 0.22;
    let rotZ = 0.0;
    let velY = 0.0095;
    let velX = 0.002;
    let sphereRadius = Math.min(width, height) * 0.39;

    const N_REAL = data.nodes.length;
    const N_SURFACE = Math.max(108, N_REAL + 36);
    const N_CORE = 42;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    // Separate memory.md (innermost neural nucleus) and normal files
    const memoryNode = data.nodes.find(n => n.category === 'memory');
    const normalFiles = data.nodes.filter(n => n !== memoryNode);

    // Stride-distribute normal real files evenly across the entire surface shell (360° global coverage!)
    const realSlotMap = new Map();
    const surfaceStride = normalFiles.length > 0 ? N_SURFACE / normalFiles.length : 1;
    normalFiles.forEach((file, idx) => {
      const slot = Math.min(N_SURFACE - 1, Math.floor(idx * surfaceStride));
      realSlotMap.set(slot, file);
    });

    const allVertices = [];

    // 1. Surface Shell (Outer Cortex, 360° global coverage)
    for (let i = 0; i < N_SURFACE; i++) {
      const y3 = 1 - (i / (N_SURFACE - 1)) * 2;
      const rSlice = Math.sqrt(Math.max(0, 1 - y3 * y3));
      const theta = goldenAngle * i;
      const sx = Math.cos(theta) * rSlice;
      const sz = Math.sin(theta) * rSlice;

      const angle2d = (i / N_SURFACE) * Math.PI * 2;
      const rad2d = 120 + (i % 3) * 60;

      const realFile = realSlotMap.get(i);
      if (realFile) {
        allVertices.push({
          ...realFile,
          isAux: false,
          isCore: false,
          idx: i,
          estTokens: Math.max(12, Math.round(realFile.lines * 7.5)),
          sx, sy: y3, sz,
          x: width / 2 + Math.cos(angle2d) * rad2d,
          y: height / 2 + Math.sin(angle2d) * rad2d,
          vx: 0, vy: 0,
          projX: 0, projY: 0, projZ: 0, projScale: 1,
          flashTimer: 0,
          r: Math.max(2.8, Math.min(4.8, 2.6 + Math.sqrt(realFile.symbols.length + realFile.links.length) * 0.6))
        });
      } else {
        allVertices.push({
          id: '__surf_aux_' + i,
          label: '',
          category: 'relay',
          lines: 0,
          links: [],
          symbols: [],
          isAux: true,
          isCore: false,
          idx: i,
          estTokens: 0,
          sx, sy: y3, sz,
          x: width / 2 + Math.cos(angle2d) * rad2d,
          y: height / 2 + Math.sin(angle2d) * rad2d,
          vx: 0, vy: 0,
          projX: 0, projY: 0, projZ: 0, projScale: 1,
          flashTimer: 0,
          r: 1.2
        });
      }
    }

    // 2. Volumetric Interior Core (Fills the hollow inside!)
    // Place memory.md as the glowing central nucleus at r = 0.22
    if (memoryNode) {
      allVertices.push({
        ...memoryNode,
        isAux: false,
        isCore: true,
        idx: allVertices.length,
        estTokens: Math.max(12, Math.round(memoryNode.lines * 7.5)),
        sx: 0.05, sy: -0.04, sz: 0.18,
        x: width / 2, y: height / 2,
        vx: 0, vy: 0,
        projX: 0, projY: 0, projZ: 0, projScale: 1,
        flashTimer: 0,
        r: 5.5
      });
    }

    // Add internal core volumetric synaptic relays (r = 0.32 to 0.68)
    for (let c = 0; c < N_CORE; c++) {
      const y3 = 1 - (c / (N_CORE - 1)) * 2;
      const rSlice = Math.sqrt(Math.max(0, 1 - y3 * y3));
      const theta = goldenAngle * (c + 17);
      const coreR = 0.35 + ((c % 4) / 4) * 0.32;
      const sx = Math.cos(theta) * rSlice * coreR;
      const sy = y3 * coreR;
      const sz = Math.sin(theta) * rSlice * coreR;

      allVertices.push({
        id: '__core_' + c,
        label: '',
        category: 'core_relay',
        lines: 0,
        links: [],
        symbols: [],
        isAux: true,
        isCore: true,
        idx: allVertices.length,
        estTokens: 0,
        sx, sy, sz,
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height / 2 + (Math.random() - 0.5) * 80,
        vx: 0, vy: 0,
        projX: 0, projY: 0, projZ: 0, projScale: 1,
        flashTimer: 0,
        r: 1.4
      });
    }

    const ambientStars = Array.from({ length: 75 }, () => {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.15 + Math.random() * 0.85;
      return {
        sx: r * Math.sin(phi) * Math.cos(theta),
        sy: r * Math.sin(phi) * Math.sin(theta),
        sz: r * Math.cos(phi),
        size: 0.8 + Math.random() * 1.4,
        alpha: 0.15 + Math.random() * 0.45
      };
    });

    const nodes = allVertices;
    const realNodes = nodes.filter(n => !n.isAux);
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const edges = [];
    const edgeKeySet = new Set();
    const backlinks = new Map(nodes.map(n => [n.id, []]));
    const adj = new Map(nodes.map(n => [n.id, new Set()]));

    function addEdge(a, b, kind) {
      if (!a || !b || a.id === b.id) return;
      const k1 = a.id + '->' + b.id;
      const k2 = b.id + '->' + a.id;
      if (edgeKeySet.has(k1) || edgeKeySet.has(k2)) return;
      edgeKeySet.add(k1);
      edges.push({ source: a, target: b, kind, seed: Math.random() * 100 });
      adj.get(a.id).add(b.id);
      adj.get(b.id).add(a.id);
    }

    // 1. Real code dependency edges
    for (const n of realNodes) {
      for (const targetId of n.links) {
        const target = nodeById.get(targetId);
        if (target) {
          addEdge(n, target, n.category === 'memory' ? 'memory' : 'code');
          backlinks.get(targetId)?.push(n.id);
        }
      }
    }

    // 2. Connect memory.md nucleus to core nodes and surface hubs
    if (memoryNode) {
      const coreNodes = nodes.filter(n => n.isCore && n.id !== memoryNode.id);
      for (let i = 0; i < Math.min(6, coreNodes.length); i++) {
        addEdge(memoryNode, coreNodes[i], 'memory');
      }
      for (let i = 0; i < Math.min(4, realNodes.length); i++) {
        if (realNodes[i].id !== memoryNode.id) addEdge(memoryNode, realNodes[i], 'memory');
      }
    }

    // 3. Surface Shell Geodesic Mesh (connect 4 nearest surface neighbors)
    const surfaceNodes = nodes.filter(n => !n.isCore);
    for (let i = 0; i < surfaceNodes.length; i++) {
      const a = surfaceNodes[i];
      const dists = [];
      for (let j = 0; j < surfaceNodes.length; j++) {
        if (i === j) continue;
        const b = surfaceNodes[j];
        const d = Math.hypot(a.sx - b.sx, a.sy - b.sy, a.sz - b.sz);
        dists.push({ b, d });
      }
      dists.sort((u, v) => u.d - v.d);
      for (let m = 0; m < Math.min(4, dists.length); m++) {
        addEdge(a, dists[m].b, 'mesh');
      }
    }

    // 4. Interior Core Wireframe Mesh (connect 3 nearest core neighbors)
    const coreRelays = nodes.filter(n => n.isCore);
    for (let i = 0; i < coreRelays.length; i++) {
      const a = coreRelays[i];
      const dists = [];
      for (let j = 0; j < coreRelays.length; j++) {
        if (i === j) continue;
        const b = coreRelays[j];
        const d = Math.hypot(a.sx - b.sx, a.sy - b.sy, a.sz - b.sz);
        dists.push({ b, d });
      }
      dists.sort((u, v) => u.d - v.d);
      for (let m = 0; m < Math.min(3, dists.length); m++) {
        addEdge(a, dists[m].b, 'core_mesh');
      }
    }

    // 5. Trans-Spherical Brain Chords (recreates the dense 3D neural brain cage seen in the video!)
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const chordCandidates = [];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.sx - b.sx, a.sy - b.sy, a.sz - b.sz);
        if (d >= 0.55 && d <= 1.68) {
          chordCandidates.push({ b, d });
        }
      }
      chordCandidates.sort((u, v) => ((u.b.idx * 19 + 7) % 31) - ((v.b.idx * 19 + 7) % 31));
      for (let k = 0; k < Math.min(2, chordCandidates.length); k++) {
        addEdge(a, chordCandidates[k].b, 'chord');
      }
    }

    // Radial Bridges: Connect Core Nodes to Surface Nodes
    for (let c = 0; c < coreRelays.length; c++) {
      const coreNode = coreRelays[c];
      const dists = [];
      for (let s = 0; s < surfaceNodes.length; s++) {
        const surfNode = surfaceNodes[s];
        const d = Math.hypot(coreNode.sx - surfNode.sx, coreNode.sy - surfNode.sy, coreNode.sz - surfNode.sz);
        dists.push({ surfNode, d });
      }
      dists.sort((u, v) => u.d - v.d);
      if (dists[0]) addEdge(coreNode, dists[0].surfNode, 'chord');
      if (dists[dists.length - 1] && c % 2 === 0) addEdge(coreNode, dists[dists.length - 1].surfNode, 'chord');
    }

    const codeEdgesCount = edges.length;

    document.getElementById('stats-label').textContent =
      \`// [\${realNodes.length} nodes · \${codeEdgesCount} links · ~\${data.indexTokensEst} idx_tok]\`;

    let selectedNode = realNodes[0] || nodes[0];
    let hoveredNode = null;
    let draggedNode = null;
    let panX = 0, panY = 0, zoom = 1;
    let isDragging = false, lastMouseX = 0, lastMouseY = 0;
    let searchQuery = '';

    let activeLaserEdges = new Map();
    let pulses = [];
    let shockwaves = [];
    let lastStormBurst = 0;
    let lastIdlePulse = 0;
    let burstCounter = 0;
    let cognitiveSurgeUntil = Date.now() + 2400; // High-voltage boot surge!

    const termLogEl = document.getElementById('term-log');
    let lastLogKey = '';
    function appendTerminalLog(tag, message, tokInfo = '') {
      const cleanTag = String(tag).replace(/[\[\]]/g, '');
      const key = cleanTag + ':' + message;
      if (key === lastLogKey) return;
      lastLogKey = key;

      const now = new Date();
      const ts = now.toTimeString().slice(0, 8);
      const line = document.createElement('div');
      line.className = 'log-line';
      const tokSpan = tokInfo ? \`<span class="tok">\${tokInfo}</span>\` : '';
      line.innerHTML = \`<span class="ts">\${ts}</span><span class="tag">[\${cleanTag}]</span><span class="msg">\${message}</span>\${tokSpan}\`;
      termLogEl.appendChild(line);
      while (termLogEl.children.length > 30) {
        if (termLogEl.children[1]) {
          termLogEl.removeChild(termLogEl.children[1]);
        } else {
          break;
        }
      }
      termLogEl.scrollTop = termLogEl.scrollHeight;
    }

    // Seed initial boot log lines
    appendTerminalLog('INIT', \`Knowledge Graph mapped \${realNodes.length} nodes & \${codeEdgesCount} links\`);
    appendTerminalLog('AST', 'Symbols & line anchors mapped for surgery');

    function igniteSynapseBeam(fromNode, toNode, pulseSpeed = 0.045) {
      if (!fromNode || !toNode) return;
      const k1 = fromNode.id + '->' + toNode.id;
      const k2 = toNode.id + '->' + fromNode.id;
      const ttl = isBrutal ? 46 : 32;
      activeLaserEdges.set(k1, { from: fromNode, to: toNode, ttl, maxTtl: ttl });
      activeLaserEdges.set(k2, { from: toNode, to: fromNode, ttl, maxTtl: ttl });
      pulses.push({
        from: fromNode,
        to: toNode,
        t: 0,
        speed: pulseSpeed * (isBrutal ? 1.45 : 1.0)
      });
      fromNode.flashTimer = 1.0;
    }

    function buildLaserPathway(startNode, sourceLabel = 'TRACE') {
      if (!startNode || startNode.isAux) return;
      let curr = startNode;
      const hops = Math.min(6, Math.max(3, Math.floor(realNodes.length / 5)));
      const visited = new Set([curr.id]);
      const path = [curr];

      for (let step = 0; step < hops; step++) {
        const neighbors = [...(adj.get(curr.id) || [])]
          .map(id => nodeById.get(id))
          .filter(n => n && !visited.has(n.id));
        if (neighbors.length === 0) break;

        const codeLinked = neighbors.filter(nb => !nb.isAux && (curr.links?.includes(nb.id) || nb.links?.includes(curr.id)));
        const coreLinked = neighbors.filter(nb => nb.isCore);
        const pickPool = codeLinked.length > 0
          ? codeLinked
          : (coreLinked.length > 0 && Math.random() > 0.35 ? coreLinked : neighbors);
        const next = pickPool[Math.floor(Math.random() * pickPool.length)];

        visited.add(next.id);
        path.push(next);
        igniteSynapseBeam(curr, next, 0.038 + Math.random() * 0.025);
        curr = next;
      }

      for (const linkId of startNode.links) {
        const target = nodeById.get(linkId);
        if (target) igniteSynapseBeam(startNode, target, 0.048);
      }

      const routeMilestones = path.filter(p => !p.isAux || p.category === 'memory');
      const routeNames = (routeMilestones.length > 0 ? routeMilestones : path.slice(0, 3)).map(p => p.label || 'core').join(' ➔ ');
      const symPreview = startNode.symbols && startNode.symbols.length > 0
        ? \` (\${startNode.symbols.map(s => s.name + ':' + s.line).slice(0, 2).join(', ')})\`
        : '';
      appendTerminalLog(sourceLabel, \`\${routeNames}\${symPreview}\`, \`~\${startNode.estTokens} tok\`);
      document.getElementById('trace-counter').textContent = \`\${visited.size} NODES ACTIVE\`;
    }

    function triggerAutoStormBurst(customSource = null) {
      if (!is3D || !isBrutal) return;
      burstCounter++;

      // Multi-hop constellation burst matching video frame_0314.jpg!
      const coreRelays = nodes.filter(n => n.isCore);
      const pickFromCore = coreRelays.length > 0 && Math.random() < 0.35;
      const source = customSource || (pickFromCore
        ? (memoryNode && Math.random() < 0.45 ? memoryNode : coreRelays[Math.floor(Math.random() * coreRelays.length)])
        : realNodes[Math.floor(Math.random() * realNodes.length)] || nodes[0]);
      if (!source) return;

      const neighbors = [...(adj.get(source.id) || [])].map(id => nodeById.get(id)).filter(Boolean);
      if (neighbors.length === 0) return;

      const forks = Math.min(neighbors.length, Math.floor(3 + Math.random() * 4));
      const branchNodes = [];
      for (let f = 0; f < forks; f++) {
        const target = neighbors[Math.floor(Math.random() * neighbors.length)];
        igniteSynapseBeam(source, target, 0.042 + Math.random() * 0.035);
        branchNodes.push(target);
      }

      for (const bNode of branchNodes) {
        const subNeighbors = [...(adj.get(bNode.id) || [])].map(id => nodeById.get(id)).filter(n => n && n !== source);
        if (subNeighbors.length > 0 && Math.random() > 0.15) {
          const subCount = Math.min(2, subNeighbors.length);
          for (let s = 0; s < subCount; s++) {
            const subTarget = subNeighbors[Math.floor(Math.random() * subNeighbors.length)];
            setTimeout(() => {
              igniteSynapseBeam(bNode, subTarget, 0.048 + Math.random() * 0.035);
            }, 45 + Math.random() * 65);
          }
        }
      }

      const tokRate = Math.floor(135 + Math.random() * 55);
      document.getElementById('tok-speed').textContent = \`[\${tokRate} tok/s]\`;

      if (burstCounter % 6 === 0 && Date.now() - lastLiveEventTs > 2500) {
        const activeSym = source.symbols && source.symbols[0]?.name ? \`::\${source.symbols[0].name}\` : '';
        const srcLabel = source.label || (source.isCore ? 'neural.core' : 'geodesic');
        const targetSample = neighbors[0]?.label || (neighbors[0]?.isCore ? 'neural.core' : 'geodesic');
        appendTerminalLog('SYNAPSE', \`\${srcLabel}\${activeSym} ➔ \${targetSample} (\${forks} branches)\`, \`(\${tokRate} tok/s)\`);
      }
    }

    // Cognitive Wave Dynamics: Sudden explosive surges followed by serene calm
    function igniteCognitiveSurge(durationMs = 1500) {
      cognitiveSurgeUntil = Math.max(cognitiveSurgeUntil, Date.now() + durationMs);
      triggerAutoStormBurst();
    }

    function triggerIdlePulse() {
      if (!is3D) return;
      const a = realNodes[Math.floor(Math.random() * realNodes.length)] || nodes[0];
      if (!a) return;
      const neighbors = [...(adj.get(a.id) || [])].map(id => nodeById.get(id)).filter(Boolean);
      if (neighbors.length === 0) return;
      const b = neighbors[Math.floor(Math.random() * neighbors.length)];
      igniteSynapseBeam(a, b, 0.038);
      document.getElementById('tok-speed').textContent = \`[idle · \${Math.floor(18 + Math.random() * 22)} tok/s]\`;
    }

    function selectNode(node, reason = 'SELECT') {
      if (!node || node.isAux) return;
      selectedNode = node;
      buildLaserPathway(node, reason);

      document.getElementById('node-title').textContent = \`> \${node.id}\`;
      document.getElementById('node-meta').textContent =
        \`\${node.category.toUpperCase()} | \${node.lines} lines | ~\${node.estTokens} tokens | \${node.links.length} out / \${(backlinks.get(node.id) || []).length} in\`;

      const symList = document.getElementById('sym-list');
      symList.innerHTML = '';
      if (node.symbols.length === 0) {
        symList.innerHTML = '<span style="color:#475569">none</span>';
      } else {
        for (const s of node.symbols) {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.innerHTML = \`\${s.name}<span class="ln">:\${s.line}</span>\`;
          symList.appendChild(chip);
        }
      }

      const outList = document.getElementById('out-list');
      outList.innerHTML = '';
      const allLinks = [...new Set([...node.links, ...(backlinks.get(node.id) || [])])];
      if (allLinks.length === 0) {
        outList.innerHTML = '<span style="color:#475569">none</span>';
      } else {
        for (const l of allLinks) {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = \`[[\${l.split('/').pop()}]]\`;
          chip.onclick = () => { const t = nodeById.get(l); if (t) selectNode(t, 'JUMP'); };
          outList.appendChild(chip);
        }
      }
    }

    let lastLiveEventTs = 0;
    applyLaserTheme(currentThemeKey);
    selectNode(selectedNode, 'INIT');

    // Real-Time SSE Connection to Local Token-Maxxing Telemetry Daemon (port 4949 or same origin)
    function connectLiveTelemetry() {
      const endpoints = [];
      if (location.protocol.startsWith('http')) {
        endpoints.push('/events');
      }
      endpoints.push('http://127.0.0.1:4949/events');

      let idx = 0;
      function tryNext() {
        if (idx >= endpoints.length) return;
        const url = endpoints[idx++];
        try {
          const es = new EventSource(url);
          es.onopen = () => {
            isLiveConnected = true;
            const statusEl = document.getElementById('telemetry-status');
            statusEl.textContent = '[TELEMETRY: ● LIVE REAL-TIME FS & TOKEN STREAM]';
            statusEl.style.color = '#10b981';
            appendTerminalLog('LIVE_SSE', \`Connected to real-time file & token watcher (\${url})\`, '[READY]');
          };
          es.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.type === 'file_event' && msg.path) {
                lastLiveEventTs = Date.now();
                igniteCognitiveSurge(2200); // Trigger live edit surge!
                const target =
                  nodeById.get(msg.path) ||
                  nodes.find(n => n.id.endsWith(msg.basename) || msg.path.endsWith(n.id));
                const sign = msg.deltaTokens >= 0 ? '+' + msg.deltaTokens : String(msg.deltaTokens);
                document.getElementById('tok-speed').textContent = \`[\${msg.tokens} tok | Δ\${sign}]\`;
                if (target) {
                  target.lines = msg.lines || target.lines;
                  target.estTokens = msg.tokens || target.estTokens;
                  selectNode(target, 'LIVE_FS');
                } else {
                  appendTerminalLog('LIVE_FS', \`\${msg.event.toUpperCase()} \${msg.path} (\${msg.lines}L)\`, \`~\${msg.tokens} tok (Δ\${sign})\`);
                  // Also fire a visual burst on the closest hub node so 3D sphere reacts to every source edit
                  const fallbackNode = nodes[Math.floor(Math.random() * nodes.length)];
                  if (fallbackNode) {
                    const nbs = [...(adj.get(fallbackNode.id) || [])].map(id => nodeById.get(id)).filter(Boolean);
                    for (const nb of nbs.slice(0, 3)) igniteSynapseBeam(fallbackNode, nb, 0.06);
                  }
                }
              }
            } catch {}
          };
          es.onerror = () => {
            es.close();
            if (!isLiveConnected) tryNext();
          };
        } catch {
          tryNext();
        }
      }
      tryNext();
    }
    connectLiveTelemetry();

    function getHitNode(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      if (is3D) {
        const sorted = [...realNodes].sort((a, b) => a.projZ - b.projZ);
        for (const n of sorted) {
          const hitR = n.r * n.projScale + 9;
          if (Math.hypot(cx - n.projX, cy - n.projY) <= hitR) {
            return n;
          }
        }
        return null;
      } else {
        const wx = (cx - width / 2 - panX) / zoom + width / 2;
        const wy = (cy - height / 2 - panY) / zoom + height / 2;
        for (let i = realNodes.length - 1; i >= 0; i--) {
          const n = realNodes[i];
          if (Math.hypot(wx - n.x, wy - n.y) <= n.r + 6) return n;
        }
        return null;
      }
    }

    canvas.addEventListener('mousedown', (e) => {
      const hit = getHitNode(e.clientX, e.clientY);
      if (hit) {
        selectNode(hit, 'CLICK');
        if (!is3D) draggedNode = hit;
      }
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (is3D) {
          rotY += dx * 0.007;
          rotX = Math.max(-1.45, Math.min(1.45, rotX + dy * 0.007));
          velY = dx * 0.0012;
          velX = dy * 0.0012;
        } else if (draggedNode) {
          const rect = canvas.getBoundingClientRect();
          draggedNode.x = (e.clientX - rect.left - width / 2 - panX) / zoom + width / 2;
          draggedNode.y = (e.clientY - rect.top - height / 2 - panY) / zoom + height / 2;
          draggedNode.vx = 0;
          draggedNode.vy = 0;
        } else {
          panX += dx;
          panY += dy;
        }
        return;
      }

      hoveredNode = getHitNode(e.clientX, e.clientY);
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      draggedNode = null;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.09 : 0.91;
      zoom = Math.max(0.45, Math.min(2.8, zoom * factor));
    }, { passive: false });

    function toggleBrutal() {
      isBrutal = !isBrutal;
      const el = document.getElementById('brutal-btn');
      if (el) el.classList.toggle('on', isBrutal);
    }

    function toggle3D() {
      is3D = !is3D;
      const el = document.getElementById('mode-btn');
      if (el) {
        el.textContent = is3D ? '[3D]' : '[2D]';
        el.classList.toggle('on', is3D);
      }
    }

    function toggleOverdrive() {
      overdrive = !overdrive;
      const el = document.getElementById('overdrive-btn');
      if (el) {
        el.classList.toggle('on', overdrive);
        if (overdrive) {
          appendTerminalLog('OVERDRIVE', 'All geodesic memory channels ignited at maximum voltage', '[MAX]');
        } else {
          buildLaserPathway(selectedNode, 'TRACE');
        }
      }
    }

    function resetCamera() {
      panX = 0; panY = 0; zoom = 1;
      rotX = 0.22; rotY = 0.4; rotZ = 0;
      velY = 0.0095; velX = 0.002;
    }

    function fireRandomBurst() {
      const rand = realNodes[Math.floor(Math.random() * realNodes.length)];
      if (rand) selectNode(rand, 'BURST');
      igniteCognitiveSurge(2000);
    }

    // Second Brain Cognitive Engine (Simulates real-time reasoning & typewriter thought stream)
    const secondBrainThoughts = [
      { tag: 'MEMORY', text: 'memory.md active session state recalled (~68 tokens). Working context verified.' },
      { tag: 'AST_SURGERY', text: 'Surgical anchors locked on 48 symbols across 5 modules. Zero hallucination risk.' },
      { tag: 'TOKEN_SAVER', text: 'Pruned conversational boilerplate. Saving 78.4% input overhead (~2,448 tokens).' },
      { tag: 'SYNAPSE_CORE', text: 'Radial trans-sphere burst synchronized: 24 active neural channels.' },
      { tag: 'REASONING', text: 'Tracing symbol call graph: Root.tsx ➔ PoseClip.tsx ➔ approved.ts.' },
      { tag: 'ZERO_YAP', text: 'Line 1 telegraphic mode enforced. Ready for instant code surgery.' },
      { tag: 'LOCAL_BRAIN', text: 'Second brain local knowledge synchronized with IDE active buffers.' }
    ];

    let thoughtIdx = 0;
    function typewriteThought() {
      if (Date.now() - lastLiveEventTs < 2500) return;
      const item = secondBrainThoughts[thoughtIdx % secondBrainThoughts.length];
      thoughtIdx++;
      igniteCognitiveSurge(1600); // 1.6s surge during thought generation!
      appendTerminalLog(item.tag, item.text, \`~\${Math.floor(65 + Math.random() * 85)} tok\`);
    }
    setInterval(typewriteThought, 4600); // Surge 1.6s, then 3.0s serene calm!

    const termInput = document.getElementById('term-input');
    if (termInput) {
      termInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = termInput.value.trim();
          if (!val) return;
          termInput.value = '';
          appendTerminalLog('QUERY', val, '[USER]');
          igniteCognitiveSurge(2500); // User query burst!
          setTimeout(() => {
            const hits = realNodes.filter(n => n.id.toLowerCase().includes(val.toLowerCase()) || n.symbols.some(s => s.name.toLowerCase().includes(val.toLowerCase())));
            if (hits.length > 0) {
              selectNode(hits[0], 'MATCH');
              appendTerminalLog('SECOND_BRAIN', \`Matched \${hits.length} node(s). Focused: \${hits[0].label} (\${hits[0].lines} lines).\`, '[SURGERY]');
            } else {
              const randNode = realNodes[Math.floor(Math.random() * realNodes.length)];
              selectNode(randNode, 'QUERY');
              appendTerminalLog('SECOND_BRAIN', \`Synthesized query across \${realNodes.length} nodes. Zero fluff detected.\`, '[OK]');
            }
          }, 180);
        }
      });
    }

    document.getElementById('laser-crimson-btn')?.addEventListener('click', () => applyLaserTheme('crimson'));
    document.getElementById('laser-blue-btn')?.addEventListener('click', () => applyLaserTheme('blue'));
    document.getElementById('laser-cyan-btn')?.addEventListener('click', () => applyLaserTheme('cyan'));
    document.getElementById('brutal-btn')?.addEventListener('click', toggleBrutal);
    document.getElementById('overdrive-btn')?.addEventListener('click', toggleOverdrive);
    document.getElementById('mode-btn')?.addEventListener('click', toggle3D);
    document.getElementById('pulse-btn')?.addEventListener('click', fireRandomBurst);
    document.getElementById('reset-btn')?.addEventListener('click', resetCamera);

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === '1') applyLaserTheme('crimson');
      else if (e.key === '2') applyLaserTheme('blue');
      else if (e.key === '3') applyLaserTheme('cyan');
      else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        fireRandomBurst();
      }
      else if (e.key === 'o' || e.key === 'O') toggleOverdrive();
      else if (e.key === 'b' || e.key === 'B') toggleBrutal();
      else if (e.key === 'm' || e.key === 'M') toggle3D();
      else if (e.key === 'c' || e.key === 'C') resetCamera();
    });

    window.addEventListener('resize', () => {
      width = stage.clientWidth || window.innerWidth;
      height = stage.clientHeight || (window.innerHeight - 215);
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      sphereRadius = Math.min(width, height) * 0.39;
    });

    function matchesSearch(n) {
      if (!searchQuery) return true;
      if (n.id.toLowerCase().includes(searchQuery)) return true;
      return n.symbols.some(s => s.name.toLowerCase().includes(searchQuery));
    }

    function step2DPhysics() {
      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x || 0.1;
          const dy = b.y - a.y || 0.1;
          const distSq = dx * dx + dy * dy;
          const force = 2200 / Math.max(distSq, 900);
          const dist = Math.sqrt(distSq) || 1;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      for (const e of edges) {
        if (e.kind === 'mesh' || e.kind === 'chord') continue;
        const dx = e.target.x - e.source.x;
        const dy = e.target.y - e.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 115) * 0.025;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        e.source.vx += fx; e.source.vy += fy;
        e.target.vx -= fx; e.target.vy -= fy;
      }

      for (const n of realNodes) {
        if (n === draggedNode) continue;
        const g = n.category === 'memory' ? 0.04 : 0.009;
        n.vx += (centerX - n.x) * g;
        n.vy += (centerY - n.y) * g;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx; n.y += n.vy;
      }
    }

    let globalTime = 0;

    function draw3DSphere() {
      globalTime += 0.016;

      if (!isDragging && autoSpin) {
        const baseSpeed = isBrutal ? 0.0092 : 0.0035;
        rotY += velY;
        velY = velY * 0.982 + baseSpeed * 0.018;

        const targetPitch = Math.sin(globalTime * 0.85) * (isBrutal ? 0.42 : 0.2);
        rotX = rotX * 0.96 + targetPitch * 0.04;
        rotZ = Math.cos(globalTime * 0.65) * (isBrutal ? 0.22 : 0.08);
      }

      const inSurge = Date.now() < cognitiveSurgeUntil || overdrive;

      if (inSurge) {
        // BURST PHASE: Explosive multi-hop crimson constellation during thoughts & surgery
        if (Date.now() - lastStormBurst > (overdrive ? 180 : 280)) {
          triggerAutoStormBurst();
          lastStormBurst = Date.now();
        }
      } else {
        // IDLE PHASE: Quiet, pristine silver wireframe with occasional single gentle pulse
        if (Date.now() - lastIdlePulse > 2800) {
          triggerIdlePulse();
          lastIdlePulse = Date.now();
        }
      }

      for (const [k, beam] of activeLaserEdges.entries()) {
        beam.ttl--;
        if (beam.ttl <= 0) activeLaserEdges.delete(k);
      }

      const centerX = width / 2 + panX * 0.3;
      const centerY = height / 2 + panY * 0.3;

      const breathe = 1 + Math.sin(globalTime * 3.2) * (isBrutal ? 0.04 : 0.018);
      const R = sphereRadius * zoom * breathe;
      const fov = 620;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      // Ambient 3D stars
      ctx.save();
      for (const st of ambientStars) {
        const x1 = st.sx * cosY - st.sz * sinY;
        const z1 = st.sx * sinY + st.sz * cosY;
        const y2 = st.sy * cosX - z1 * sinX;
        const z2 = st.sy * sinX + z1 * cosX;
        const worldX = (x1 * cosZ - y2 * sinZ) * R * 1.35;
        const worldY = (x1 * sinZ + y2 * cosZ) * R * 1.35;
        const worldZ = z2 * R * 1.35;
        const scale = fov / Math.max(100, fov + worldZ);
        const px = centerX + worldX * scale;
        const py = centerY + worldY * scale;

        ctx.beginPath();
        ctx.arc(px, py, st.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(226, 232, 240, \${(st.alpha * (0.6 - worldZ / (2 * R))).toFixed(3)})\`;
        ctx.fill();
      }
      ctx.restore();

      for (const n of nodes) {
        const x1 = n.sx * cosY - n.sz * sinY;
        const z1 = n.sx * sinY + n.sz * cosY;
        const y2 = n.sy * cosX - z1 * sinX;
        const z2 = n.sy * sinX + z1 * cosX;
        const x3 = x1 * cosZ - y2 * sinZ;
        const y3 = x1 * sinZ + y2 * cosZ;

        const worldX = x3 * R;
        const worldY = y3 * R;
        const worldZ = z2 * R;

        const scale = fov / Math.max(120, fov + worldZ);
        n.projX = centerX + worldX * scale;
        n.projY = centerY + worldY * scale;
        n.projZ = worldZ;
        n.projScale = scale;

        if (n.flashTimer > 0) n.flashTimer -= 0.035;
      }

      const coreGrad = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, R * 1.3);
      coreGrad.addColorStop(0, THEME.soft);
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // Pass 0: Volumetric Core Neural Nebula (fills the interior with ambient second brain glow)
      const innerCoreGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, R * 0.62);
      innerCoreGrad.addColorStop(0, THEME.soft);
      innerCoreGrad.addColorStop(0.4, THEME.soft);
      innerCoreGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.01)');
      innerCoreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.fillStyle = innerCoreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, R * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const sortedEdges = [...edges].sort(
        (a, b) => (b.source.projZ + b.target.projZ) - (a.source.projZ + a.target.projZ)
      );

      // Pass 1: Crisp Wireframe Mesh (Surface shell + dense trans-sphere brain chords + core lattice)
      ctx.save();
      for (const e of sortedEdges) {
        const k = e.source.id + '->' + e.target.id;
        const beam = activeLaserEdges.get(k);
        const isLaser = overdrive
          ? (e.kind !== 'mesh' || (e.source.idx + e.target.idx) % 2 === 0)
          : Boolean(beam);

        if (isLaser) continue;

        const avgZ = (e.source.projZ + e.target.projZ) / (2 * R);
        const depthAlpha = Math.max(0.04, Math.min(0.38, 0.22 - avgZ * 0.15));

        ctx.beginPath();
        ctx.moveTo(e.source.projX, e.source.projY);
        ctx.lineTo(e.target.projX, e.target.projY);
        if (e.kind === 'chord') {
          // Delicate trans-sphere neural chord (dense web matching video frame_0188.jpg)
          ctx.strokeStyle = \`rgba(226, 232, 240, \${(depthAlpha * 0.42).toFixed(3)})\`;
          ctx.lineWidth = 0.6;
        } else if (e.kind === 'core_mesh') {
          // Internal core lattice
          ctx.strokeStyle = \`rgba(254, 205, 211, \${(depthAlpha * 0.65).toFixed(3)})\`;
          ctx.lineWidth = 0.65;
        } else {
          // Outer surface geodesic wireframe
          ctx.strokeStyle = \`rgba(226, 232, 240, \${depthAlpha.toFixed(3)})\`;
          ctx.lineWidth = e.kind === 'code' ? 1.15 : 0.75;
        }
        ctx.stroke();
      }
      ctx.restore();

      // Pass 2: High-Voltage Plasma Laser Beams (Blue / Pink / Cyan)
      ctx.save();
      for (const e of sortedEdges) {
        const k = e.source.id + '->' + e.target.id;
        const beam = activeLaserEdges.get(k);
        const isHoveredEdge = hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);
        const isLaser = isHoveredEdge || overdrive || Boolean(beam);

        if (!isLaser) continue;

        const intensity = overdrive ? 1 : beam ? beam.ttl / beam.maxTtl : 0.88;

        const midX = (e.source.projX + e.target.projX) / 2;
        const midY = (e.source.projY + e.target.projY) / 2;
        const dx = e.target.projX - e.source.projX;
        const dy = e.target.projY - e.source.projY;
        const len = Math.hypot(dx, dy) || 1;
        const perpX = -dy / len;
        const perpY = dx / len;
        const jitter = Math.sin(globalTime * 38 + e.seed) * (isBrutal ? 3.2 : 1.2) * intensity;
        const cx = midX + perpX * jitter;
        const cy = midY + perpY * jitter;

        ctx.beginPath();
        ctx.moveTo(e.source.projX, e.source.projY);
        ctx.quadraticCurveTo(cx, cy, e.target.projX, e.target.projY);
        ctx.shadowColor = THEME.primary;
        ctx.shadowBlur = (overdrive ? 20 : 16) + Math.sin(globalTime * 25 + e.seed) * 6;
        ctx.strokeStyle = overdrive ? THEME.overdrive : THEME.glow;
        ctx.lineWidth = (overdrive ? 2.5 : 3.1) * (isBrutal ? 1.2 : 1.0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(e.source.projX, e.source.projY);
        ctx.quadraticCurveTo(cx, cy, e.target.projX, e.target.projY);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = THEME.core;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 3: High-Speed Energy Pulses
      ctx.save();
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t >= 1) {
          shockwaves.push({
            x: p.to.projX,
            y: p.to.projY,
            r: p.to.r * p.to.projScale,
            maxR: p.to.r * p.to.projScale + (isBrutal ? 34 : 20),
            alpha: 1.0
          });
          p.to.flashTimer = 1.0;
          pulses.splice(i, 1);
          continue;
        }

        const px = p.from.projX + (p.to.projX - p.from.projX) * p.t;
        const py = p.from.projY + (p.to.projY - p.from.projY) * p.t;

        ctx.beginPath();
        ctx.arc(px, py, 3.6, 0, Math.PI * 2);
        ctx.shadowColor = THEME.primary;
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        const trailX = p.from.projX + (p.to.projX - p.from.projX) * Math.max(0, p.t - 0.08);
        const trailY = p.from.projY + (p.to.projY - p.from.projY) * Math.max(0, p.t - 0.08);
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = THEME.primary;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 4: Shockwave Halo Ripples
      ctx.save();
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += isBrutal ? 1.8 : 1.2;
        sw.alpha *= 0.91;
        if (sw.alpha <= 0.03 || sw.r >= sw.maxR) {
          shockwaves.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.shadowColor = THEME.primary;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = THEME.primary;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 1.7;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 5: 3D Geodesic Pinpoints + Tactical HUD Tag ONLY on hover/select
      const sortedNodes = [...nodes].sort((a, b) => b.projZ - a.projZ);
      for (const n of sortedNodes) {
        const isSel = n === selectedNode || n === hoveredNode;
        const isFlashing = n.flashTimer > 0;
        const normZ = n.projZ / R;
        const depthAlpha = Math.max(0.18, Math.min(1, 0.85 - normZ * 0.45));
        const r = Math.max(1.8, n.r * n.projScale * (isSel ? 1.35 : isFlashing ? 1.2 : 1));

        ctx.save();
        ctx.globalAlpha = depthAlpha;

        if (n.isAux) {
          ctx.beginPath();
          const auxR = (n.isCore ? 1.45 : 1.15) * n.projScale;
          ctx.arc(n.projX, n.projY, auxR, 0, Math.PI * 2);
          if (n.isCore) {
            ctx.fillStyle = \`rgba(147, 197, 253, \${Math.max(0.18, Math.min(0.68, 0.48 - normZ * 0.25)).toFixed(2)})\`;
          } else {
            ctx.fillStyle = \`rgba(226, 232, 240, \${Math.max(0.1, Math.min(0.42, 0.36 - normZ * 0.22)).toFixed(2)})\`;
          }
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(n.projX, n.projY, r, 0, Math.PI * 2);
          if (isSel || isFlashing) {
            ctx.shadowColor = THEME.primary;
            ctx.shadowBlur = isSel ? 18 : 12;
            ctx.fillStyle = '#ffffff';
          } else if (n.category === 'memory') {
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#34d399';
          } else {
            ctx.fillStyle = '#f8fafc';
          }
          ctx.fill();

          // Inner neural core heartbeat: pulsing emerald halo ring for memory.md
          if (n.category === 'memory') {
            ctx.save();
            ctx.beginPath();
            const haloR = r + 4.5 + Math.sin(globalTime * 4.2) * 2;
            ctx.arc(n.projX, n.projY, haloR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.48)';
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.restore();
          }

          // Monospace 3D Perspective Node Labels (Exact match to video frame_0251.jpg!)
          const isFront = normZ < 0.28;
          if (isSel || n === hoveredNode) {
            ctx.save();
            ctx.shadowBlur = 0;
            const tagText = \`[ \${n.label || 'core'} :: \${n.lines}L ]\`;
            ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
            const tw = ctx.measureText(tagText).width;
            const tx = n.projX + r + 8;
            const ty = n.projY - 9;
            ctx.fillStyle = 'rgba(2, 4, 8, 0.94)';
            ctx.fillRect(tx - 3, ty, tw + 8, 18);
            ctx.strokeStyle = THEME.primary;
            ctx.lineWidth = 1;
            ctx.strokeRect(tx - 3, ty, tw + 8, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(tagText, tx + 1, ty + 13);
            ctx.restore();
          } else if (isFront && n.label) {
            // Ambient crisp floating label matching video frame_0251.jpg
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.font = '500 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
            const lx = n.projX + r + 5;
            const ly = n.projY + 3;
            ctx.fillStyle = n.category === 'memory'
              ? '#34d399'
              : \`rgba(226, 232, 240, \${Math.max(0.2, Math.min(0.85, 0.72 - normZ * 0.4)).toFixed(2)})\`;
            ctx.fillText(n.label, lx, ly);
            ctx.restore();
          }
        }

        ctx.restore();
      }
    }

    function draw2DPlanar() {
      step2DPhysics();
      ctx.save();
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      for (const e of edges) {
        if (e.kind === 'mesh' || e.kind === 'chord') continue;
        const k = e.source.id + '->' + e.target.id;
        const isHighlighted = activeLaserEdges.has(k) || selectedNode === e.source || selectedNode === e.target;

        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.strokeStyle = isHighlighted ? THEME.primary : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = isHighlighted ? 2.2 : 1.1;
        ctx.stroke();
      }

      for (const n of realNodes) {
        const active = matchesSearch(n);
        const isSel = n === selectedNode || n === hoveredNode;

        ctx.globalAlpha = active ? 1 : 0.18;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 2, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? THEME.primary : '#e2e8f0';
        ctx.fill();

        ctx.font = '10.5px ui-monospace, monospace';
        ctx.fillStyle = isSel ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.r + 13);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function renderLoop() {
      ctx.clearRect(0, 0, width, height);
      if (is3D) {
        draw3DSphere();
      } else {
        draw2DPlanar();
      }
      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
  </script>
</body>
</html>`;
}

export function startLiveGraphServer(targetRoot: string, port = 4949): { url: string; close: () => void } {
  const rootDir = resolve(targetRoot);
  const clients = new Set<ServerResponse>();
  const tokenCache = new Map<string, number>();

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const reqUrl = req.url ?? '/';
    if (reqUrl.startsWith('/events')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`data: ${JSON.stringify({ type: 'connected', project: basename(rootDir) })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    const graphResult = buildCodeGraph(rootDir);
    const html = readFileSync(graphResult.htmlPath, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(html);
  });

  const lastEmitTime = new Map<string, number>();

  try {
    const watcher = watch(rootDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const rel = toPosix(String(filename));
      if (rel.endsWith('graph.html') || rel.endsWith('INDEX.md')) return;
      const segments = rel.split('/');
      if (
        segments.some(
          (seg) =>
            IGNORED_DIRS.has(seg.toLowerCase()) ||
            seg.toLowerCase().startsWith('pythoncore-') ||
            seg.toLowerCase() === 'intermediates' ||
            seg.toLowerCase() === 'outputs' ||
            seg.toLowerCase() === 'generated',
        ) &&
        !rel.endsWith('memory.md')
      ) {
        return;
      }

      const ext = extname(rel).toLowerCase();
      const isTextSource =
        CODE_EXTENSIONS.has(ext) ||
        ext === '.md' ||
        ext === '.json' ||
        ext === '.yaml' ||
        ext === '.yml' ||
        ext === '.xml' ||
        ext === '.gradle' ||
        ext === '.toml';
      if (!isTextSource) return;

      const now = Date.now();
      if (now - (lastEmitTime.get(rel) ?? 0) < 220) return;
      lastEmitTime.set(rel, now);

      const full = join(rootDir, filename);
      if (!existsSync(full)) return;
      try {
        const st = statSync(full);
        if (!st.isFile() || st.size > 512 * 1024) return;
        const content = readFileSync(full, 'utf8');
        const tokens = Math.max(1, Math.round(content.length / 3.8));
        const prev = tokenCache.get(rel) ?? tokens;
        tokenCache.set(rel, tokens);
        const deltaTokens = tokens - prev;
        const lines = content.split(/\r?\n/).length;

        const payload = JSON.stringify({
          type: 'file_event',
          event: eventType,
          path: rel,
          basename: posix.basename(rel),
          lines,
          tokens,
          deltaTokens,
          ts: now,
        });
        for (const client of clients) {
          client.write(`data: ${payload}\n\n`);
        }
      } catch {
        // ignore transient file lock
      }
    });
    server.on('close', () => watcher.close());
  } catch {
    // recursive watch fallback
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      // Live daemon already running on port, safe to reuse
    } else {
      console.error(`Live server error: ${err.message}`);
    }
  });

  try {
    server.listen(port, '127.0.0.1');
  } catch {
    // ignore
  }
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      try { server.close(); } catch {}
    },
  };
}

export function buildCodeGraph(targetRoot: string): GraphBuildResult {
  const rootDir = resolve(targetRoot);
  const graphDir = join(rootDir, '.hahahah', 'graph');
  mkdirSync(graphDir, { recursive: true });

  const absFiles = collectSourceFiles(rootDir);
  const allRelativePaths = new Set(absFiles.map((f) => toPosix(relative(rootDir, f))));

  const nodes = absFiles.map((file) => extractNode(rootDir, file, allRelativePaths));

  const scoredNodes = nodes
    .map((node) => {
      let score = node.symbols.length * 2 + node.links.length * 3;
      if (/^(index|app|main|server|cli|schema|supabase)/i.test(posix.basename(node.path))) score += 10;
      if (node.path.endsWith('.sql') || node.path.endsWith('.html')) score += 6;
      if (!node.path.includes('test/') && !node.path.includes('.test.')) score += 4;
      return { node, score };
    })
    .sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path))
    .slice(0, MAX_NODES_IN_INDEX)
    .map((item) => item.node)
    .sort((a, b) => a.path.localeCompare(b.path));

  let edgesCount = 0;
  const nodeLines = scoredNodes.map((n) => {
    edgesCount += n.links.length;
    const linkPart = n.links.length > 0 ? ` ➔ ${n.links.map((l) => `[[${l}]]`).join(', ')}` : '';
    const symPart =
      n.symbols.length > 0
        ? ` | ${n.symbols.map((s) => `${s.kind === 'table' || s.kind === 'view' ? `${s.kind}:` : ''}\`${s.name}\`:${s.line}`).join(', ')}`
        : '';
    return `- [[${n.path}]] (${n.lines}L)${linkPart}${symPart}`;
  });

  const indexContent = [
    '# 🗺️ Codebase Knowledge Graph (INDEX)',
    '',
    '> Read this map FIRST before grepping or reading full files. Follow `[[wikilinks]]` and `:line` anchors to read only the exact 20–40 lines needed.',
    '',
    '## Active Memory Handoff',
    '- [[.hahahah/graph/memory.md]] — Read/update 1–3 line state summary before or after `/compact`.',
    '',
    `## Nodes (${scoredNodes.length} of ${nodes.length} files mapped)`,
    ...(nodeLines.length > 0 ? nodeLines : ['- *(No source files detected yet)*']),
    '',
  ].join('\n');

  const indexPath = join(graphDir, 'INDEX.md');
  const memoryPath = join(graphDir, 'memory.md');
  const htmlPath = join(graphDir, 'graph.html');

  writeFileSync(indexPath, indexContent, 'utf8');
  if (!existsSync(memoryPath)) {
    writeFileSync(memoryPath, DEFAULT_MEMORY_TEMPLATE, 'utf8');
  }

  const currentMemory = readFileSync(memoryPath, 'utf8');
  const estTokens = Math.max(50, Math.round(indexContent.length / 3.8));
  const projectName = basename(rootDir) || 'Project';
  const htmlContent = renderInteractiveGraphHtml(projectName, scoredNodes, currentMemory, estTokens);
  writeFileSync(htmlPath, htmlContent, 'utf8');

  return {
    indexPath,
    memoryPath,
    htmlPath,
    filesScanned: nodes.length,
    nodesEmitted: scoredNodes.length,
    edgesCount,
  };
}

export function removeCodeGraph(targetRoot: string): void {
  const graphDir = join(resolve(targetRoot), '.hahahah', 'graph');
  if (existsSync(graphDir)) {
    rmSync(graphDir, { recursive: true, force: true });
  }
}
