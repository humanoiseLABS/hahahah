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
            label: "Repo Anti-Yapping",
            href: "https://github.com/humanoiseLABS/anti-yapping",
            icon: "sandwich",
            variant: "outline",
          },
          {
            label: "Repo +62 Mode",
            href: "https://github.com/humanoiseLABS/hahahah",
            icon: "star",
            variant: "outline",
          },
        ]}
      />
    </section>
  );
}
