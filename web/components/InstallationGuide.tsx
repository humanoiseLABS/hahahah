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

  const targetPath =
    selectedAgent.id === "antigravity" ? "~/.gemini" : "/path/ke/project-lu";

  const workspaceCommand =
    selectedAgent.id === "claude-code"
      ? `npx -y hahahah-ai install --profile ${selectedPersona.id} --target .`
      : `npx -y hahahah-ai install --profile ${selectedPersona.id} ${selectedAgent.adapterFlag} --target .`;

  const aiSelfInstallPrompt = `Tolong jalankan perintah CLI berikut di terminal pada direktori project ini:\n\n${workspaceCommand}\n\nSetelah selesai, jalankan \`npx -y hahahah-ai doctor --target .\` untuk memverifikasi manifest, lalu baca file konfigurasi yang baru dibuat (CLAUDE.md / AGENTS.md) dan gunakan gaya bahasa Indonesia santai sesuai instruksi di dalamnya.`;

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
      phase: "Fase 01",
      badge: "Buka Workspace",
      title: "Masuk ke Folder Project",
      desc: "Buka terminal di direktori project kodingan Anda. Tidak perlu git clone repo HAHahah karena paket resmi sudah tersedia di NPM.",
      code: "cd /path/ke/project-lu",
      outcome: "Terminal berada di folder project tujuan",
      side: "left",
    },
    {
      num: "02",
      phase: "Fase 02",
      badge: "Simulasi Dry-Run",
      title: "Cek Rencana & Budget Token (Opsional)",
      desc: "Lihat daftar file yang akan dibuat serta estimasi pemakaian token tanpa mengubah isi folder project Anda.",
      code: `${generatedCommand} --dry-run`,
      outcome: "Rencana instalasi & budget token terverifikasi aman",
      side: "right",
    },
    {
      num: "03",
      phase: "Fase 03",
      badge: "Injeksi Persona",
      title: `Pasang ${selectedPersona.name} ke ${selectedAgent.name}`,
      desc:
        selectedAgent.id === "antigravity"
          ? `Pasang secara global ke ~/.gemini agar aktif di semua project Antigravity Anda (atau hilangkan --scope global untuk per-project).`
          : `Jalankan satu perintah npx di bawah untuk menyuntikkan persona langsung ke project Anda:`,
      code: generatedCommand,
      outcome: `Managed-block & konfigurasi ${selectedAgent.whatItWrites} terpasang di project tujuan`,
      side: "left",
    },
    {
      num: "04",
      phase: "Fase 04",
      badge: "Validasi Doctor",
      title: "Pemeriksaan Integritas",
      desc: "Jalankan CLI doctor untuk memastikan manifest, hash berkas, dan penempatan file valid.",
      code:
        selectedAgent.id === "antigravity"
          ? "npx hahahah-ai doctor --target ~/.gemini"
          : "npx hahahah-ai doctor --target .",
      outcome: "Integritas manifest diverifikasi 100%",
      side: "right",
    },
    {
      num: "05",
      phase: "Fase 05",
      badge: "Siap Digunakan",
      title: "Mulai Koding Bersama Agent",
      desc: `Buka ${selectedAgent.name} di project Anda. Agent kini langsung aktif dengan karakter ${selectedPersona.name}!`,
      code: `# Jalankan agent Anda di folder project:\nclaude  # atau buka di Qoder / Antigravity / OpenCode / Cursor`,
      outcome: "Persona aktif penuh sejak chat pertama",
      side: "left",
    },
  ];

  return (
    <section id="tutorial" className="py-24 px-6 max-w-5xl mx-auto sketch-divider">
      
      {/* Section Header */}
      <div className="text-left mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] text-xs font-mono font-bold text-[#0d0d0d] uppercase tracking-wider mb-3">
          Bagian 02 &bull; Roadmap Instalasi
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0d0d0d] sketch-display">
          ROADMAP: {selectedPersona.name} &times; {selectedAgent.name}
        </h2>
        <p className="text-base sm:text-lg text-[#3a3a3a] sketch-serif mt-2 max-w-xl">
          Pilih cara instan (suruh AI pasang otomatis dari ZIP/repo) atau ikuti alur CLI langkah demi langkah di bawah.
        </p>
      </div>

      {/* Shortcut: Suruh AI Pasang Sendiri (ZIP / Prompt) */}
      <div className="mb-16 p-6 sketch-card bg-[#fff9f2] border-2 border-[#0d0d0d] shadow-[4px_4px_0_#ff6b2c]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono font-black uppercase px-3 py-1 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] text-[#0d0d0d]">
            Opsi Instan &bull; Suruh AI Pasang Otomatis (via NPX / ZIP)
          </span>
          <a
            href="https://www.npmjs.com/package/hahahah-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono font-bold underline text-[#0d0d0d] hover:text-[#ff6b2c]"
          >
            Lihat Paket di NPM &rarr;
          </a>
        </div>
        <p className="text-xs sm:text-sm text-[#3a3a3a] mb-3 leading-relaxed">
          <strong>Penting:</strong> Command <code>npx hahahah-ai ...</code> di atas aslinya dijalankan di <strong>Terminal / CMD / PowerShell</strong>. Tapi kalau mau nyuruh AI yang ngetikin di dalam <strong>folder project</strong>, salin prompt aman (anti-mental guardrail) di bawah ini ke chat {selectedAgent.name}:
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
                <span>Tersalin</span>
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
              Cara Update ke Versi Terbaru
            </span>
            <span className="text-[#525252] text-xs leading-relaxed block">
              Saat ada rilis pembaruan HAHahah, cukup tarik kode terbaru lalu jalankan perintah update ke project tujuan:
            </span>
          </div>
          <code className="bg-[#141414] px-3.5 py-2.5 rounded-lg text-[#ffd23f] border-2 border-[#0d0d0d] block overflow-x-auto">
            npx hahahah-ai update --target .
          </code>
        </div>

        <div className="p-6 sketch-card bg-[#fff9f2] flex flex-col justify-between gap-4">
          <div>
            <span className="text-[#0d0d0d] font-black text-sm block mb-1">
              Ingin Mencopot Pemasangan?
            </span>
            <span className="text-[#525252] text-xs leading-relaxed block">
              Jalankan perintah uninstall. Hanya berkas manifest HAHahah yang dibersihkan, tanpa merusak file lain.
            </span>
          </div>
          <code className="bg-[#141414] px-3.5 py-2.5 rounded-lg text-[#ffd23f] border-2 border-[#0d0d0d] block overflow-x-auto">
            npx hahahah-ai uninstall --target .
          </code>
        </div>
      </div>

    </section>
  );
}
