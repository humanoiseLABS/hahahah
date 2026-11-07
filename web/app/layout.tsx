import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hahahah-web.vercel.app"),
  title: {
    default: "HAHahah Nusantara Edition — Personality & Efficiency Layer for Coding Agents",
    template: "%s | HAHahah Nusantara Edition",
  },
  description:
    "Lapisan kepribadian budaya developer Nusantara (+62 Mode, Halal ID, Jawa ID) dan efisiensi token untuk Claude Code, Google Antigravity, OpenCode, Qoder, Codex, Cursor, dan Copilot.",
  keywords: [
    "HAHahah",
    "hahahah nusantara",
    "humanoiseLABS",
    "coding agent persona",
    "Claude Code Indonesia",
    "Google Antigravity",
    "OpenCode",
    "Qoder",
    "OpenAI Codex",
    "DeepSeek Harness",
    "OpenClaw",
    "Cursor rules Indonesia",
    "+62 Mode",
    "Rusuh ID",
    "Halal ID",
    "Jawa ID",
    "token efficiency coding agent",
  ],
  authors: [{ name: "humanoiseLABS", url: "https://github.com/humanoiseLABS/hahahah" }],
  creator: "humanoiseLABS",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://hahahah-web.vercel.app",
    siteName: "HAHahah Nusantara Edition",
    title: "HAHahah Nusantara Edition — Personality & Efficiency Layer for Coding Agents",
    description:
      "Pasang karakter budaya Nusantara (+62 Mode, Halal ID, Jawa ID) ke Claude Code, Antigravity, OpenCode, Qoder, Codex, dan Cursor. Pangkas basa-basi & hemat token.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HAHahah Nusantara Edition — Personality Layer for Coding Agents",
    description:
      "Karakter budaya developer Nusantara (+62 Mode, Halal ID, Jawa ID) untuk Claude Code, Google Antigravity, OpenCode, Qoder, dan Cursor.",
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
