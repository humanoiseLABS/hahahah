"use client";

import DoodleCrewFooter, { CrewMember } from "@/components/ui/doodle-crew-footer";

const HERO_CREW: CrewMember[] = [
  {
    kind: "yeti",
    name: "Bli Rusuh",
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
    name: "Pakde Jawa",
    letter: 2,
    seat: "behind",
    offset: 0.08,
    scale: 0.96,
    says: "Alon-alon waton kelakon, struktur rapi.",
  },
  {
    kind: "kid",
    name: "Santri Dev",
    letter: 3,
    seat: "top",
    offset: 0,
    scale: 0.96,
    says: "Bismillah, amanah & taat no-fatwa policy.",
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
    says: "node src/cli.ts doctor — 100% sehat meong!",
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
            label: "Pilih Persona & Harness",
            href: "#integrations",
            icon: "bolt",
            variant: "solid",
          },
          {
            label: "Download .ZIP",
            href: "https://github.com/humanoiseLABS/hahahah/archive/refs/heads/main.zip",
            icon: "sandwich",
            variant: "outline",
          },
          {
            label: "Star di GitHub",
            href: "https://github.com/humanoiseLABS/hahahah",
            icon: "star",
            variant: "outline",
          },
        ]}
      />
    </section>
  );
}
