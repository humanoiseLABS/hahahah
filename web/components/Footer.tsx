"use client";

import DoodleCrewFooter, { CrewMember } from "@/components/ui/doodle-crew-footer";

const HUMANOISE_CREW: CrewMember[] = [
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
    name: "Anti-Yapping",
    letter: 2,
    seat: "front",
    offset: 0.14,
    scale: 0.95,
    says: "Surgical diffs: to the point & hemat token!",
  },
  {
    kind: "kid",
    name: "Surgical Diff",
    letter: 5,
    seat: "top",
    offset: 0,
    scale: 0.96,
    says: "Zero ceremonial boilerplate, anti-yapping full!",
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
    says: "npx anti-yapping doctor — 100% sehat meong!",
  },
];

export default function Footer() {
  return (
    <div className="w-full sketch-divider">
      <DoodleCrewFooter
        wordmark="HUMANOISE"
        brand="humanoise"
        blurb="Lab eksperimen instruksi & guardrails untuk AI coding agent: Anti-Yapping (surgical diffs & hemat token ekstrem) dan +62 Mode (partner ngoding lokal yang blak-blakan & anti-basa-basi)."
        tagline="Bikin coding agent lu berhenti yapping dan langsung ke inti kode."
        preset="paper"
        crew={HUMANOISE_CREW}
        columns={[
          {
            title: "Mode & Produk",
            links: [
              { label: "Anti-Yapping (Surgical Diffs)", href: "https://github.com/humanoiseLABS/anti-yapping" },
              { label: "+62 Mode (Bloko Suto)", href: "https://github.com/humanoiseLABS/hahahah" },
              { label: "Pilih Mode & Harness", href: "#integrations" },
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
              { label: "GitHub @humanoiseLABS", href: "https://github.com/humanoiseLABS" },
              { label: "Buka Issue / Bug", href: "https://github.com/humanoiseLABS/hahahah/issues" },
              { label: "Kirim Pull Request", href: "https://github.com/humanoiseLABS/hahahah/pulls" },
              { label: "Lisensi MIT", href: "https://github.com/humanoiseLABS/hahahah/blob/main/LICENSE" },
            ],
          },
        ]}
        actions={[
          {
            label: "Repo Anti-Yapping",
            href: "https://github.com/humanoiseLABS/anti-yapping",
            icon: "flame",
            variant: "outline",
          },
          {
            label: "Repo +62 Mode",
            href: "https://github.com/humanoiseLABS/hahahah",
            icon: "star",
            variant: "solid",
          },
        ]}
        copyright="© 2026 HUMANOISE Labs. Dibikin buat developer Indonesia."
        legal={[
          { label: "humanoiseLABS", href: "https://github.com/humanoiseLABS" },
          { label: "Lisensi MIT", href: "https://github.com/humanoiseLABS/hahahah/blob/main/LICENSE" },
        ]}
        socials={[
          { label: "Anti-Yapping", href: "https://github.com/humanoiseLABS/anti-yapping" },
          { label: "+62 Mode", href: "https://github.com/humanoiseLABS/hahahah" },
        ]}
      />
    </div>
  );
}
