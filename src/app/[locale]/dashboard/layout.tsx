import type { ReactNode } from "react";

import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
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
    <>
      <ServiceWorkerRegister />
      <DashboardShell
        user={{ name: session?.user?.name, email: session?.user?.email, role: session?.user?.role }}
      >
        {children}
      </DashboardShell>
    </>
  );
}
