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

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      num: "01",
      phase: "Fase 01",
      badge: "Clone Workspace",
      title: "Ambil Source Code",
      desc: "Kloning repository resmi HAHahah dari GitHub dan masuk ke folder proyek.",
      code: "git clone https://github.com/ALIVEbyHUMANOISE/hahahah.git\ncd hahahah",
      outcome: "Repository terkloning di folder lokal",
      side: "left",
    },
    {
      num: "02",
      phase: "Fase 02",
      badge: "Toolchain Build",
      title: "Persiapkan Dependensi & Tipe",
      desc: "Install dependensi secara immutable dan jalankan static typecheck TypeScript.",
      code: "npm ci\nnpm run typecheck",
      outcome: "Dependencies terpasang & 0 type error",
      side: "right",
    },
    {
      num: "03",
      phase: "Fase 03",
      badge: "Injeksi Persona",
      title: `Pasang ${selectedPersona.name} ke ${selectedAgent.name}`,
      desc: `Jalankan instalasi persona ${selectedPersona.name} khusus untuk adapter ${selectedAgent.name} ke project target Anda.`,
      code: generatedCommand,
      outcome: `Managed-block & konfigurasi ${selectedAgent.whatItWrites} terpasang`,
      side: "left",
    },
    {
      num: "04",
      phase: "Fase 04",
      badge: "Validasi Doctor",
      title: "Pemeriksaan Integritas",
      desc: "Jalankan CLI doctor untuk memastikan manifest, hash berkas, dan penempatan file valid.",
      code: "node src/cli.ts doctor --target .",
      outcome: "Integritas manifest diverifikasi 100%",
      side: "right",
    },
    {
      num: "05",
      phase: "Fase 05",
      badge: "Siap Digunakan",
      title: "Mulai Koding Bersama Agent",
      desc: `Buka ${selectedAgent.name} pada project Anda. Agent kini aktif dengan karakter ${selectedPersona.name} dan efisiensi token.`,
      code: `# Jalankan agent Anda seperti biasa di folder proyek target:\nclaude  # atau agy / opencode / cursor`,
      outcome: "Persona aktif & reasoning dump dipangkas",
      side: "left",
    },
  ];

  return (
    <section id="tutorial" className="py-24 px-6 max-w-5xl mx-auto sketch-divider">
      
      {/* Section Header */}
      <div className="text-left mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] text-xs font-mono font-bold text-[#0d0d0d] uppercase tracking-wider mb-3">
          Bagian 02 &bull; Roadmap Instalasi
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0d0d0d] sketch-display">
          ROADMAP: {selectedPersona.name} &times; {selectedAgent.name}
        </h2>
        <p className="text-base sm:text-lg text-[#3a3a3a] sketch-serif mt-2 max-w-xl">
          Ikuti alur sketsa langkah demi langkah dari persiapan berkas hingga coding agent siap diajak ngobrol di terminal.
        </p>
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

      {/* Clean Rollback Note */}
      <div className="mt-16 p-6 sketch-card bg-[#fff9f2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
        <div>
          <span className="text-[#0d0d0d] font-black text-sm block mb-1">
            Ingin Mencopot Pemasangan?
          </span>
          <span className="text-[#525252] text-xs">
            Jalankan perintah uninstall. Hanya berkas manifest HAHahah yang dibersihkan, tanpa merusak konfigurasi lain.
          </span>
        </div>
        <code className="bg-[#141414] px-3.5 py-2 rounded-lg text-[#ffd23f] border-2 border-[#0d0d0d] shrink-0">
          node src/cli.ts uninstall --target .
        </code>
      </div>

    </section>
  );
}
