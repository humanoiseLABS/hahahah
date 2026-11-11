import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://humanoise.vercel.app"),
  title: {
    default: "HUMANOISE — +62 Mode & Token-Maxxing untuk AI Coding Agents",
    template: "%s | HumanoiseLABS",
  },
  description:
    "Dua senjata AI coding agent dari HumanoiseLABS: +62 Mode (partner ngoding lokal yang blak-blakan & anti-basa-basi) dan Token-Maxxing (Second Brain, surgical diffs & hemat token hingga 80%). Mendukung Claude Code, Antigravity, OpenCode, Qoder, Codex, Cursor, dan Copilot.",
  keywords: [
    "HUMANOISE",
    "HumanoiseLABS",
    "token-maxxing",
    "tmx",
    "Second Brain",
    "+62 Mode",
    "plus62",
    "coding agent persona",
    "Claude Code Indonesia",
    "Google Antigravity",
    "OpenCode",
    "Qoder",
    "OpenAI Codex",
    "DeepSeek Harness",
    "OpenClaw",
    "Cursor rules Indonesia",
    "developer persona",
  ],
  authors: [{ name: "HumanoiseLABS", url: "https://github.com/humanoiseLABS" }],
  creator: "HumanoiseLABS",
  publisher: "HumanoiseLABS",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://humanoise.vercel.app",
    siteName: "HumanoiseLABS",
    title: "HUMANOISE — +62 Mode & Token-Maxxing untuk AI Coding Agents",
    description:
      "Pasang +62 Mode (partner ngoding lokal blak-blakan) atau Token-Maxxing (Second Brain & surgical diffs) ke Claude Code, Antigravity, OpenCode, Qoder, Codex, dan Cursor.",
    images: [
      {
        url: "https://humanoise.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "HUMANOISE — +62 Mode & Token-Maxxing untuk AI Coding Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HUMANOISE — +62 Mode & Token-Maxxing untuk AI Coding Agents",
    description:
      "Dua senjata AI coding agent dari HumanoiseLABS: +62 Mode (partner ngoding lokal Nusantara) & Token-Maxxing (Second Brain & surgical diffs).",
    images: ["https://humanoise.vercel.app/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://humanoise.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="antialiased bg-white text-[#0d0d0d] min-h-screen">
        {children}
      </body>
    </html>
  );
}
