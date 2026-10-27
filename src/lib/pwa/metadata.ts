import type { Metadata, Viewport } from "next";

/** Métadonnées de la PWA équipe, partagées par le dashboard et les pages de connexion. */
export const teamAppMetadata: Metadata = {
  title: "Odysseo Education — Équipe",
  applicationName: "Odysseo",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/logo/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Odysseo", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  // Espace privé : jamais indexé par les moteurs de recherche.
  robots: { index: false, follow: false },
};

export const teamAppViewport: Viewport = {
  themeColor: "#0B0B0D",
  width: "device-width",
  initialScale: 1,
};
