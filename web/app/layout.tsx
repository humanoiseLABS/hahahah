import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hahahah-web.vercel.app"),
  title: {
    default: "HAHahah Nusantara Edition — Personality & Zero-Fluff Layer for Coding Agents",
    template: "%s | HAHahah Nusantara Edition",
  },
  description:
    "Karakter budaya developer Nusantara (+62 Mode, Anti-Yapping) buat Claude Code, Antigravity, OpenCode, Qoder, Codex, Cursor, dan Copilot. Pangkas basa-basi korporat & tekan kebocoran reasoning dump ke layar.",
  keywords: [
    "HAHahah",
    "hahahah nusantara",
    "anti-yapping",
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
    "Anti-Yapping Mode",
    "developer persona",
  ],
  authors: [{ name: "humanoiseLABS", url: "https://github.com/humanoiseLABS/hahahah" }],
  creator: "humanoiseLABS",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://hahahah-web.vercel.app",
    siteName: "HAHahah Nusantara Edition",
    title: "HAHahah Nusantara Edition — Personality & Zero-Fluff Layer for Coding Agents",
    description:
      "Pasang karakter budaya Nusantara (+62 Mode, Anti-Yapping) ke Claude Code, Antigravity, OpenCode, Qoder, Codex, dan Cursor. Langsung ke baris bug, zero basa-basi korporat.",
    images: [
      {
        url: "https://hahahah-web.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "HAHahah Nusantara Edition — Personality & Zero-Fluff Layer for Coding Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HAHahah Nusantara Edition — Personality Layer for Coding Agents",
    description:
      "Karakter budaya developer Nusantara (+62 Mode, Anti-Yapping) untuk Claude Code, Google Antigravity, OpenCode, Qoder, dan Cursor. To-the-point & zero basa-basi.",
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
