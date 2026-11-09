import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hahahah-web.vercel.app"),
  title: {
    default: "HUMANOISE — Anti-Yapping & +62 Mode untuk AI Coding Agents",
    template: "%s | HUMANOISE Labs",
  },
  description:
    "Dua senjata AI coding agent dari HUMANOISE Labs: Anti-Yapping (surgical diffs & hemat output token hingga 80%) dan +62 Mode (partner ngoding lokal yang blak-blakan & anti-basa-basi). Mendukung Claude Code, Antigravity, OpenCode, Qoder, Codex, Cursor, dan Copilot.",
  keywords: [
    "HUMANOISE",
    "humanoiseLABS",
    "anti-yapping",
    "+62 Mode",
    "hahahah-ai",
    "coding agent persona",
    "Claude Code Indonesia",
    "Google Antigravity",
    "OpenCode",
    "Qoder",
    "OpenAI Codex",
    "DeepSeek Harness",
    "OpenClaw",
    "Cursor rules Indonesia",
    "Anti-Yapping Mode",
    "developer persona",
  ],
  authors: [{ name: "humanoiseLABS", url: "https://github.com/humanoiseLABS" }],
  creator: "humanoiseLABS",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://hahahah-web.vercel.app",
    siteName: "HUMANOISE Labs",
    title: "HUMANOISE — Anti-Yapping & +62 Mode untuk AI Coding Agents",
    description:
      "Pasang Anti-Yapping (surgical diffs & hemat token) atau +62 Mode (partner ngoding lokal blak-blakan) ke Claude Code, Antigravity, OpenCode, Qoder, Codex, dan Cursor.",
    images: [
      {
        url: "https://hahahah-web.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "HUMANOISE — Anti-Yapping & +62 Mode untuk AI Coding Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HUMANOISE — Anti-Yapping & +62 Mode untuk AI Coding Agents",
    description:
      "Dua senjata AI coding agent dari HUMANOISE Labs: Anti-Yapping (surgical diffs) & +62 Mode (partner ngoding lokal Nusantara).",
    images: ["https://hahahah-web.vercel.app/og-image.png"],
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
    canonical: "https://hahahah-web.vercel.app",
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
