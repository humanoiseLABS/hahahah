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

      {/* Section 2: Tutorial Roadmap (HANYA MUNCUL KETIKA PERSONALITAS & AGENT TELAH DIPILIH) */}
      {isConfigured && (
        <InstallationGuide
          selectedPersona={selectedPersona}
          selectedAgent={selectedAgent}
          generatedCommand={generatedCommand}
        />
      )}

      {/* Section 3: Halaman Support */}
      <SupportSection />
      
      <Footer />
    </main>
  );
}
