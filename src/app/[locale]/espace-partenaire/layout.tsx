import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

// Dépend du code de parrainage dans l'URL et de la base de données : jamais statique.
export const dynamic = "force-dynamic";

export default function PartnerPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-fond">
      <header className="bg-noir py-4">
        <div className="wrap-site">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo/logo-full-white-tight.png" alt="Odysseo" className="mix-blend-lighten h-7 w-auto" />
          </Link>
        </div>
      </header>
      <main className="wrap-site py-8">{children}</main>
    </div>
  );
}
