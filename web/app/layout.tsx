import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAHahah — Personality & Efficiency Layer for Coding Agents",
  description: "Minimalist personality and token efficiency layer for Claude Code, Antigravity, OpenCode, Cursor, and Copilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark scroll-smooth">
      <body className="antialiased bg-[#090A0F] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
