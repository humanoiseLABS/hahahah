"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Configurator, {
  PersonaOption,
  AgentOption,
  PERSONAS,
  AGENTS,
} from "@/components/Configurator";
import InstallationGuide from "@/components/InstallationGuide";
import SupportSection from "@/components/SupportSection";
import Footer from "@/components/Footer";

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption | null>(PERSONAS[0]);
  const [selectedAgent, setSelectedAgent] = useState<AgentOption | null>(AGENTS[0]);
  const [copied, setCopied] = useState(false);

  const activePersona = selectedPersona ?? PERSONAS[0];
  const activeAgent = selectedAgent ?? AGENTS[0];

  // Compute generated command
  const generatedCommand =
    activeAgent.id === "claude-code"
      ? `npx hahahah-ai install --profile ${activePersona.id} --target .`
      : activeAgent.id === "antigravity"
        ? `npx hahahah-ai install --profile ${activePersona.id} --adapter antigravity --target ~/.gemini --scope global`
        : `npx hahahah-ai install --profile ${activePersona.id} ${activeAgent.adapterFlag} --target .`;

  const copyCommand = () => {
    if (!generatedCommand) return;
    navigator.clipboard.writeText(generatedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      {/* Section 2: Tutorial Roadmap */}
      <InstallationGuide
        selectedPersona={activePersona}
        selectedAgent={activeAgent}
        generatedCommand={generatedCommand}
      />

      {/* Section 3: Halaman Support */}
      <SupportSection />
      
      <Footer />
    </main>
  );
}
