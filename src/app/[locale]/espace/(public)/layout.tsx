import type { ReactNode } from "react";
import Image from "next/image";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export default function PortalPublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-noir text-white">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-4">
          <Image src="/images/logo/logo-full-white-tight.png" alt="Odysseo Education" width={860} height={310} priority className="h-7 w-auto" />
          <LocaleSwitcher />
        </div>
        <div className="h-[4px] bg-rouge" />
      </header>
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
