"use client";

import DoodleCrewFooter, { CrewMember } from "@/components/ui/doodle-crew-footer";

const HAHAHAH_CREW: CrewMember[] = [
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

export default function Footer() {
  return (
    <div className="w-full sketch-divider">
      <DoodleCrewFooter
        wordmark="HAHAHAH"
        brand="hahahah"
        blurb="Persona lokal budaya developer Nusantara buat coding agent lu. Zero basa-basi korporat, pangkas reasoning dump, dan teruji kebal prompt injection."
        tagline="Bikin coding agent lu ga kaku lagi pas diajak mikir bareng."
        preset="paper"
        crew={HAHAHAH_CREW}
        columns={[
          {
            title: "Persona & Mode",
            links: [
              { label: "+62 Mode (Bloko Suto)", href: "#integrations" },
              { label: "Anti-Yapping (Hemat Ekstrem)", href: "https://github.com/humanoiseLABS/anti-yapping" },
              { label: "Katalog Budaya", href: "https://github.com/humanoiseLABS/hahahah/tree/main/culture" },
            ],
          },
          {
            title: "Coding Agent",
            links: [
              { label: "Claude Code", href: "#integrations" },
              { label: "Google Antigravity", href: "#integrations" },
              { label: "OpenCode", href: "#integrations" },
              { label: "Cursor & Windsurf", href: "#integrations" },
            ],
          },
          {
            title: "Dokumentasi",
            links: [
              { label: "Cara Pasang", href: "#integrations" },
              { label: "Riset & Benchmark", href: "https://github.com/humanoiseLABS/hahahah/tree/main/docs" },
              { label: "Evaluasi Keamanan", href: "https://github.com/humanoiseLABS/hahahah/tree/main/eval" },
              { label: "Tanya Jawab (FAQ)", href: "#support" },
            ],
          },
          {
            title: "Komunitas",
            links: [
              { label: "GitHub Repository", href: "https://github.com/humanoiseLABS/hahahah" },
              { label: "Buka Issue / Bug", href: "https://github.com/humanoiseLABS/hahahah/issues" },
              { label: "Kirim Pull Request", href: "https://github.com/humanoiseLABS/hahahah/pulls" },
              { label: "Lisensi MIT", href: "https://github.com/humanoiseLABS/hahahah/blob/main/LICENSE" },
            ],
          },
        ]}
        actions={[
          {
            label: "Download .ZIP",
            href: "https://github.com/humanoiseLABS/hahahah/archive/refs/heads/main.zip",
            icon: "sandwich",
            variant: "outline",
          },
          {
            label: "Kasih Star di GitHub",
            href: "https://github.com/humanoiseLABS/hahahah",
            icon: "star",
            variant: "solid",
          },
        ]}
        copyright="© 2026 HAHahah Nusantara Edition. Dibikin buat developer Indonesia."
        legal={[
          { label: "README.md", href: "https://github.com/humanoiseLABS/hahahah/blob/main/README.md" },
          { label: "Lisensi MIT", href: "https://github.com/humanoiseLABS/hahahah/blob/main/LICENSE" },
        ]}
        socials={[
          { label: "GitHub", href: "https://github.com/humanoiseLABS/hahahah" },
          { label: "Issues", href: "https://github.com/humanoiseLABS/hahahah/issues" },
        ]}
      />
    </div>
  );
}
