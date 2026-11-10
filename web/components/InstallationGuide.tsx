"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { PersonaOption, AgentOption } from "./Configurator";

interface InstallationGuideProps {
  selectedPersona: PersonaOption;
  selectedAgent: AgentOption;
  generatedCommand: string;
}

export default function InstallationGuide({
  selectedPersona,
  selectedAgent,
  generatedCommand,
}: InstallationGuideProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const isTokenMaxxing = selectedPersona.id === "token-maxxing" || selectedPersona.id === "anti-yapping";
  const packageName = isTokenMaxxing ? "token-maxxing" : "hahahah-ai";
  const repoUrl = isTokenMaxxing
    ? "https://github.com/humanoiseLABS/token-maxxing"
    : "https://github.com/humanoiseLABS/hahahah";

  const aiSelfInstallPrompt = `Tolong jalankan \`${generatedCommand}\` di terminal untuk memasang ${selectedPersona.name} untuk ${selectedAgent.name} ke workspace utama gw (dokumentasi resmi: ${repoUrl}). Untuk Qoder/Cursor/IDE lain, pastikan aturan suara persona juga digabung langsung ke AGENTS.md & Global Rules/Memory lu. Kalau sudah beres, langsung balas gw pakai gaya ${selectedPersona.name}!`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(aiSelfInstallPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      num: "01",
      phase: "Step 01",
      badge: "Buka Workspace",
      title: "Masuk ke Folder Project",
      desc: `Buka terminal di folder project kodingan lu. Ga usah repot-repot git clone, paket resminya (${packageName}) udah nangkring di NPM.`,
      code: "cd /path/ke/project-lu",
      outcome: "Terminal udah standby di folder project tujuan",
      side: "left",
    },
    {
      num: "02",
      phase: "Step 02",
      badge: "Simulasi Dry-Run",
      title: "Cek Dulu File & Budget Token (Opsional)",
      desc: "Intip dulu file apa aja yang bakal nambah dan taksiran tokennya tanpa ngutak-ngatik isi project lu.",
      code: `${generatedCommand} --dry-run`,
      outcome: "Rencana pasang & estimasi token udah diverifikasi aman",
      side: "right",
    },
    {
      num: "03",
      phase: "Step 03",
      badge: "Injeksi Persona",
      title: `Pasang ${selectedPersona.name} ke ${selectedAgent.name}`,
      desc:
        selectedAgent.id === "antigravity"
          ? `Sikat global ke ~/.gemini biar langsung nempel di semua project Antigravity lu (atau lepas --scope global kalau cuma buat project ini doang).`
          : `Jalankan satu baris npx ini buat nyuntik persona langsung ke project lu:`,
      code: generatedCommand,
      outcome: `Managed-block & config ${selectedAgent.whatItWrites} sukses nempel`,
      side: "left",
    },
    {
      num: "04",
      phase: "Step 04",
      badge: "Validasi Doctor",
      title: "Cek Kesehatan (Doctor Check)",
      desc: "Ketik doctor biar yakin manifest, hash berkas, sama posisi filenya udah bener semua tanpa ada yang korup atau nyasar.",
      code:
        selectedAgent.id === "antigravity"
          ? `npx ${packageName} doctor --target ~/.gemini`
          : `npx ${packageName} doctor --target .`,
      outcome: "Semua file & manifest aman 100%, siap tempur",
      side: "right",
    },
    {
      num: "05",
      phase: "Step 05",
      badge: "Siap Tempur",
      title: "Gas Koding Bareng Agent Lu!",
      desc: `Buka ${selectedAgent.name} di project lu. Sekarang agent lu udah ga bakal kaku lagi dan langsung ngobrol pake gaya ${selectedPersona.name}!`,
      code: `# Jalankan agent lu di folder project:\nclaude  # atau buka di Qoder / Antigravity / OpenCode / Cursor`,
      outcome: "Persona langsung aktif dari chat pertama, zero basa-basi!",
      side: "left",
    },
    {
      num: "06",
      phase: "Step 06",
      badge: "3D Second Brain",
      title: "Pantau Sistem Saraf AI Secara Live (Opsional)",
      desc: `Pantau second brain AI, state memory.md, dan token throughput secara 3D realtime di browser saat agen ngoding:`,
      code: `npx ${packageName} graph --live`,
      outcome: "3D Neural Sphere live aktif di http://127.0.0.1:4949",
      side: "right",
    },
  ];

  return (
    <section id="tutorial" className="py-24 px-6 max-w-5xl mx-auto sketch-divider">
      
      {/* Section Header */}
      <div className="text-left mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] text-xs font-mono font-bold text-[#0d0d0d] uppercase tracking-wider mb-3">
          Bagian 02 &bull; Panduan Pasang
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0d0d0d] sketch-display">
          CARA PASANG: {selectedPersona.name} &times; {selectedAgent.name}
        </h2>
        <p className="text-base sm:text-lg text-[#3a3a3a] sketch-serif mt-2 max-w-xl">
          Mau cara instan? Tinggal copas prompt ke AI lu. Atau kalau lebih suka manual, sikat langkah demi langkah di bawah.
        </p>
      </div>

      {/* Shortcut: Suruh AI Pasang Sendiri (ZIP / Prompt) */}
      <div className="mb-16 p-6 sketch-card bg-[#fff9f2] border-2 border-[#0d0d0d] shadow-[4px_4px_0_#ff6b2c]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono font-black uppercase px-3 py-1 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] text-[#0d0d0d]">
            Opsi Sat-Set &bull; Suruh AI Pasang Otomatis (via NPX / ZIP)
          </span>
          <a
            href={`https://www.npmjs.com/package/${packageName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono font-bold underline text-[#0d0d0d] hover:text-[#ff6b2c]"
          >
            Cek Paket ({packageName}) di NPM &rarr;
          </a>
        </div>
        <p className="text-xs sm:text-sm text-[#3a3a3a] mb-3 leading-relaxed">
          Mager ngetik perintah di terminal? Copas aja prompt sakti ini langsung ke chat {selectedAgent.name} lu:
        </p>
        <div className="bg-[#141414] rounded-xl p-4 border-2 border-[#0d0d0d] font-mono text-xs relative">
          <pre className="text-[#ffd23f] overflow-x-auto whitespace-pre-wrap leading-relaxed pr-20">
            {aiSelfInstallPrompt}
          </pre>
          <button
            type="button"
            onClick={copyPrompt}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-[#ffd23f] hover:bg-[#ff6b2c] hover:text-white text-[#0d0d0d] font-bold border border-[#0d0d0d] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alternating (Zig-Zag Kanan-Kiri) Roadmap Container */}
      <div className="relative">
        
        {/* Central Vertical Spine (Desktop center, mobile left) */}
        <div className="absolute left-5 md:left-1/2 top-4 bottom-4 border-l-2 border-dashed border-[#0d0d0d]/50 -translate-x-1/2 pointer-events-none" />

        <div className="space-y-12">
          {steps.map((step, idx) => {
            const isLeft = step.side === "left";

            return (
              <div key={step.num} className="relative flex flex-col md:flex-row items-center">
                
                {/* Milestone Node on the Spine (Pure number, NO icons/emojis) */}
                <div className="absolute left-5 md:left-1/2 -translate-x-1/2 top-5 w-9 h-9 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] flex items-center justify-center font-mono text-xs font-black text-[#0d0d0d] z-10">
                  {step.num}
                </div>

                {/* Card Container - Alternating Left / Right */}
                <div
                  className={`w-full pl-14 md:pl-0 md:w-[45%] ${
                    isLeft ? "md:mr-auto" : "md:ml-auto"
                  }`}
                >
                  <div className="p-6 sketch-card sketch-card-hover bg-white text-left">
                    
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-mono font-bold text-white bg-[#ff6b2c] border-[1.5px] border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] px-2.5 py-0.5 rounded-full">
                        {step.phase}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#525252] bg-[#faf7f0] border border-[#0d0d0d]/30 px-2 py-0.5 rounded">
                        {step.badge}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-[#0d0d0d] font-mono mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed mb-4">
                      {step.desc}
                    </p>

                    {/* Code Snippet Box */}
                    <div className="bg-[#141414] rounded-xl p-3.5 border-2 border-[#0d0d0d] font-mono text-xs relative">
                      <pre className="text-[#ffd23f] overflow-x-auto whitespace-pre-wrap leading-relaxed pr-8">
                        {step.code}
                      </pre>
                      
                      {/* Copy Button */}
                      <button
                        onClick={() => copyCode(step.code, idx)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-[#ffd23f] hover:bg-[#ff6b2c] hover:text-white text-[#0d0d0d] border border-[#0d0d0d] transition-colors cursor-pointer"
                        title="Salin Perintah"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Outcome Tag */}
                    <div className="mt-3 text-xs font-mono font-bold text-[#3f8b2b]">
                      &bull; {step.outcome}
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Update & Clean Rollback Notes */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        <div className="p-6 sketch-card bg-[#fff9f2] flex flex-col justify-between gap-4">
          <div>
            <span className="text-[#0d0d0d] font-black text-sm block mb-1">
              Mau Update ke Versi Terbaru?
            </span>
            <span className="text-[#525252] text-xs leading-relaxed block">
              Ada update baru? Tinggal gas perintah update ini ke folder project lu:
            </span>
          </div>
          <code className="bg-[#141414] px-3.5 py-2.5 rounded-lg text-[#ffd23f] border-2 border-[#0d0d0d] block overflow-x-auto">
            npx {packageName} update --target .
          </code>
        </div>

        <div className="p-6 sketch-card bg-[#fff9f2] flex flex-col justify-between gap-4">
          <div>
            <span className="text-[#0d0d0d] font-black text-sm block mb-1">
              Mau Bersih-Bersih / Uninstall?
            </span>
            <span className="text-[#525252] text-xs leading-relaxed block">
              Bosen atau mau balikin ke awal? Jalankan uninstall. Cuma blok &amp; file {selectedPersona.name} yang dicabut, kodingan asli lu dijamin aman tanpa lecet.
            </span>
          </div>
          <code className="bg-[#141414] px-3.5 py-2.5 rounded-lg text-[#ffd23f] border-2 border-[#0d0d0d] block overflow-x-auto">
            npx {packageName} uninstall --target .
          </code>
        </div>
      </div>

    </section>
  );
}
