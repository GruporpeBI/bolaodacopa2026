import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import WorldCupTicker from "@/components/WorldCupTicker";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bolão Copa 2026 — Mercearia Amauri",
  description: "A Casa da Torcida. Cadastre-se, faça seus palpites e dispute o ranking da Copa do Mundo 2026.",
  keywords: ["bolão", "copa do mundo 2026", "mercearia amauri", "palpites", "ranking"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#1A1A1A] text-[#FAF6EB]">
        <WorldCupTicker />
        {children}
      </body>
    </html>
  );
}
