import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { BrandWatermark } from "@/components/layout/brand-watermark";

// Coquille minimale, sans navigation publique : utilisée uniquement sur le
// sous-domaine team.odysseo-education.com (voir src/middleware.ts).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fond">
      <header className="relative z-10 bg-noir py-4">
        <div className="wrap-site">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo/logo-full-white-tight.png" alt="Odysseo" className="mix-blend-lighten h-7 w-auto" />
          </Link>
        </div>
      </header>
      <main className="relative isolate flex-1">
        <BrandWatermark />
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}
