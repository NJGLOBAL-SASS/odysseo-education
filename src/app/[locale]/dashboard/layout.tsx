import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ServiceWorkerRegister } from "@/components/dashboard/service-worker-register";

// Back-office protégé par session : jamais de rendu statique / cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Odysseo Education — Équipe",
  manifest: "/manifest.webmanifest",
};

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale: params.locale });
  }

  return (
    <div className="flex min-h-screen bg-fond">
      <ServiceWorkerRegister />
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="wrap-site py-8">{children}</div>
      </div>
    </div>
  );
}
