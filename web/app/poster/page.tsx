"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Download, Sliders, Palette, RefreshCw, ChevronLeft, ChevronRight, Share2, Sparkles } from "lucide-react";

interface SlideData {
  handle: string;
  badge: string;
  cardUrl: string;
  cardOrg: string;
  cardRepo: string;
  cardDesc: string;
  stat1: string;
  stat2: string;
  stat3: string;
  link: string;
  prefix: string;
  highlight: string;
  subtext: string;
  installLabel: string;
  installCode: string;
  counter: string;
  swipe: string;
}

const DEFAULT_SLIDES: SlideData[] = [
  {
    handle: "OpensourceID",
    badge: "anti-yapping",
    cardUrl: "humanoiseLABS/anti-yapping",
    cardOrg: "humanoiseLABS/",
    cardRepo: "anti-yapping",
    cardDesc: "Stop AI yapping. Direct answers on line 1, surgical diffs only, no full-file dumps, and authentic +62 developer communication.",
    stat1: "1 Contributor",
    stat2: "0 Issues",
    stat3: "Stars",
    link: "github.com/humanoiseLABS/anti-yapping",
    prefix: "coding agent anti-yapping:",
    highlight: "jawaban to-the-point di baris 1, surgical diffs — hemat token s.d. 80%.",
    subtext: "nggak ada lagi AI yang nge-dump 300 baris kode cuma buat benerin 1 typo.",
    installLabel: "pasang:",
    installCode: "npx anti-yapping install",
    counter: "01 / 05",
    swipe: "swipe >",
  },
  {
    handle: "OpensourceID",
    badge: "masalah vs solusi",
    cardUrl: "masalah/ai-biasa-boros",
    cardOrg: "ai-coding/",
    cardRepo: "kebanyakan-yapping",
    cardDesc: "Nanya 1 baris bug, dibalas 200 baris kode utuh + 3 paragraf ceramah 'Tentu saya bisa bantu' dan 'Semoga bermanfaat!'.",
    stat1: "Boros Token",
    stat2: "Bikin Capek",
    stat3: "Scroll Terus",
    link: "github.com/humanoiseLABS/anti-yapping",
    prefix: "solusi anti-yapping:",
    highlight: "Ponytail surgical diffs: cuma baris yang berubah + 2 baris konteks.",
    subtext: "ngoding lebih ngebut, hemat biaya token API, dan terminal tetap bersih.",
    installLabel: "fitur:",
    installCode: "Direct Answer Line 1 + Zero Boilerplate",
    counter: "02 / 05",
    swipe: "swipe >",
  },
  {
    handle: "OpensourceID",
    badge: "o200k_base benchmark",
    cardUrl: "humanoiseLABS/benchmarks",
    cardOrg: "humanoiseLABS/",
    cardRepo: "token-efficiency",
    cardDesc: "Always-on cuma 517 token vs 1.000+ token rulebook biasa. Output respon irit 80-250 token per turn.",
    stat1: "517 Token",
    stat2: "-63.6% Total",
    stat3: "100% Lolos",
    link: "github.com/humanoiseLABS/anti-yapping",
    prefix: "performa teruji:",
    highlight: "Always-On 517 token, lulus 5/5 prompt injection & smoke screens.",
    subtext: "cocok buat langganan Claude Code, Cursor, OpenCode, atau API berbayar.",
    installLabel: "benchmark:",
    installCode: "npm run measure --profile anti-yapping",
    counter: "03 / 05",
    swipe: "swipe >",
  },
  {
    handle: "OpensourceID",
    badge: "all agents support",
    cardUrl: "anti-yapping/adapters",
    cardOrg: "harnesses/",
    cardRepo: "multi-agent-support",
    cardDesc: "12/12 harness test PASS: Claude Code, OpenCode, Antigravity, Cursor, Codex, Qoder, Copilot.",
    stat1: "12 Passed",
    stat2: "0 Error",
    stat3: "All Agents",
    link: "github.com/humanoiseLABS/anti-yapping",
    prefix: "sekali install:",
    highlight: "otomatis inject ke CLAUDE.md, AGENTS.md, atau .agents/rules/.",
    subtext: "apapun coding agent favorit lu, aturan anti-yapping langsung nempel otomatis.",
    installLabel: "dukungan:",
    installCode: "Claude Code, OpenCode, Antigravity, Cursor, Qoder",
    counter: "04 / 05",
    swipe: "swipe >",
  },
  {
    handle: "OpensourceID",
    badge: "gratis & open source",
    cardUrl: "humanoiseLABS/anti-yapping",
    cardOrg: "humanoiseLABS/",
    cardRepo: "anti-yapping",
    cardDesc: "100% open-source, zero dependencies runtime, siap pakai via npx tanpa repot clone git.",
    stat1: "MIT License",
    stat2: "NPM Ready",
    stat3: "GitHub",
    link: "github.com/humanoiseLABS/anti-yapping",
    prefix: "coba sekarang:",
    highlight: "npx anti-yapping install (bisa dry-run dulu!)",
    subtext: "eksplor dokumentasi interaktif di hahahah-web.vercel.app & kasih star di GitHub!",
    installLabel: "web:",
    installCode: "hahahah-web.vercel.app",
    counter: "05 / 05",
    swipe: "star on github ★",
  },
];

