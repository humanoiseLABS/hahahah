"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Configurator, {
  PersonaOption,
  AgentOption,
} from "@/components/Configurator";
import InstallationGuide from "@/components/InstallationGuide";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentOption | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute generated command if both are selected
  const generatedCommand =
    selectedPersona && selectedAgent
      ? selectedPersona.id === "token-maxxing"
        ? selectedAgent.id === "claude-code"
          ? `npx @humanoiselabs/token-maxxing install --target .`
          : selectedAgent.id === "antigravity"
            ? `npx @humanoiselabs/token-maxxing install --adapter antigravity --target ~/.gemini --scope global`
            : `npx @humanoiselabs/token-maxxing install ${selectedAgent.adapterFlag} --target .`
        : selectedAgent.id === "claude-code"
          ? `npx @humanoiselabs/plus62 install --target .`
          : selectedAgent.id === "antigravity"
            ? `npx @humanoiselabs/plus62 install --adapter antigravity --target ~/.gemini --scope global`
            : `npx @humanoiselabs/plus62 install ${selectedAgent.adapterFlag} --target .`
      : "";

  const copyCommand = () => {
    if (!generatedCommand) return;
    navigator.clipboard.writeText(generatedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = selectedPersona !== null && selectedAgent !== null;

  return (
    <main className="min-h-screen bg-sketch-paper text-[#0d0d0d] relative">
      <Navbar />
      <Hero />
      
      {/* Section: Integrasi & Pemilihan Personalitas/Agent (Side-by-side) */}
      <Configurator
        selectedPersona={selectedPersona}
        setSelectedPersona={(p) => {
          setSelectedPersona(p);
        }}
        selectedAgent={selectedAgent}
        setSelectedAgent={(a) => {
          setSelectedAgent(a);
        }}
        copied={copied}
        copyCommand={copyCommand}
        generatedCommand={generatedCommand}
      />

      {/* Section 2: Tutorial Roadmap (Selalu ada di DOM untuk menjamin keandalan anchor #tutorial) */}
      <section id="tutorial" className="scroll-mt-20">
        {isConfigured ? (
          <InstallationGuide
            selectedPersona={selectedPersona}
            selectedAgent={selectedAgent}
            generatedCommand={generatedCommand}
          />
        ) : (
          <div className="py-16 px-6 max-w-4xl mx-auto text-center sketch-card bg-white/90 border-2 border-dashed border-[#0d0d0d]/30 my-12">
            <h3 className="text-2xl font-black text-[#0d0d0d] font-mono mb-2">
              Belum Memilih Persona atau Agen
            </h3>
            <p className="text-sm text-[#3a3a3a] mb-6">
              Pilih salah satu mode (+62 Mode atau Token-Maxxing) dan agen AI lu di atas untuk memunculkan panduan langkah demi langkah yang presisi.
            </p>
            <a
              href="#integrations"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[3px_3px_0_#0d0d0d] font-mono font-bold text-sm text-[#0d0d0d] hover:bg-[#ffea79] transition-all"
            >
              Pilih Mode &amp; Agen Sekarang &uarr;
            </a>
          </div>
        )}
      </section>

      {/* Section 3: Halaman Support */}
      <SupportSection />
      
      <Footer />
    </main>
  );
}
