import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal/session";
import { PortalNav } from "@/components/portal/portal-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export const dynamic = "force-dynamic";

/** Espace connecté : en-tête (logo blanc), navigation, compteur de messages non lus. */
export default async function PortalAppLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  setRequestLocale(params.locale);
  const session = await getPortalSession();
  if (!session) redirect(`/${params.locale}/espace/connexion`);
  const unread = await prisma.portalMessage.count({ where: { candidateId: session.candidateId, authorType: "TEAM", readByCandidateAt: null } });

  return (
    <div className="pb-[calc(72px+env(safe-area-inset-bottom))] sm:pb-10">
      <header className="bg-noir text-white">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between gap-3 px-4">
          <Image src="/images/logo/logo-full-white-tight.png" alt="Odysseo Education" width={860} height={310} priority className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-[13px] text-[#C9C9D1] sm:block">{session.name}</span>
            <LocaleSwitcher />
          </div>
        </div>
        <div className="mx-auto hidden max-w-[720px] px-3 pb-3 sm:block">
          <PortalNav unread={unread} />
        </div>
        <div className="h-[4px] bg-rouge" />
      </header>
      <div className="sm:hidden">
        <PortalNav unread={unread} />
      </div>
      <main className="mx-auto max-w-[720px] px-4 py-6">{children}</main>
    </div>
  );
}
