"use client";

import { useState, useEffect } from "react";

function Squiggle() {
  return (
    <svg
      className="absolute -left-0.5 -right-0.5 -bottom-1 w-[calc(100%+4px)] h-[7px] pointer-events-none"
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        pathLength={1}
        d="M1 5 C10 1 16 7 25 4 S40 1 50 4 S66 7 75 4 S90 1 99 4"
        className="fill-none stroke-[#ff6b2c] stroke-[2.2] [stroke-linecap:round] [stroke-dasharray:1] [stroke-dashoffset:1] group-hover:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

export default function Navbar() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/ALIVEbyHUMANOISE/hahahah")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        setStars(null);
      });
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-[#0d0d0d] bg-white/95 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand with Yeti Doodle Badge */}
        <a href="#" className="flex items-center gap-2.5 group">
          <span
            className="grid place-items-center w-10 h-10 rounded-full border-2 border-[#0d0d0d] bg-white -rotate-6 group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300 shadow-[2px_2px_0_#0d0d0d]"
            aria-hidden="true"
          >
            <svg viewBox="-60 -150 120 120" width="26" height="26">
              <g className="fill-white stroke-[#0d0d0d] stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]">
                <path d="M-30 -104 C-40 -112 -44 -124 -40 -138 C-32 -129 -22 -122 -13 -114 Z" />
                <path d="M18 -114 C26 -124 36 -130 47 -133 C45 -120 41 -110 32 -101 Z" />
                <path d="M-44 -30 C-54 -56 -54 -70 -42 -90 C-32 -110 -14 -118 2 -118 C22 -118 40 -108 48 -88 C58 -68 56 -54 48 -30 Z" />
                <circle className="fill-[#0d0d0d]" cx="-15" cy="-84" r="5.5" />
                <circle className="fill-[#0d0d0d]" cx="13" cy="-86" r="5.5" />
                <path className="fill-none" d="M-12 -66 C-6 -60 6 -60 12 -67" />
              </g>
            </svg>
          </span>
          <span className="font-extrabold tracking-tight text-xl text-[#0d0d0d]">
            hahahah
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#ffd23f] text-[#0d0d0d] border-2 border-[#0d0d0d] shadow-[2px_2px_0_#0d0d0d] -rotate-2">
            v3.0
          </span>
        </a>

        {/* Navigation Links with Hand-drawn Squiggle */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[#0d0d0d]/70">
          <a href="#integrations" className="relative group hover:text-[#0d0d0d] transition-colors py-1">
            <span>Integrasi & Persona</span>
            <Squiggle />
          </a>
          <a href="#tutorial" className="relative group hover:text-[#0d0d0d] transition-colors py-1">
            <span>Roadmap Pasang</span>
            <Squiggle />
          </a>
          <a href="#support" className="relative group hover:text-[#0d0d0d] transition-colors py-1">
            <span>Support & FAQ</span>
            <Squiggle />
          </a>
        </nav>

        {/* Sketchbook GitHub Star Button */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/ALIVEbyHUMANOISE/hahahah"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-[#fff9f2] border-2 border-[#0d0d0d] text-xs font-extrabold text-[#0d0d0d] shadow-[0_3px_0_#0d0d0d] hover:-translate-y-0.5 hover:-rotate-1 hover:shadow-[0_5px_0_#0d0d0d] active:translate-y-0.5 active:shadow-[0_1px_0_#0d0d0d] transition-all"
          >
            <svg className="w-4 h-4 fill-[#0d0d0d]" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Star di GitHub</span>
            <span className="inline-flex items-center gap-1 pl-2 border-l-2 border-[#0d0d0d]/20 text-[#0d0d0d]">
              <svg viewBox="-16 -16 32 32" width="14" height="14" className="stroke-[#0d0d0d] stroke-[2] [stroke-linejoin:round]">
                <path fill="#ffd23f" d="M0 -13 L3.6 -4.4 L13 -4 L5.8 2.2 L8.2 12 L0 6.6 L-8.2 12 L-5.8 2.2 L-13 -4 L-3.6 -4.4 Z" />
              </svg>
              <span>{stars !== null ? stars : "★"}</span>
            </span>
          </a>
        </div>

      </div>
    </header>
  );
}
