"use client";

import { useState } from "react";
import { Check, Copy, Terminal, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import { IntegrationVisualGrid } from "@/components/ui/integrations-4";

export interface PersonaOption {
  id: string;
  name: string;
  code: string;
  badge: string;
  tagline: string;
  tone: string;
  samplePrompt: string;
  sampleReply: string;
}

export interface AgentOption {
  id: string;
  name: string;
  adapterFlag: string;
  whatItWrites: string;
  status: string;
}

export const PERSONAS: PersonaOption[] = [
  {
    id: "anti-yapping",
    name: "Anti-Yapping",
    code: "anti-yap",
    badge: "Surgical Diffs • Hemat Token",
    tagline: "Jawaban telegrafis di baris 1, Ponytail surgical diffs (anti dump 1 file utuh), hemat token output hingga 80%.",
    tone: "Flat & telegrafis: tanpa sapaan, tanpa emoji, hanya kirim baris kode yang berubah.",
    samplePrompt: "Kode ini kok error 'Cannot read properties of undefined' ya?",
    sampleReply:
      "user.profile masih null pas fetch awal. Ganti jadi user?.profile?.name atau kasih fallback default {}.",
  },
  {
    id: "rusuh-id",
    name: "+62 Mode",
    code: "+62",
    badge: "Bloko Suto • Partner Lokal",
    tagline: "Gaya rekan satu tim lokal +62 yang blak-blakan, langsung ke baris bug, lengkap dengan kamus budaya & safety guardrails.",
    tone: "Indonesian informal, cepat, langsung ke baris kode yang rusak tanpa basa-basi korporat.",
    samplePrompt: "Kode ini kok error 'Cannot read properties of undefined' ya?",
    sampleReply:
      "Ya jelas error, kamu memanggil user.profile.name padahal saat fetch awal datanya masih null. Tambahkan optional chaining user?.profile?.name atau sediakan fallback default object.",
  },
];

export const AGENTS: AgentOption[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    adapterFlag: "",
    whatItWrites: "CLAUDE.md + .claude/skills/",
    status: "Verified",
  },
  {
    id: "antigravity",
    name: "Google Antigravity",
    adapterFlag: "--adapter antigravity",
    whatItWrites: "AGENTS.md + .agents/rules/",
    status: "Documented",
  },
  {
    id: "opencode",
    name: "OpenCode",
    adapterFlag: "--adapter opencode",
    whatItWrites: "AGENTS.md + .claude/skills/",
    status: "Verified",
  },
  {
    id: "qoder",
    name: "Qoder",
    adapterFlag: "--adapter qoder",
    whatItWrites: "AGENTS.md + .qoder/skills/",
    status: "Documented",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    adapterFlag: "--adapter agents-md",
    whatItWrites: "AGENTS.md + .agents/skills/",
    status: "Documented",
  },
  {
    id: "hermes",
    name: "Hermes Coding Agent",
    adapterFlag: "--adapter agents-md",
    whatItWrites: "AGENTS.md + .agents/skills/",
    status: "Supported",
  },
  {
    id: "deepseek",
    name: "DeepSeek Harness",
    adapterFlag: "--adapter agents-md",
    whatItWrites: "AGENTS.md + .agents/skills/",
    status: "Supported",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    adapterFlag: "--adapter agents-md",
    whatItWrites: "AGENTS.md + .agents/skills/",
    status: "Supported",
  },
  {
    id: "cursor",
    name: "Cursor",
    adapterFlag: "--adapter agents-md",
    whatItWrites: "AGENTS.md + .agents/skills/",
    status: "Documented",
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    adapterFlag: "--adapter copilot",
    whatItWrites: ".github/copilot-instructions.md",
    status: "Always-On",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    adapterFlag: "--adapter agents-md",
    whatItWrites: "AGENTS.md + .agents/skills/",
    status: "Supported",
  },
];

interface ConfiguratorProps {
  selectedPersona: PersonaOption | null;
  setSelectedPersona: (p: PersonaOption) => void;
  selectedAgent: AgentOption | null;
  setSelectedAgent: (a: AgentOption) => void;
  copied: boolean;
  copyCommand: () => void;
  generatedCommand: string;
}

