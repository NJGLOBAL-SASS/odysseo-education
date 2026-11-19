import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Lien privé du rapport (ODY-15 §6) : jamais indexé, sans mesure d'audience ni pixel.
export const metadata: Metadata = {
  title: "Votre rapport d'admissibilité · Odysseo Education",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  icons: { icon: "/images/logo/favicon-64.png" },
};

export default function ReportLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen bg-fond font-sans text-noir antialiased">{children}</body>
    </html>
  );
}
