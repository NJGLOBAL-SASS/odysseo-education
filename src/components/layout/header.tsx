import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export async function Header() {
  const t = await getTranslations("nav");

  return (
    <header className="bg-noir text-white">
      <div className="wrap-site flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo/logo-full-white-tight.png"
            alt={t("brand")}
            width={860}
            height={310}
            priority
            className="mix-blend-lighten h-7 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-[#EDEDF2] md:flex">
          <Link href="/services" className="hover:text-white">
            {t("services")}
          </Link>
          <Link href="/partenaires" className="hover:text-white">
            {t("partners")}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link href="/postuler" className="btn-primary hidden !min-h-[38px] !px-4 text-sm sm:inline-flex">
            {t("apply")}
          </Link>
        </div>
      </div>
    </header>
  );
}