export default function Configurator({
  selectedPersona,
  setSelectedPersona,
  selectedAgent,
  setSelectedAgent,
  copied,
  copyCommand,
  generatedCommand,
}: ConfiguratorProps) {
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const isBothSelected = selectedPersona !== null && selectedAgent !== null;

  const handleSelectPersona = (p: PersonaOption) => {
    setSelectedPersona(p);
    // Otomatis switch ke Fase 2 (Pilih Coding Harness) setelah memilih persona
    setActiveStep(2);
  };

  const handleTileSelect = (agentId: string) => {
    let targetId = agentId;
    if (agentId === "anthropic") targetId = "claude-code";
    if (agentId === "vscode") targetId = "copilot";

    const found = AGENTS.find((a) => a.id === targetId || a.id === agentId);
    if (found) {
      setSelectedAgent(found);
      if (selectedPersona) {
        setActiveStep(2);
      }
    }
  };

  return (
    <section id="integrations" className="py-20 px-6 max-w-5xl mx-auto sketch-divider">
      
      {/* Section Header */}
      <div className="mb-10">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#8fdcff] border-[1.5px] border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] text-[11px] font-mono font-bold text-[#0d0d0d] uppercase tracking-wider mb-2.5">
          01 &bull; Konfigurasi Santai
        </span>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[#0d0d0d] sketch-display">
          Pilih Mode &amp; Coding Harness
        </h2>
        <p className="text-sm sm:text-base text-[#525252] mt-1.5 max-w-xl">
          Tinggal 2 step simpel: pilih mode HUMANOISE yang lu butuhin (<strong>Anti-Yapping</strong> atau <strong>+62 Mode</strong>), terus tentuin coding harness yang lu pake.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Sequential Step Switcher (Vertical Stack) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Step Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2.5 p-1.5 rounded-xl bg-[#faf7f0] border-2 border-[#0d0d0d] shadow-[3px_3px_0_#0d0d0d]">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                activeStep === 1
                  ? "bg-[#ffd23f] text-[#0d0d0d] font-black border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d]"
                  : "bg-transparent text-[#525252] hover:text-[#0d0d0d] font-bold"
              }`}
            >
              <span className="truncate">1. Pilih Mode</span>
              {selectedPersona && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#0d0d0d] text-[#ffd23f] text-[10px] font-bold shrink-0">
                  {selectedPersona.code.toUpperCase()}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                activeStep === 2
                  ? "bg-[#ffd23f] text-[#0d0d0d] font-black border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d]"
                  : "bg-transparent text-[#525252] hover:text-[#0d0d0d] font-bold"
              }`}
            >
              <span className="truncate">2. Coding Harness</span>
              {selectedAgent && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#0d0d0d] text-white text-[10px] font-bold truncate max-w-[80px]">
                  {selectedAgent.name}
                </span>
              )}
            </button>
          </div>

          {/* FASE 1: Pilih Mode (Disusun ke Bawah) */}
          {activeStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold text-[#0d0d0d] uppercase tracking-wider">
                  Step 1 &bull; Pilih Mode HUMANOISE
                </span>
                <span className="text-[11px] font-mono text-[#737373]">
                  Klik buat lanjut &rarr;
                </span>
              </div>

              <div className="flex flex-col space-y-3">
                {PERSONAS.map((p) => {
                  const isActive = selectedPersona?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPersona(p)}
                      className={`w-full text-left p-4 rounded-xl border-2 border-[#0d0d0d] transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        isActive
                          ? "bg-[#ffd23f] text-[#0d0d0d] shadow-[4px_4px_0_#ff6b2c] -translate-y-0.5"
                          : "bg-white hover:bg-[#fff9f2] text-[#0d0d0d] shadow-[3px_3px_0_#0d0d0d] hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-[#0d0d0d] font-mono">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#faf7f0] border border-[#0d0d0d] text-[#0d0d0d]">
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#3a3a3a] leading-relaxed">
                          {p.tagline}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-[#0d0d0d] text-white flex items-center justify-center shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* FASE 2: Pilih Coding Harness (Disusun ke Bawah) */}
          {activeStep === 2 && (
            <div className="space-y-4">
              {/* Ringkasan Persona Terpilih + Tombol Kembali */}
              <div className="px-3.5 py-2.5 rounded-xl bg-[#fff9f2] border-2 border-[#0d0d0d] shadow-[3px_3px_0_#0d0d0d] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#525252]">Persona:</span>
                  {selectedPersona ? (
                    <span className="px-2 py-0.5 rounded bg-[#ffd23f] border border-[#0d0d0d] font-mono text-xs font-black text-[#0d0d0d]">
                      {selectedPersona.name} ({selectedPersona.badge})
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-[#ff6b2c] font-bold">
                      Belum dipilih
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#0d0d0d] hover:text-[#ff6b2c] underline cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Ganti Persona</span>
                </button>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold text-[#0d0d0d] uppercase tracking-wider">
                  Step 2 &bull; Pilih Coding Harness Lu
                </span>
                <span className="text-[11px] font-mono text-[#737373]">
                  Atau klik logo di kanan &rarr;
                </span>
              </div>

              {/* Daftar Coding Harness Disusun ke Bawah */}
              <div className="flex flex-col space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {AGENTS.map((a) => {
                  const isActive = selectedAgent?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAgent(a)}
                      className={`w-full px-4 py-3 rounded-xl border-2 border-[#0d0d0d] text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? "bg-[#0d0d0d] text-white shadow-[3px_3px_0_#ff6b2c]"
                          : "bg-white hover:bg-[#fff9f2] text-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs sm:text-sm font-bold truncate">
                          {a.name}
                        </div>
                        <div
                          className={`font-mono text-[11px] truncate ${
                            isActive ? "text-[#ffd23f]" : "text-[#737373]"
                          }`}
                        >
                          {a.whatItWrites}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isActive
                              ? "bg-[#ffd23f] text-[#0d0d0d] border-[#0d0d0d] font-bold"
                              : "bg-[#faf7f0] text-[#525252] border-[#0d0d0d]/30"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sleek Terminal Command Bar (Muncul Setelah Keduanya Dipilih) */}
          <div className="pt-2">
            {isBothSelected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 bg-[#141414] px-4 py-3 rounded-xl border-2 border-[#0d0d0d] shadow-[4px_4px_0_#0d0d0d] font-mono text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Terminal className="w-4 h-4 text-[#ff6b2c] shrink-0" />
                    <code className="text-[#ffd23f] truncate">{generatedCommand}</code>
                  </div>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="px-3 py-1.5 rounded-lg bg-[#ffd23f] hover:bg-[#ff6b2c] hover:text-white text-[#0d0d0d] font-bold border border-[#0d0d0d] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-[#525252] px-1 gap-2">
                  <span>
                    Racikan lu: <strong className="text-[#0d0d0d]">{selectedPersona.name}</strong> &times;{" "}
                    <strong className="text-[#0d0d0d]">{selectedAgent.name}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href={
                        selectedPersona.id === "anti-yapping"
                          ? "https://github.com/humanoiseLABS/anti-yapping"
                          : "https://github.com/humanoiseLABS/hahahah"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0d0d0d] font-bold hover:text-[#ff6b2c] underline flex items-center gap-1"
                    >
                      <span>Repo ({selectedPersona.id === "anti-yapping" ? "anti-yapping" : "hahahah"})</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                    <a href="#tutorial" className="text-[#ff6b2c] font-bold hover:underline flex items-center gap-1">
                      <span>Cara pasang</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl border-2 border-dashed border-[#0d0d0d]/25 bg-[#faf7f0]/70 text-center font-mono text-xs text-[#525252]">
                {!selectedPersona
                  ? "Step 1: Pilih dulu gaya persona di atas ya lur."
                  : "Step 2: Sekarang pilih coding harness lu di daftar atau klik logonya di kanan."}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: 5x5 Visual Harness Grid (12 Logos) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center pt-2">
          <IntegrationVisualGrid
            selectedAgentId={selectedAgent?.id}
            onSelectAgentId={handleTileSelect}
          />
          <div className="mt-4 text-center">
            {selectedAgent ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ffd23f] border-[1.5px] border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] font-mono text-xs font-bold text-[#0d0d0d]">
                <span>Harness: {selectedAgent.name}</span>
                <span className="text-[10px] font-normal opacity-80">({selectedAgent.status})</span>
              </span>
            ) : (
              <span className="text-xs font-mono text-[#737373]">
                12 Coding Harness Siap Dipasang (Klik ikon buat milih)
              </span>
            )}
          </div>
        </div>

      </div>

    </section>
  );
}
