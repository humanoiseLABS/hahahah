"use client";

import DoodleCrewFooter, { CrewMember } from "@/components/ui/doodle-crew-footer";

const HERO_CREW: CrewMember[] = [
  {
    kind: "yeti",
    name: "Si +62",
    letter: 0,
    seat: "front",
    offset: -0.34,
    scale: 1.05,
    says: "Langsung ke baris bug-nya, jangan basa-basi!",
  },
  {
    kind: "bird",
    name: "Si Cepat",
    letter: 1,
    seat: "top",
    offset: -0.02,
    scale: 0.9,
    says: "-51.2% teks di layar, hemat scroll!",
  },
  {
    kind: "mushroom",
    name: "Anti-Yapping",
    letter: 2,
    seat: "behind",
    offset: 0.08,
    scale: 0.96,
    says: "Ponytail surgical diffs: to the point & hemat token!",
  },
  {
    kind: "kid",
    name: "Surgical Diff",
    letter: 3,
    seat: "top",
    offset: 0,
    scale: 0.96,
    says: "Zero ceremonial boilerplate, anti-yapping full!",
  },
  {
    kind: "ghost",
    name: "Guardrail",
    letter: 5,
    seat: "behind",
    offset: 0,
    scale: 0.94,
    says: "5/5 prompt injection mental semua!",
  },
  {
    kind: "cat",
    name: "Kucing CLI",
    letter: 6,
    seat: "top",
    offset: 0.14,
    scale: 0.92,
    says: "npx hahahah-ai doctor — 100% sehat meong!",
  },
];

export default function Hero() {
  return (
    <section className="relative pt-10 pb-6 overflow-hidden">
      <DoodleCrewFooter
        wordmark="HAHAHAH"
        tagline=""
        hideTop
        hideBottom
        height="auto"
        preset="paper"
        crew={HERO_CREW}
        actions={[
          {
            label: "Pilih Mode & Harness",
            href: "#integrations",
            icon: "bolt",
            variant: "solid",
          },
          {
            label: "Bongkar Racikan Anti-Yapping ↗",
            href: "https://github.com/humanoiseLABS/anti-yapping",
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
      <div className="max-w-[1280px] mx-auto px-6 -mt-3 pb-2 flex justify-center relative z-10">
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
