const fs = require('fs');
const path = require('path');
const sharp = require('../web/node_modules/sharp');

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .display { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-weight: 900; }
      .mono { font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace; font-weight: 700; }
      .sans { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-weight: 700; }
    </style>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e8e2d5" stroke-width="0.8" />
    </pattern>
    <filter id="shadow">
      <feDropShadow dx="6" dy="6" stdDeviation="0" flood-color="#0d0d0d" flood-opacity="1" />
    </filter>
    <filter id="shadow-sm">
      <feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="#0d0d0d" flood-opacity="1" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="1200" height="630" fill="#faf6ee" />
  <rect width="1200" height="630" fill="url(#grid)" opacity="0.6" />

  <!-- Outer Frame -->
  <rect x="25" y="25" width="1150" height="580" rx="20" fill="none" stroke="#0d0d0d" stroke-width="4" stroke-dasharray="16,8" />

  <!-- Main Card Container -->
  <g filter="url(#shadow)">
    <rect x="50" y="50" width="1100" height="530" rx="24" fill="#ffffff" stroke="#0d0d0d" stroke-width="4" />
  </g>

  <!-- Top Badges -->
  <g transform="translate(90, 85)">
    <!-- Pill 1: Humanoise Labs -->
    <g filter="url(#shadow-sm)">
      <rect x="0" y="0" width="280" height="42" rx="21" fill="#ffd23f" stroke="#0d0d0d" stroke-width="3" />
      <text x="140" y="27" text-anchor="middle" class="mono" font-size="14" fill="#0d0d0d" letter-spacing="1.5">★ HUMANOISE LABS</text>
    </g>

    <!-- Pill 2: Nusantara Edition -->
    <g filter="url(#shadow-sm)" transform="translate(295, 0)">
      <rect x="0" y="0" width="220" height="42" rx="21" fill="#ff6b2c" stroke="#0d0d0d" stroke-width="3" />
      <text x="110" y="27" text-anchor="middle" class="mono" font-size="14" fill="#ffffff" letter-spacing="1">NUSANTARA EDITION</text>
    </g>

    <!-- Pill 3: NPM Version -->
    <g filter="url(#shadow-sm)" transform="translate(530, 0)">
      <rect x="0" y="0" width="190" height="42" rx="21" fill="#faf7f0" stroke="#0d0d0d" stroke-width="3" />
      <text x="95" y="27" text-anchor="middle" class="mono" font-size="14" fill="#0d0d0d">v0.1.2 ON NPM 📦</text>
    </g>
  </g>

  <!-- Mascot Doodle Circle (Top Right) -->
  <g transform="translate(960, 90)" filter="url(#shadow)">
    <circle cx="55" cy="55" r="55" fill="#ffd23f" stroke="#0d0d0d" stroke-width="4" />
    <g transform="translate(55, 68) scale(0.65)" fill="#ffffff" stroke="#0d0d0d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-30 -104 C-40 -112 -44 -124 -40 -138 C-32 -129 -22 -122 -13 -114 Z" />
      <path d="M18 -114 C26 -124 36 -130 47 -133 C45 -120 41 -110 32 -101 Z" />
      <path d="M-44 -30 C-54 -56 -54 -70 -42 -90 C-32 -110 -14 -118 2 -118 C22 -118 40 -108 48 -88 C58 -68 56 -54 48 -30 Z" />
      <circle cx="-15" cy="-84" r="7" fill="#0d0d0d" />
      <circle cx="13" cy="-86" r="7" fill="#0d0d0d" />
      <path d="M-12 -66 C-6 -58 6 -58 12 -67" fill="none" stroke-width="4" />
    </g>
  </g>

  <!-- Big Brand Heading -->
  <g transform="translate(90, 220)">
    <text x="0" y="0" class="display" font-size="78" fill="#0d0d0d" letter-spacing="-1">+62 MODE</text>
    <path d="M 0 16 Q 180 30, 360 14 T 420 18" fill="none" stroke="#ff6b2c" stroke-width="8" stroke-linecap="round" />
    <text x="0" y="58" class="sans" font-size="25" fill="#3a3a3a">
      Personality &amp; Token Efficiency Layer for Coding Agents
    </text>
  </g>

  <!-- 3 Persona Cards Grid -->
  <g transform="translate(90, 320)">
    <!-- Card 1: +62 Mode -->
    <g filter="url(#shadow-sm)">
      <rect x="0" y="0" width="310" height="96" rx="16" fill="#ffd23f" stroke="#0d0d0d" stroke-width="3" />
      <text x="20" y="38" class="display" font-size="22" fill="#0d0d0d">+62 MODE</text>
      <rect x="135" y="18" width="110" height="24" rx="12" fill="#0d0d0d" />
      <text x="190" y="34" text-anchor="middle" class="mono" font-size="11" fill="#ffd23f">BLOKO SUTO</text>
      <text x="20" y="70" class="sans" font-size="13" fill="#262626">To-the-point, sikat baris bug,</text>
      <text x="20" y="87" class="sans" font-size="13" fill="#262626">zero basa-basi korporat.</text>
    </g>

    <!-- Card 2: HALAL ID -->
    <g filter="url(#shadow-sm)" transform="translate(330, 0)">
      <rect x="0" y="0" width="310" height="96" rx="16" fill="#f0fff0" stroke="#0d0d0d" stroke-width="3" />
      <text x="20" y="38" class="display" font-size="22" fill="#0d0d0d">HALAL ID</text>
      <rect x="135" y="18" width="115" height="24" rx="12" fill="#5fb247" stroke="#0d0d0d" stroke-width="1.5" />
      <text x="192" y="34" text-anchor="middle" class="mono" font-size="11" fill="#ffffff">AMANAH &amp; ADAB</text>
      <text x="20" y="70" class="sans" font-size="13" fill="#262626">Santun, taat no-fatwa policy,</text>
      <text x="20" y="87" class="sans" font-size="13" fill="#262626">ramah tim &amp; edukasi kode.</text>
    </g>

    <!-- Card 3: JAWA ID -->
    <g filter="url(#shadow-sm)" transform="translate(660, 0)">
      <rect x="0" y="0" width="310" height="96" rx="16" fill="#f2f8ff" stroke="#0d0d0d" stroke-width="3" />
      <text x="20" y="38" class="display" font-size="22" fill="#0d0d0d">JAWA ID</text>
      <rect x="130" y="18" width="125" height="24" rx="12" fill="#8fdcff" stroke="#0d0d0d" stroke-width="1.5" />
      <text x="192" y="34" text-anchor="middle" class="mono" font-size="11" fill="#0d0d0d">UNGGAH-UNGGUH</text>
      <text x="20" y="70" class="sans" font-size="13" fill="#262626">Kromo alus, alon-alon kelakon,</text>
      <text x="20" y="87" class="sans" font-size="13" fill="#262626">sabar bedah dependensi.</text>
    </g>
  </g>

  <!-- Bottom Bar: Terminal Command + Supported Agents -->
  <g transform="translate(90, 450)">
    <!-- Terminal Box -->
    <g filter="url(#shadow-sm)">
      <rect x="0" y="0" width="570" height="66" rx="14" fill="#141414" stroke="#0d0d0d" stroke-width="3" />
      <!-- Dots -->
      <circle cx="24" cy="33" r="5" fill="#ff5f56" />
      <circle cx="39" cy="33" r="5" fill="#ffbd2e" />
      <circle cx="54" cy="33" r="5" fill="#27c93f" />
      <!-- Prompt -->
      <text x="75" y="39" class="mono" font-size="16" fill="#00ff66">$</text>
      <text x="95" y="39" class="mono" font-size="16" fill="#ffd23f">npx plus62 install</text>
    </g>

    <!-- Supported Badges -->
    <g transform="translate(595, 5)">
      <text x="0" y="18" class="mono" font-size="12" fill="#737373" letter-spacing="1">SUPPORTED HARNESSES:</text>
      <g transform="translate(0, 26)">
        <text x="0" y="18" class="sans" font-size="14" fill="#0d0d0d" font-weight="900">
          Claude Code • Antigravity • Qoder • OpenCode • Cursor • Copilot
        </text>
      </g>
    </g>
  </g>

</svg>
`;

const outputPath = path.join(__dirname, '../web/public/og-image.png');
sharp(Buffer.from(svg))
  .png({ quality: 95 })
  .toFile(outputPath)
  .then(() => {
    console.log('Successfully generated:', outputPath);
  })
  .catch((err) => {
    console.error('Failed to generate image:', err);
    process.exit(1);
  });
