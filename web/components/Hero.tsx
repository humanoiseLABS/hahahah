"use client";

import DoodleCrewFooter, { CrewMember } from "@/components/ui/doodle-crew-footer";

const HERO_CREW: CrewMember[] = [
  {
    kind: "yeti",
    name: "Si +62",
    letter: 0,
    seat: "front",
    offset: -0.32,
    scale: 1.02,
    says: "Langsung ke baris bug-nya, jangan basa-basi!",
  },
  {
    kind: "bird",
    name: "Si Cepat",
    letter: 1,
    seat: "top",
    offset: -0.31,
    scale: 0.92,
    says: "-51.2% teks di layar, hemat scroll!",
  },
  {
    kind: "mushroom",
    name: "Token-Maxxing",
    letter: 2,
    seat: "front",
    offset: 0.14,
    scale: 0.95,
    says: "Stop yapping, start token-maxxing! Hemat 80% token!",
  },
  {
    kind: "kid",
    name: "Surgical Diff",
    letter: 5,
    seat: "top",
    offset: 0,
    scale: 0.96,
    says: "Second Brain + Surgical Diff: zero token waste!",
  },
  {
    kind: "ghost",
    name: "Guardrail",
    letter: 7,
    seat: "behind",
    offset: 0,
    scale: 0.94,
    says: "5/5 prompt injection mental semua!",
  },
  {
    kind: "cat",
    name: "Kucing CLI",
    letter: 8,
    seat: "front",
    offset: 0.42,
    flip: true,
    scale: 0.96,
    says: "npx token-maxxing doctor — 100% sehat meong!",
  },
];

export default function Hero() {
  return (
    <section className="relative pt-12 pb-20 sm:pb-28 overflow-hidden">
      <DoodleCrewFooter
        wordmark="HUMANOISE"
        tagline=""
        hideTop
        hideBottom
        height="auto"
        preset="paper"
        doodleCount={8}
        crew={HERO_CREW}
        actions={[
          {
            label: "Pilih Mode & Harness",
            href: "#integrations",
            icon: "bolt",
            variant: "solid",
          },
          {
            label: "Bongkar Racikan Token-Maxxing ↗",
            href: "https://github.com/humanoiseLABS/token-maxxing",
            icon: "flame",
            variant: "outline",
          },
          {
            label: "Intip Dapur +62 & Kasih Star ↗",
            href: "https://github.com/humanoiseLABS/hahahah",
            icon: "star",
            variant: "outline",
          },
        ]}
      />

      {/* GitHub Lab Exploration Teaser */}
      <div className="max-w-[1280px] mx-auto px-6 mt-2 pb-4 flex justify-center relative z-10">
        <a
          href="https://github.com/humanoiseLABS"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#fffdf9] hover:bg-[#ffd23f]/25 border-2 border-dashed border-[#0d0d0d]/35 hover:border-[#0d0d0d] text-xs font-bold text-[#0d0d0d]/80 hover:text-[#0d0d0d] transition-all"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
          <span>Penasaran cara kerjanya? Eksplor lab</span>
          <span className="font-extrabold text-[#0d0d0d] underline decoration-[#ff6b2c] decoration-2 underline-offset-2">
            @humanoiseLABS di GitHub
          </span>
          <span className="text-[#0d0d0d]/65 group-hover:text-[#0d0d0d] transition-colors">
            — bedah source code, fork racikan prompt, & kasih ★!
          </span>
        </a>
      </div>
    </section>
  );
}