const THEMES = [
  { name: "Crimson Red (OpensourceID)", color: "#c12727" },
  { name: "Obsidian GitHub", color: "#0d1117" },
  { name: "Emerald Dev", color: "#064e3b" },
  { name: "Indigo Night", color: "#312e81" },
  { name: "Warm Vermilion", color: "#e05638" },
];

export default function PosterPage() {
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [themeColor, setThemeColor] = useState("#c12727");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentSlide = slides[currentSlideIndex];

  const updateCurrentSlide = (field: keyof SlideData, val: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndex] = {
        ...next[currentSlideIndex],
        [field]: val,
      };
      return next;
    });
  };

  const resetCurrentSlide = () => {
    setSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndex] = { ...DEFAULT_SLIDES[currentSlideIndex] };
      return next;
    });
  };

  // High Resolution 1080x1920 PNG export using Canvas
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // 1. Background
    ctx.fillStyle = themeColor;
    ctx.fillRect(0, 0, W, H);

    // 2. Top Bar
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.textBaseline = "middle";
    ctx.fillText("♪  " + currentSlide.handle, 80, 140);

    ctx.textAlign = "right";
    ctx.fillText("★  " + currentSlide.badge, W - 80, 140);
    ctx.textAlign = "left";

    // 3. Central Window Card
    const cardX = 80;
    const cardY = 280;
    const cardW = W - 160;
    const cardH = 680;
    const cardRadius = 36;
    const headerH = 72;

    // Header Background
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = "#1e1e24";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, headerH, [cardRadius, cardRadius, 0, 0]);
    ctx.fill();
    ctx.restore();

    // Traffic light dots
    ctx.fillStyle = "#ff5f56";
    ctx.beginPath();
    ctx.arc(cardX + 45, cardY + 36, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffbd2e";
    ctx.beginPath();
    ctx.arc(cardX + 78, cardY + 36, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#27c93f";
    ctx.beginPath();
    ctx.arc(cardX + 111, cardY + 36, 11, 0, Math.PI * 2);
    ctx.fill();

    // Window URL
    ctx.fillStyle = "#9ca3af";
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText(currentSlide.cardUrl, cardX + 155, cardY + 37);

    // Card Body Background
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY + headerH, cardW, cardH - headerH, [0, 0, cardRadius, cardRadius]);
    ctx.fill();

    // Card Title
    ctx.fillStyle = "#18181b";
    ctx.font = '700 52px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(currentSlide.cardOrg, cardX + 50, cardY + headerH + 90);
    const orgW = ctx.measureText(currentSlide.cardOrg).width;
    ctx.font = '900 52px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(currentSlide.cardRepo, cardX + 50 + orgW, cardY + headerH + 90);

    // Card Description
    ctx.fillStyle = "#4b5563";
    ctx.font = '500 30px "Plus Jakarta Sans", system-ui, sans-serif';
    wrapCanvasText(ctx, currentSlide.cardDesc, cardX + 50, cardY + headerH + 175, cardW - 270, 44);

    // Head + Soundwave Logo Badge
    const logoX = cardX + cardW - 190;
    const logoY = cardY + headerH + 50;
    const logoSize = 140;
    ctx.save();
    ctx.fillStyle = "#ecd9c6";
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 30);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#d6beaa";
    ctx.stroke();

    ctx.translate(logoX + 20, logoY + 15);
    ctx.scale(1.1, 1.1);
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(42, 40, 24, Math.PI * 0.8, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(63, 35);
    ctx.lineTo(66, 48);
    ctx.lineTo(60, 52);
    ctx.lineTo(62, 60);
    ctx.lineTo(54, 72);
    ctx.lineTo(34, 82);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(5, 45);
    ctx.lineTo(20, 45);
    ctx.lineTo(25, 34);
    ctx.lineTo(30, 56);
    ctx.lineTo(35, 24);
    ctx.lineTo(40, 66);
    ctx.lineTo(45, 30);
    ctx.lineTo(50, 60);
    ctx.lineTo(55, 40);
    ctx.lineTo(60, 45);
    ctx.lineTo(82, 45);
    ctx.stroke();
    ctx.restore();

    // Stats Bar Inside Card
    const statsY = cardY + cardH - 60;
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 50, statsY - 30);
    ctx.lineTo(cardX + cardW - 50, statsY - 30);
    ctx.stroke();

    ctx.fillStyle = "#6b7280";
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText(`👤 ${currentSlide.stat1}     ⊙ ${currentSlide.stat2}     ★ ${currentSlide.stat3}`, cardX + 50, statsY + 5);

    ctx.fillStyle = "#18181b";
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = "right";
    ctx.fillText("github", cardX + cardW - 50, statsY + 5);
    ctx.textAlign = "left";

    // 4. Lower Monospace Copywriting
    const textStartY = cardY + cardH + 110;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText(currentSlide.link, 80, textStartY);

    const highlightY = textStartY + 80;
    ctx.font = '700 36px "JetBrains Mono", monospace';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(currentSlide.prefix, 80, highlightY);

    const hlLines = wrapCanvasLines(ctx, currentSlide.highlight, cardW - 50);
    let curHlY = highlightY + 55;
    for (const line of hlLines) {
      const lineW = ctx.measureText(line).width;
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(80, curHlY - 34, lineW + 24, 48);
      ctx.fillStyle = "#000000";
      ctx.fillText(line, 92, curHlY);
      curHlY += 60;
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = '500 30px "JetBrains Mono", monospace';
    wrapCanvasText(ctx, currentSlide.subtext, 80, curHlY + 40, cardW, 46);

    const installY = curHlY + 160;
    ctx.fillStyle = "#fef08a";
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.fillText(currentSlide.installLabel + " ", 80, installY);
    const lblW = ctx.measureText(currentSlide.installLabel + " ").width;

    const codeW = ctx.measureText(currentSlide.installCode).width;
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.roundRect(80 + lblW, installY - 32, codeW + 36, 52, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(currentSlide.installCode, 80 + lblW + 18, installY + 4);

    // 5. Footer Pagination
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.fillText(currentSlide.counter, 80, H - 110);
    ctx.textAlign = "right";
    ctx.fillText(currentSlide.swipe, W - 80, H - 110);

    // Trigger download
    const linkEl = document.createElement("a");
    linkEl.download = `anti-yapping-slide-${currentSlideIndex + 1}.png`;
    linkEl.href = canvas.toDataURL("image/png");
    linkEl.click();
  };

  function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  function wrapCanvasLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#0d0d0d] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 md:py-12">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#ffd23f] text-[#0d0d0d] border-2 border-[#0d0d0d] font-mono text-xs font-bold shadow-[2px_2px_0_#0d0d0d]">
                Poster & Carousel Studio
              </span>
              <span className="text-xs font-bold text-[#0d0d0d]/60 font-mono">
                TikTok / Reels / LinkedIn Slide Generator
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0d0d0d]">
              Social Media Carousel Maker
            </h1>
            <p className="text-sm font-bold text-[#0d0d0d]/70 mt-1 max-w-xl">
              Template carousel bergaya OpensourceID: window card macOS, teks monospace ber-highlight kuning, dan ekspor langsung ke PNG 1080×1920.
            </p>
          </div>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ff6b2c] hover:bg-[#e0561e] border-2 border-[#0d0d0d] text-white font-extrabold text-sm shadow-[3px_3px_0_#0d0d0d] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Slide PNG (1080×1920)</span>
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border-2 border-[#0d0d0d] shadow-[3px_3px_0_#0d0d0d] mb-8">
          {/* Slide Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0d0d0d]/60 mr-1">Pilih Slide:</span>
            {slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border-2 border-[#0d0d0d] transition-all cursor-pointer ${
                  currentSlideIndex === idx
                    ? "bg-[#0d0d0d] text-white shadow-[2px_2px_0_#ffd23f]"
                    : "bg-white text-[#0d0d0d] hover:bg-[#fff9f2]"
                }`}
              >
                {s.counter.split(" / ")[0]} {idx === 0 ? "Hero" : idx === 1 ? "Problem" : idx === 2 ? "Token" : idx === 3 ? "Agents" : "Install"}
              </button>
            ))}
          </div>

          {/* Theme Palette */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#0d0d0d]/70" />
            <span className="text-xs font-extrabold text-[#0d0d0d]/70 mr-1">Warna Background:</span>
            <div className="flex items-center gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.color}
                  onClick={() => setThemeColor(t.color)}
                  style={{ backgroundColor: t.color }}
                  className={`w-7 h-7 rounded-full border-2 border-[#0d0d0d] transition-transform cursor-pointer ${
                    themeColor === t.color ? "scale-110 ring-2 ring-[#0d0d0d] ring-offset-2" : "hover:scale-105"
                  }`}
                  title={t.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Studio Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Live Mobile Slide Frame (Preview) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[420px] rounded-[44px] p-4 bg-[#18181b] border-[8px] border-[#0d0d0d] shadow-[8px_8px_0_#0d0d0d]">
              
              {/* Dynamic Slide Screen */}
              <div
                style={{ backgroundColor: themeColor }}
                className="relative w-full aspect-[9/16] rounded-[30px] overflow-hidden flex flex-col justify-between p-6 select-none transition-colors duration-300 shadow-inner font-mono"
              >
                {/* Top Social Bar */}
                <div className="flex items-center justify-between text-white/90 text-xs font-bold tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">♪</span>
                    <span>{currentSlide.handle}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>★</span>
                    <span>{currentSlide.badge}</span>
                  </div>
                </div>

                {/* Central macOS Style Window Card */}
                <div className="w-full my-auto shadow-2xl rounded-2xl overflow-hidden border border-black/25">
                  {/* Window Title Bar */}
                  <div className="bg-[#1e1e24] px-4 py-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-[11px] text-zinc-400 pl-2 truncate">{currentSlide.cardUrl}</span>
                  </div>

                  {/* Window Body */}
                  <div className="bg-white text-zinc-900 p-5 font-sans">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 leading-tight">
                          <span className="font-bold text-zinc-700">{currentSlide.cardOrg}</span>
                          <span className="font-black text-black">{currentSlide.cardRepo}</span>
                        </h2>
                        <p className="text-xs text-zinc-600 font-medium leading-snug">
                          {currentSlide.cardDesc}
                        </p>
                      </div>

                      {/* Head + Soundwave Logo */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#ecd9c6] p-2 flex items-center justify-center border border-[#d6beaa] shadow-inner">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <path
                            d="M 40 16 C 56 16 68 26 68 42 C 68 48 66 52 64 56 C 65 58 68 60 70 61 C 71 61.5 70 64 67 64 C 65 64 63 65 62 67 C 60 72 54 76 48 76 L 46 82 C 45 86 43 90 42 92 L 30 92"
                            fill="none"
                            stroke="#1c1917"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path d="M 44 46 C 47 46 49 50 47 54 C 45 58 41 56 40 53" fill="none" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
                          <path
                            d="M 12 48 L 24 48 L 28 38 L 32 58 L 36 28 L 40 68 L 44 33 L 48 63 L 52 42 L 56 48 L 74 48"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono font-semibold pt-3 mt-3 border-t border-zinc-100">
                      <div className="flex items-center gap-3">
                        <span>👤 {currentSlide.stat1}</span>
                        <span>⊙ {currentSlide.stat2}</span>
                        <span>★ {currentSlide.stat3}</span>
                      </div>
                      <span className="font-bold text-zinc-900">github</span>
                    </div>
                  </div>
                </div>

                {/* Lower Monospace Text */}
                <div className="space-y-2.5 text-white text-xs">
                  <p className="text-white/80 font-bold tracking-tight">{currentSlide.link}</p>

                  <p className="leading-relaxed font-bold">
                    <span className="text-white">{currentSlide.prefix} </span>
                    <span className="bg-[#ffd23f] text-black px-1.5 py-0.5 rounded-sm inline font-black">
                      {currentSlide.highlight}
                    </span>
                  </p>

                  <p className="text-white/85 text-[11px] leading-normal">{currentSlide.subtext}</p>

                  <p className="text-white/90 text-[11px] pt-1">
                    <span className="text-amber-200 font-bold">{currentSlide.installLabel} </span>
                    <span className="bg-black/40 px-2 py-0.5 rounded text-white font-mono">{currentSlide.installCode}</span>
                  </p>
                </div>

                {/* Footer Pagination */}
                <div className="flex items-center justify-between text-white/80 text-xs font-bold pt-2">
                  <span>{currentSlide.counter}</span>
                  <span>{currentSlide.swipe}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Slide Editor Panel */}
          <div className="lg:col-span-6 bg-white border-2 border-[#0d0d0d] rounded-2xl p-6 shadow-[4px_4px_0_#0d0d0d] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#0d0d0d]/10 pb-3">
              <h3 className="font-extrabold text-base text-[#0d0d0d] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#ff6b2c]" />
                <span>Kustomisasi Teks Slide {currentSlide.counter.split(" / ")[0]}</span>
              </h3>
              <button
                onClick={resetCurrentSlide}
                className="text-xs font-bold text-[#ff6b2c] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-[#0d0d0d]/70 font-bold mb-1">Handle / Akun Medsos:</label>
                <input
                  type="text"
                  value={currentSlide.handle}
                  onChange={(e) => updateCurrentSlide("handle", e.target.value)}
                  className="w-full bg-[#fdfaf5] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-bold focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                />
              </div>

              <div>
                <label className="block text-[#0d0d0d]/70 font-bold mb-1">Nama Organisasi & Repo:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={currentSlide.cardOrg}
                    onChange={(e) => updateCurrentSlide("cardOrg", e.target.value)}
                    placeholder="org/"
                    className="w-full bg-[#fdfaf5] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-bold focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                  />
                  <input
                    type="text"
                    value={currentSlide.cardRepo}
                    onChange={(e) => updateCurrentSlide("cardRepo", e.target.value)}
                    placeholder="repo"
                    className="w-full bg-[#fdfaf5] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-bold focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0d0d0d]/70 font-bold mb-1 font-sans">Deskripsi Window Card:</label>
                <textarea
                  rows={2}
                  value={currentSlide.cardDesc}
                  onChange={(e) => updateCurrentSlide("cardDesc", e.target.value)}
                  className="w-full bg-[#fdfaf5] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-medium font-sans focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                />
              </div>

              <div>
                <label className="block text-[#0d0d0d]/70 font-bold mb-1">
                  Teks Kuning Highlight <span className="text-[#ff6b2c] font-black">(Paling Mencolok)</span>:
                </label>
                <textarea
                  rows={2}
                  value={currentSlide.highlight}
                  onChange={(e) => updateCurrentSlide("highlight", e.target.value)}
                  className="w-full bg-[#fff9db] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-black focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                />
              </div>

              <div>
                <label className="block text-[#0d0d0d]/70 font-bold mb-1 font-sans">Penjelasan Tambahan (Subtext):</label>
                <textarea
                  rows={2}
                  value={currentSlide.subtext}
                  onChange={(e) => updateCurrentSlide("subtext", e.target.value)}
                  className="w-full bg-[#fdfaf5] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-medium font-sans focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                />
              </div>

              <div>
                <label className="block text-[#0d0d0d]/70 font-bold mb-1">Perintah Pasang / Action:</label>
                <input
                  type="text"
                  value={currentSlide.installCode}
                  onChange={(e) => updateCurrentSlide("installCode", e.target.value)}
                  className="w-full bg-[#fdfaf5] border-2 border-[#0d0d0d] rounded-xl px-3 py-2 text-[#0d0d0d] font-bold focus:outline-none focus:ring-2 focus:ring-[#ffd23f]"
                />
              </div>
            </div>

            {/* Quick Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-[#0d0d0d]/10">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((c) => Math.max(0, c - 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white border-2 border-[#0d0d0d] text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:bg-[#fff9f2]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Slide Sebelumnya</span>
              </button>

              <button
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex((c) => Math.min(slides.length - 1, c + 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#0d0d0d] text-white border-2 border-[#0d0d0d] text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:bg-zinc-800"
              >
                <span>Slide Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </main>

      <Footer />

      {/* Hidden Canvas for High-Resolution Export */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
