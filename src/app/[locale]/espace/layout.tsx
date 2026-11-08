import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { setRequestLocale } from "next-intl/server";

import { ServiceWorkerRegister } from "@/components/dashboard/service-worker-register";

/** Espace étudiant (odysseo-application) : application installable « Mon dossier », jamais indexée. */
export const metadata: Metadata = {
  title: { default: "Odysseo — Mon dossier", template: "%s · Mon dossier" },
  applicationName: "Mon dossier",
  manifest: "/portal.webmanifest",
  icons: {
    icon: [{ url: "/icons/portal-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/portal-apple-touch.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Mon dossier", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
  // Liens d'activation : le jeton ne doit jamais partir vers un autre site.
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#0B0B0D", width: "device-width", initialScale: 1 };

export default function PortalLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <div className="min-h-screen bg-fond">
      <ServiceWorkerRegister />
      {children}
    </div>
  );
}
