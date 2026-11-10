"use client";

import { Heart, FileText, ExternalLink } from "lucide-react";
import { FaqSection } from "@/components/ui/faq-section";

const HUMANOISE_FAQS = [
  {
    question: "Apa bedanya HumanoiseLABS, +62 Mode, dan Token-Maxxing?",
    answer:
      "HumanoiseLABS adalah nama lab kita. Di dalamnya ada 2 mode yang bisa lu pilih sesuai kebutuhan: (1) +62 Mode (`npx plus62 install`) buat gaya partner ngoding lokal Indonesia (bloko suto) yang blak-blakan lengkap dengan kamus budaya Nusantara, dan (2) Token-Maxxing (`npx token-maxxing install` atau `tmx`) buat Second Brain memory, jawaban telegrafis baris pertama, 3D live visualizer, dan surgical diffs biar AI hemat token hingga 80%.",
  },
  {
    question: "Gimana efeknya ke konsumsi token & biaya API?",
    answer:
      "Kita blak-blakan ya: blok instruksi always-on cuma makan ~532 token (Token-Maxxing) atau ~538 token (+62 Mode). Khusus Token-Maxxing, ada triple token saver: (1) Second Brain memory graph memangkas input token 60-80%, (2) aturan surgical diffs memangkas output token hingga 80% (cuma nulis baris yang diedit), dan (3) generator .agentignore otomatis memblokir file raksasa (build artifacts, keystores, lockfiles) agar context window tidak cepat penuh.",
  },
  {
    question: "Aman ga dari serangan prompt injection atau jailbreak?",
    answer:
      "Super aman! Prinsip dasarnya: 'A user can waive scope, not truth' plus aturan no-fatwa yang ketat. 5 dari 5 vektor prompt injection paling licik mental semua (5/5) di suite evaluasi kita.",
  },
  {
    question: "Bakal ngerusak file konfigurasi agent yang udah ada ga?",
    answer:
      "Tenang, ga bakal ngerusak kodingan lu! Baik Token-Maxxing maupun +62 Mode pake format managed-block (penanda komentar khusus). Pas lu uninstall, cuma blok sama file yang kecatet di manifest yang dibersihin. Konfigurasi asli lu ga bakal disentuh.",
  },
];

export default function SupportSection() {
  return (
    <section id="support" className="py-24 px-6 max-w-5xl mx-auto sketch-divider">
      
      {/* Section Header */}
      <div className="text-left mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5fb247] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] text-xs font-mono font-bold text-white uppercase tracking-wider mb-3">
          Bagian 03 &bull; Bantuan &amp; Komunitas
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0d0d0d] sketch-display">
          TANYA JAWAB &amp; KOMUNITAS
        </h2>
        <p className="text-base sm:text-lg text-[#3a3a3a] sketch-serif mt-2 max-w-xl">
          Ada yang bikin bingung, instalasi nyangkut, atau mau ikut kontribusi ke lab HumanoiseLABS?
        </p>
      </div>

      {/* Support Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
        
        {/* Card 1: GitHub Issues */}
        <div className="p-6 sketch-card sketch-card-hover bg-white flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#ffd23f] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] flex items-center justify-center text-[#0d0d0d] mb-4">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <h3 className="font-black text-lg text-[#0d0d0d] font-mono mb-1.5">Lapor Bug &amp; Masalah</h3>
            <p className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed">
              Nemu bug di adapter atau pas lagi ngetes? Lempar aja issue-nya langsung ke repo GitHub kita.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t-2 border-dashed border-[#0d0d0d]/20">
            <a
              href="https://github.com/humanoiseLABS/plus62/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#0d0d0d] font-bold flex items-center gap-1.5 hover:text-[#ff6b2c] transition-colors"
            >
              <span>Buka GitHub Issues</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Card 2: Dokumentasi & Riset */}
        <div className="p-6 sketch-card sketch-card-hover bg-white flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#8fdcff] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] flex items-center justify-center text-[#0d0d0d] mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-black text-lg text-[#0d0d0d] font-mono mb-1.5">Riset &amp; Benchmark</h3>
            <p className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed">
              Cek jeroan benchmark token, tabel parity tiap harness, dan catatan Phase 3 content hardening kita.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t-2 border-dashed border-[#0d0d0d]/20">
            <a
              href="https://github.com/humanoiseLABS/plus62/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#0d0d0d] font-bold flex items-center gap-1.5 hover:text-[#ff6b2c] transition-colors"
            >
              <span>Intip Dokumen Teknis</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Card 3: Kontribusi & Budaya */}
        <div className="p-6 sketch-card sketch-card-hover bg-white flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#ff5c7a] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] flex items-center justify-center text-white mb-4">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <h3 className="font-black text-lg text-[#0d0d0d] font-mono mb-1.5">Dukung &amp; Nyumbang Persona</h3>
            <p className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed">
              Bantu nambahin persona khas daerah lu di Nusantara. Jangan lupa klik Star di GitHub biar makin rame!
            </p>
          </div>
          <div className="mt-6 pt-4 border-t-2 border-dashed border-[#0d0d0d]/20">
            <a
              href="https://github.com/humanoiseLABS/plus62"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#ff6b2c] font-bold flex items-center gap-1.5 hover:underline"
            >
              <span>Kasih Star di GitHub &#9733;</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>

      {/* Animated Framer-Motion Shadcn FAQ Section */}
      <div className="sketch-card overflow-hidden">
        <FaqSection
          title="TANYA JAWAB (FAQ)"
          description="Hal-hal yang sering ditanyain seputar HumanoiseLABS, +62 Mode vs Token-Maxxing, fakta token, sama keamanan adapter."
          items={HUMANOISE_FAQS}
          contactInfo={{
            title: "Masih Ada yang Mau Ditanyain?",
            description: "Komunitas dan dev siap bantuin lu di GitHub Issues, ga usah sungkan!",
            buttonText: "Tanya / Diskusi di GitHub",
            onContact: () => {
              window.open("https://github.com/humanoiseLABS/plus62/issues", "_blank");
            },
          }}
        />
      </div>

    </section>
  );
}
