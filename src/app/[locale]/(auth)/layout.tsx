import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

// Coquille minimale, sans navigation publique : utilisée uniquement sur le
// sous-domaine team.odysseo-education.com (voir src/middleware.ts).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fond">
      <header className="bg-noir py-4">
        <div className="wrap-site">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo/logo-full-white.png" alt="Odysseo" className="h-6 w-auto" />
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
