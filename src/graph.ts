import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
      if (IGNORED_DIRS.has(entry.name) || isBundledRuntimeDir(entry.name)) continue;
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
- Status: Initialized by \`anti-yapping graph\`.
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
<title>${projectName} — Anti-Yapping Knowledge Graph (3D Neural Sphere)</title>
<style>
  :root {
    --bg: #040508;
    --panel: rgba(11, 13, 20, 0.86);
    --border: rgba(255, 255, 255, 0.11);
    --text: #f1f5f9;
    --muted: #94a3b8;
    --neon-pink: #ff176b;
    --neon-hot: #ff5599;
    --memory: #10b981;
    --entry: #f97316;
    --sql: #06b6d4;
    --test: #a855f7;
    --module: #818cf8;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: radial-gradient(circle at 42% 50%, #0d101d 0%, #030407 75%);
    color: var(--text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
    user-select: none;
  }
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
    cursor: grab;
  }
  canvas:active { cursor: grabbing; }
  .hud-top {
    position: fixed;
    top: 16px;
    left: 16px;
    right: 356px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    pointer-events: none;
    z-index: 10;
  }
  .badge-card {
    pointer-events: auto;
    background: var(--panel);
    backdrop-filter: blur(14px);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.65);
    font-size: 12px;
  }
  .brand-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--neon-pink);
    box-shadow: 0 0 14px var(--neon-pink), 0 0 24px var(--neon-pink);
    animation: pulseDot 1.8s infinite alternate;
  }
  @keyframes pulseDot {
    0% { transform: scale(0.9); opacity: 0.75; }
    100% { transform: scale(1.25); opacity: 1; }
  }
  .search-input {
    pointer-events: auto;
    background: var(--panel);
    backdrop-filter: blur(14px);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 10px;
    padding: 8px 13px;
    font-size: 12px;
    font-family: inherit;
    width: 220px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-input:focus {
    border-color: var(--neon-pink);
    box-shadow: 0 0 16px rgba(255, 23, 107, 0.28);
  }
  .btn {
    pointer-events: auto;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 11px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: all 0.16s;
  }
  .btn:hover {
    background: rgba(255,255,255,0.13);
    border-color: rgba(255,255,255,0.28);
  }
  .btn.active-mode {
    background: rgba(255, 23, 107, 0.2);
    border-color: var(--neon-pink);
    color: #fff;
    box-shadow: 0 0 18px rgba(255, 23, 107, 0.35);
  }
  .terminal-bar {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 356px;
    background: rgba(7, 9, 14, 0.9);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 23, 107, 0.28);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11px;
    color: #cbd5e1;
    box-shadow: 0 10px 35px rgba(0,0,0,0.7);
    z-index: 10;
  }
  .term-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--neon-hot);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding-bottom: 4px;
  }
  .term-stream {
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar {
    position: fixed;
    top: 16px;
    right: 16px;
    bottom: 16px;
    width: 328px;
    background: var(--panel);
    backdrop-filter: blur(18px);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    box-shadow: 0 12px 44px rgba(0,0,0,0.75);
    z-index: 10;
    user-select: text;
  }
  .sidebar h2 {
    font-size: 14px;
    font-weight: 700;
    word-break: break-all;
    line-height: 1.35;
    color: #ffffff;
  }
  .cat-pill {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 3px 8px;
    border-radius: 999px;
    width: fit-content;
  }
  .sec-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .pill-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .item-row {
    background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 7px;
    padding: 6px 9px;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .item-row:hover {
    background: rgba(255, 23, 107, 0.15);
    border-color: rgba(255, 23, 107, 0.45);
  }
  .line-tag {
    color: var(--neon-hot);
    font-size: 11px;
    font-weight: 700;
  }
  .memory-box {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    padding: 10px;
    font-size: 11px;
    white-space: pre-wrap;
    color: #d1fae5;
    line-height: 1.45;
  }
</style>
</head>
<body>
  <div class="hud-top">
    <div class="badge-card">
      <span class="brand-dot"></span>
      <strong>${projectName}</strong>
      <span style="color:var(--muted)" id="stats-label"></span>
    </div>
    <input type="text" id="search" class="search-input" placeholder="Search node / symbol..." />
    <button class="btn active-mode" id="brutal-btn">⚡ Brutal Storm: ON</button>
    <button class="btn active-mode" id="mode-btn">🌐 3D Neural Sphere</button>
    <button class="btn" id="overdrive-btn">🔥 Overdrive: OFF</button>
    <button class="btn" id="pulse-btn">🎯 Fire Burst</button>
    <button class="btn" id="reset-btn">Center</button>
  </div>

  <div class="terminal-bar">
    <div class="term-head">
      <span>Neural Graph (Anti-Yapping Engine v0.2.4)</span>
      <span id="trace-counter">ACTIVE SYNAPSE TRACE</span>
    </div>
    <div class="term-stream" id="term-stream">Initializing 3D geodesic memory sphere...</div>
  </div>

  <aside class="sidebar" id="sidebar">
    <span class="cat-pill" id="node-cat">MEMORY HUB</span>
    <h2 id="node-title">.hahahah/graph/memory.md</h2>
    <div style="font-size:11px;color:var(--muted)" id="node-meta"></div>
    <div id="memory-section" style="display:none">
      <div class="sec-title">Active Session Handoff</div>
      <div class="memory-box" id="memory-text"></div>
    </div>
    <div>
      <div class="sec-title" id="sym-header">Symbols & Line Anchors</div>
      <div class="pill-list" id="sym-list"></div>
    </div>
    <div>
      <div class="sec-title">Outgoing Links (Imports)</div>
      <div class="pill-list" id="out-list"></div>
    </div>
    <div>
      <div class="sec-title">Incoming Backlinks (Used By)</div>
      <div class="pill-list" id="in-list"></div>
    </div>
  </aside>

  <canvas id="graph"></canvas>

  <script id="graph-data" type="application/json">${payloadJson}</script>
  <script>
    const data = JSON.parse(document.getElementById('graph-data').textContent);
    const COLORS = {
      memory: '#10b981',
      entrypoint: '#f97316',
      sql: '#06b6d4',
      test: '#a855f7',
      module: '#f8fafc'
    };

    const canvas = document.getElementById('graph');
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    let is3D = true;
    let isBrutal = true;
    let overdrive = false;
    let autoSpin = true;

    // Multi-axis 3D rotation angles & momentum
    let rotY = 0.4;
    let rotX = 0.22;
    let rotZ = 0.0;
    let velY = 0.009;
    let velX = 0.002;
    let sphereRadius = Math.min(width - 360, height) * 0.35;

    const N = data.nodes.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const nodes = data.nodes.map((n, i) => {
      const y3 = N <= 1 ? 0 : 1 - (i / (N - 1)) * 2;
      const rSlice = Math.sqrt(Math.max(0, 1 - y3 * y3));
      const theta = goldenAngle * i;
      const sx = Math.cos(theta) * rSlice;
      const sz = Math.sin(theta) * rSlice;

      const angle2d = (i / N) * Math.PI * 2;
      const rad2d = n.category === 'memory' ? 0 : 120 + (i % 3) * 70;

      return {
        ...n,
        idx: i,
        sx, sy: y3, sz,
        x: (width - 340) / 2 + Math.cos(angle2d) * rad2d,
        y: height / 2 + Math.sin(angle2d) * rad2d,
        vx: 0, vy: 0,
        projX: 0, projY: 0, projZ: 0, projScale: 1,
        flashTimer: 0,
        r: n.category === 'memory' ? 7.5 : Math.max(4.2, Math.min(7.5, 4 + Math.sqrt(n.symbols.length + n.links.length)))
      };
    });

    // 80 Ambient floating 3D dust particles for cyber chamber depth
    const ambientStars = Array.from({ length: 80 }, () => {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.1 + Math.random() * 0.85;
      return {
        sx: r * Math.sin(phi) * Math.cos(theta),
        sy: r * Math.sin(phi) * Math.sin(theta),
        sz: r * Math.cos(phi),
        size: 0.9 + Math.random() * 1.6,
        alpha: 0.2 + Math.random() * 0.5
      };
    });

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

    for (const n of nodes) {
      for (const targetId of n.links) {
        const target = nodeById.get(targetId);
        if (target) {
          addEdge(n, target, n.category === 'memory' ? 'memory' : 'code');
          backlinks.get(targetId).push(n.id);
        }
      }
    }

    const codeEdgesCount = edges.length;

    // Geodesic 3D Lattice Mesh
    const kNeighbors = Math.min(5, Math.max(3, Math.floor(N / 7)));
    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      const dists = [];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const d = Math.hypot(a.sx - b.sx, a.sy - b.sy, a.sz - b.sz);
        dists.push({ b, d });
      }
      dists.sort((u, v) => u.d - v.d);
      for (let m = 0; m < Math.min(kNeighbors, dists.length); m++) {
        addEdge(a, dists[m].b, 'mesh');
      }
      if (dists.length > kNeighbors + 4 && i % 2 === 0) {
        addEdge(a, dists[Math.min(dists.length - 1, kNeighbors + 5)].b, 'chord');
      }
    }

    document.getElementById('stats-label').textContent =
      \`\${nodes.length} nodes • \${codeEdgesCount} links • ~\${data.indexTokensEst} tokens\`;

    let selectedNode = nodes[0];
    let hoveredNode = null;
    let draggedNode = null;
    let panX = 0, panY = 0, zoom = 1;
    let isDragging = false, lastMouseX = 0, lastMouseY = 0;
    let searchQuery = '';

    // Active Laser Pathway & Synapse Storm State
    let activeLaserEdges = new Map(); // key -> { from, to, ttl, maxTtl }
    let pulses = [];
    let shockwaves = [];
    let lastStormBurst = 0;
    let burstCounter = 0;

    function igniteSynapseBeam(fromNode, toNode, pulseSpeed = 0.042) {
      if (!fromNode || !toNode) return;
      const k1 = fromNode.id + '->' + toNode.id;
      const k2 = toNode.id + '->' + fromNode.id;
      const ttl = isBrutal ? 55 : 35;
      activeLaserEdges.set(k1, { from: fromNode, to: toNode, ttl, maxTtl: ttl });
      activeLaserEdges.set(k2, { from: toNode, to: fromNode, ttl, maxTtl: ttl });
      pulses.push({
        from: fromNode,
        to: toNode,
        t: 0,
        speed: pulseSpeed * (isBrutal ? 1.4 : 1.0),
        color: '#ff176b'
      });
      fromNode.flashTimer = 1.0;
    }

    function buildLaserPathway(startNode) {
      if (!startNode) return;
      activeLaserEdges.clear();
      pulses = [];

      let curr = startNode;
      const hops = Math.min(6, Math.max(3, Math.floor(N / 5)));
      const visited = new Set([curr.id]);
      const path = [curr];

      for (let step = 0; step < hops; step++) {
        const neighbors = [...(adj.get(curr.id) || [])]
          .map(id => nodeById.get(id))
          .filter(n => n && !visited.has(n.id));
        if (neighbors.length === 0) break;

        const codeLinked = neighbors.filter(nb => curr.links.includes(nb.id) || nb.links.includes(curr.id));
        const pickPool = codeLinked.length > 0 ? codeLinked : neighbors;
        const next = pickPool[Math.floor(Math.random() * pickPool.length)];

        visited.add(next.id);
        path.push(next);
        igniteSynapseBeam(curr, next, 0.035 + Math.random() * 0.025);
        curr = next;
      }

      for (const linkId of startNode.links) {
        const target = nodeById.get(linkId);
        if (target) igniteSynapseBeam(startNode, target, 0.045);
      }

      const routeNames = path.map(p => p.label).join(' ➔ ');
      const symPreview = startNode.symbols.length > 0
        ? \` [\${startNode.symbols.map(s => s.name + ':' + s.line).slice(0, 3).join(', ')}]\`
        : '';
      document.getElementById('term-stream').textContent =
        \`>> SYNAPSE BURST: \${routeNames}\${symPreview}\`;
      document.getElementById('trace-counter').textContent =
        \`\${visited.size} NODES ACTIVATED • BRUTAL SYNAPSE STORM\`;
    }

    function triggerAutoStormBurst() {
      if (!is3D || !isBrutal) return;
      burstCounter++;

      // Pick an active anchor (selectedNode, memory, or random high-degree node)
      const hubCandidates = [selectedNode, nodes[0], nodes[Math.floor(Math.random() * nodes.length)]];
      const source = hubCandidates[Math.floor(Math.random() * hubCandidates.length)];
      if (!source) return;

      const neighbors = [...(adj.get(source.id) || [])].map(id => nodeById.get(id)).filter(Boolean);
      if (neighbors.length === 0) return;

      // Spawn 2 to 4 rapid simultaneous electric discharges
      const forks = Math.min(neighbors.length, Math.floor(2 + Math.random() * 3));
      for (let f = 0; f < forks; f++) {
        const target = neighbors[Math.floor(Math.random() * neighbors.length)];
        igniteSynapseBeam(source, target, 0.038 + Math.random() * 0.03);

        // Secondary chain reaction from target to another neighbor
        const subNeighbors = [...(adj.get(target.id) || [])].map(id => nodeById.get(id)).filter(n => n && n !== source);
        if (subNeighbors.length > 0 && Math.random() > 0.35) {
          const subTarget = subNeighbors[Math.floor(Math.random() * subNeighbors.length)];
          setTimeout(() => {
            igniteSynapseBeam(target, subTarget, 0.045 + Math.random() * 0.03);
          }, 80);
        }
      }

      if (burstCounter % 3 === 0) {
        const activeSym = source.symbols[0]?.name ? \` [\${source.symbols[0].name}]\` : '';
        const tokRate = Math.floor(118 + Math.random() * 34);
        document.getElementById('term-stream').textContent =
          \`>> ACTIVE FIRING: \${source.label}\${activeSym} ➔ \${forks} targets [\${tokRate} tok/s]\`;
      }
    }

    function selectNode(node) {
      selectedNode = node;
      buildLaserPathway(node);

      const catEl = document.getElementById('node-cat');
      catEl.textContent = node.category.toUpperCase();
      const badgeColor = node.category === 'module' ? '#ff176b' : COLORS[node.category];
      catEl.style.background = badgeColor + '28';
      catEl.style.color = badgeColor;
      catEl.style.border = '1px solid ' + badgeColor + '66';

      document.getElementById('node-title').textContent = node.id;
      document.getElementById('node-meta').textContent =
        \`\${node.lines} lines • \${node.symbols.length} symbol(s) • \${node.links.length} link(s)\`;

      const memSec = document.getElementById('memory-section');
      if (node.category === 'memory') {
        memSec.style.display = 'block';
        document.getElementById('memory-text').textContent = data.memoryContent.trim();
      } else {
        memSec.style.display = 'none';
      }

      const symList = document.getElementById('sym-list');
      symList.innerHTML = '';
      if (node.symbols.length === 0) {
        symList.innerHTML = '<div style="font-size:11px;color:var(--muted)">No exported symbols</div>';
      } else {
        for (const s of node.symbols) {
          const row = document.createElement('div');
          row.className = 'item-row';
          row.innerHTML = \`<span><strong style="color:var(--muted)">\${s.kind}</strong> \${s.name}</span><span class="line-tag">:\${s.line}</span>\`;
          symList.appendChild(row);
        }
      }

      const outList = document.getElementById('out-list');
      outList.innerHTML = '';
      if (node.links.length === 0) {
        outList.innerHTML = '<div style="font-size:11px;color:var(--muted)">None</div>';
      } else {
        for (const l of node.links) {
          const row = document.createElement('div');
          row.className = 'item-row';
          row.innerHTML = \`<span>[[\${l}]]</span><span class="line-tag">➔</span>\`;
          row.onclick = () => { const t = nodeById.get(l); if (t) selectNode(t); };
          outList.appendChild(row);
        }
      }

      const inList = document.getElementById('in-list');
      inList.innerHTML = '';
      const inc = backlinks.get(node.id) || [];
      if (inc.length === 0) {
        inList.innerHTML = '<div style="font-size:11px;color:var(--muted)">None</div>';
      } else {
        for (const callerId of inc) {
          const row = document.createElement('div');
          row.className = 'item-row';
          row.innerHTML = \`<span>[[\${callerId}]]</span><span class="line-tag">⬅</span>\`;
          row.onclick = () => { const t = nodeById.get(callerId); if (t) selectNode(t); };
          inList.appendChild(row);
        }
      }
    }

    selectNode(selectedNode);

    function getHitNode(clientX, clientY) {
      if (is3D) {
        const sorted = [...nodes].sort((a, b) => a.projZ - b.projZ);
        for (const n of sorted) {
          const hitR = n.r * n.projScale + 8;
          if (Math.hypot(clientX - n.projX, clientY - n.projY) <= hitR) {
            return n;
          }
        }
        return null;
      } else {
        const wx = (clientX - width / 2 - panX) / zoom + width / 2;
        const wy = (clientY - height / 2 - panY) / zoom + height / 2;
        for (let i = nodes.length - 1; i >= 0; i--) {
          const n = nodes[i];
          if (Math.hypot(wx - n.x, wy - n.y) <= n.r + 6) return n;
        }
        return null;
      }
    }

    canvas.addEventListener('mousedown', (e) => {
      const hit = getHitNode(e.clientX, e.clientY);
      if (hit) {
        selectNode(hit);
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
          draggedNode.x = (e.clientX - width / 2 - panX) / zoom + width / 2;
          draggedNode.y = (e.clientY - height / 2 - panY) / zoom + height / 2;
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

    document.getElementById('search').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchQuery) {
        const match = nodes.find(n => matchesSearch(n));
        if (match) selectNode(match);
      }
    });

    document.getElementById('brutal-btn').addEventListener('click', (e) => {
      isBrutal = !isBrutal;
      e.target.textContent = isBrutal ? '⚡ Brutal Storm: ON' : '⚡ Brutal Storm: OFF';
      e.target.classList.toggle('active-mode', isBrutal);
    });

    document.getElementById('mode-btn').addEventListener('click', (e) => {
      is3D = !is3D;
      e.target.textContent = is3D ? '🌐 3D Neural Sphere' : '🗺️ 2D Force Planar';
      e.target.classList.toggle('active-mode', is3D);
    });

    document.getElementById('overdrive-btn').addEventListener('click', (e) => {
      overdrive = !overdrive;
      e.target.textContent = overdrive ? '🔥 Overdrive: ON' : '🔥 Overdrive: OFF';
      e.target.classList.toggle('active-mode', overdrive);
      if (overdrive) {
        document.getElementById('term-stream').textContent =
          '>> FULL NEURAL OVERDRIVE: All geodesic channels illuminated at maximum voltage.';
      } else {
        buildLaserPathway(selectedNode);
      }
    });

    document.getElementById('pulse-btn').addEventListener('click', () => {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      selectNode(randomNode);
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      panX = 0; panY = 0; zoom = 1;
      rotX = 0.22; rotY = 0.4; rotZ = 0;
      velY = 0.009; velX = 0.002;
    });

    window.addEventListener('resize', () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      sphereRadius = Math.min(width - 360, height) * 0.35;
    });

    function matchesSearch(n) {
      if (!searchQuery) return true;
      if (n.id.toLowerCase().includes(searchQuery)) return true;
      return n.symbols.some(s => s.name.toLowerCase().includes(searchQuery));
    }

    function step2DPhysics() {
      const centerX = (width - 340) / 2;
      const centerY = height / 2;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x || 0.1;
          const dy = b.y - a.y || 0.1;
          const distSq = dx * dx + dy * dy;
          const force = 2400 / Math.max(distSq, 900);
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
        const force = (dist - 125) * 0.025;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        e.source.vx += fx; e.source.vy += fy;
        e.target.vx -= fx; e.target.vy -= fy;
      }

      for (const n of nodes) {
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

      // Compound Gyroscopic Multi-Axis Rotation (Brutal Tumbling!)
      if (!isDragging && autoSpin) {
        const baseSpeed = isBrutal ? 0.0085 : 0.0035;
        rotY += velY;
        velY = velY * 0.982 + baseSpeed * 0.018;

        // Dynamic 3D Wobble & Pitch/Roll waves
        const targetPitch = Math.sin(globalTime * 0.85) * (isBrutal ? 0.42 : 0.2);
        rotX = rotX * 0.96 + targetPitch * 0.04;
        rotZ = Math.cos(globalTime * 0.65) * (isBrutal ? 0.22 : 0.08);
      }

      // Continuous Synapse Storm bursts (fires new sparks every ~180ms)
      if (isBrutal && Date.now() - lastStormBurst > 180) {
        triggerAutoStormBurst();
        lastStormBurst = Date.now();
      }

      // Age and prune decaying active laser beams
      for (const [k, beam] of activeLaserEdges.entries()) {
        beam.ttl--;
        if (beam.ttl <= 0) activeLaserEdges.delete(k);
      }

      const centerX = (width - 340) / 2 + panX * 0.3;
      const centerY = height / 2 - 12 + panY * 0.3;

      // Breathing Sphere Radius
      const breathe = 1 + Math.sin(globalTime * 3.2) * (isBrutal ? 0.04 : 0.018);
      const R = sphereRadius * zoom * breathe;
      const fov = 620;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      // Project ambient stars in 3D parallax
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

      // Project main nodes
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

      // Ambient core glow behind sphere
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, R * 1.3);
      coreGrad.addColorStop(0, overdrive ? 'rgba(255, 23, 107, 0.22)' : 'rgba(255, 23, 107, 0.11)');
      coreGrad.addColorStop(0.55, 'rgba(99, 102, 241, 0.05)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // Sort edges back-to-front
      const sortedEdges = [...edges].sort(
        (a, b) => (b.source.projZ + b.target.projZ) - (a.source.projZ + a.target.projZ)
      );

      // Pass 1: Draw silver-white geodesic lattice mesh
      ctx.save();
      for (const e of sortedEdges) {
        const k = e.source.id + '->' + e.target.id;
        const beam = activeLaserEdges.get(k);
        const isLaser = overdrive
          ? (e.kind !== 'mesh' || (e.source.idx + e.target.idx) % 2 === 0)
          : Boolean(beam);

        if (isLaser) continue;

        const avgZ = (e.source.projZ + e.target.projZ) / (2 * R);
        const depthAlpha = Math.max(0.05, Math.min(0.35, 0.22 - avgZ * 0.15));

        ctx.beginPath();
        ctx.moveTo(e.source.projX, e.source.projY);
        ctx.lineTo(e.target.projX, e.target.projY);
        ctx.strokeStyle = \`rgba(226, 232, 240, \${depthAlpha.toFixed(3)})\`;
        ctx.lineWidth = e.kind === 'code' ? 1.15 : 0.75;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 2: High-Voltage Electric Neon Laser Beams (with Plasma Arc Jitter!)
      ctx.save();
      for (const e of sortedEdges) {
        const k = e.source.id + '->' + e.target.id;
        const beam = activeLaserEdges.get(k);
        const isHoveredEdge = hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);
        const isLaser = isHoveredEdge || overdrive || Boolean(beam);

        if (!isLaser) continue;

        const intensity = overdrive ? 1 : beam ? beam.ttl / beam.maxTtl : 0.85;

        // Plasma arc micro-jitter
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

        // Outer neon pink bloom
        ctx.beginPath();
        ctx.moveTo(e.source.projX, e.source.projY);
        ctx.quadraticCurveTo(cx, cy, e.target.projX, e.target.projY);
        ctx.shadowColor = '#ff176b';
        ctx.shadowBlur = (overdrive ? 20 : 16) + Math.sin(globalTime * 25 + e.seed) * 6;
        ctx.strokeStyle = \`rgba(255, 20, 95, \${(0.88 * intensity).toFixed(3)})\`;
        ctx.lineWidth = (overdrive ? 2.6 : 3.2) * (isBrutal ? 1.25 : 1.0);
        ctx.stroke();

        // Inner white-hot laser core
        ctx.beginPath();
        ctx.moveTo(e.source.projX, e.source.projY);
        ctx.quadraticCurveTo(cx, cy, e.target.projX, e.target.projY);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = \`rgba(255, 225, 240, \${(0.95 * intensity).toFixed(3)})\`;
        ctx.lineWidth = 1.35;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 3: Animated high-speed energy pulses
      ctx.save();
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t >= 1) {
          // Pulse arrived! Trigger shockwave ripple on target node
          shockwaves.push({
            x: p.to.projX,
            y: p.to.projY,
            r: p.to.r * p.to.projScale,
            maxR: p.to.r * p.to.projScale + (isBrutal ? 36 : 20),
            alpha: 1.0
          });
          p.to.flashTimer = 1.0;
          pulses.splice(i, 1);
          continue;
        }

        const px = p.from.projX + (p.to.projX - p.from.projX) * p.t;
        const py = p.from.projY + (p.to.projY - p.from.projY) * p.t;

        ctx.beginPath();
        ctx.arc(px, py, 3.8, 0, Math.PI * 2);
        ctx.shadowColor = '#ff176b';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Trailing comet spark
        const trailX = p.from.projX + (p.to.projX - p.from.projX) * Math.max(0, p.t - 0.08);
        const trailY = p.from.projY + (p.to.projY - p.from.projY) * Math.max(0, p.t - 0.08);
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'rgba(255, 23, 107, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 4: Expanding Shockwave Halo Rings
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
        ctx.shadowColor = '#ff176b';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = \`rgba(255, 23, 107, \${sw.alpha.toFixed(3)})\`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      ctx.restore();

      // Pass 5: Render 3D Nodes & Monospace Labels
      const sortedNodes = [...nodes].sort((a, b) => b.projZ - a.projZ);
      for (const n of sortedNodes) {
        const activeSearch = matchesSearch(n);
        const isSel = n === selectedNode || n === hoveredNode;
        const isFlashing = n.flashTimer > 0;
        const normZ = n.projZ / R;
        const depthAlpha = Math.max(0.24, Math.min(1, 0.78 - normZ * 0.45));
        const r = Math.max(2.8, n.r * n.projScale * (isSel ? 1.4 : isFlashing ? 1.25 : 1));

        ctx.save();
        ctx.globalAlpha = activeSearch ? depthAlpha : 0.12;

        if (isFlashing || isSel) {
          ctx.beginPath();
          ctx.arc(n.projX, n.projY, r + (isSel ? 7 : 4), 0, Math.PI * 2);
          ctx.fillStyle = isSel ? 'rgba(255, 23, 107, 0.45)' : 'rgba(255, 23, 107, 0.28)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.projX, n.projY, r, 0, Math.PI * 2);
        if (isSel || isFlashing) {
          ctx.shadowColor = '#ff176b';
          ctx.shadowBlur = isSel ? 22 : 15;
          ctx.fillStyle = '#ffffff';
        } else if (n.category === 'memory') {
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#10b981';
        } else {
          ctx.fillStyle = '#f8fafc';
        }
        ctx.fill();

        if (normZ < 0.55 || isSel || isFlashing) {
          ctx.shadowBlur = 0;
          ctx.font = (isSel || isFlashing ? '700 ' : '500 ') + Math.round(10 * Math.max(0.82, n.projScale)) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillStyle = isSel ? '#ffffff' : isFlashing ? '#ff9ec2' : 'rgba(226, 232, 240, 0.88)';
          ctx.textAlign = 'left';
          const lbl = n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label;
          ctx.fillText(lbl, n.projX + r + 5, n.projY + 3);
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
        ctx.strokeStyle = isHighlighted ? '#ff176b' : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = isHighlighted ? 2.2 : 1.1;
        ctx.stroke();
      }

      for (const n of nodes) {
        const active = matchesSearch(n);
        const isSel = n === selectedNode || n === hoveredNode;
        const color = n.category === 'module' ? '#6366f1' : COLORS[n.category];

        ctx.globalAlpha = active ? 1 : 0.18;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 2, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? '#ff176b' : color;
        ctx.fill();
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = isSel ? '#ffffff' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.r + 14);
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
