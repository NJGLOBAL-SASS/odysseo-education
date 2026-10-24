import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "@/components/marketing/newsletter-form";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-bord bg-carte">
      <div className="wrap-site py-10">
        <NewsletterForm />
      </div>
      <div className="wrap-site flex flex-col items-center gap-2 border-t border-bord py-5 text-center text-[12.5px] text-gris sm:flex-row sm:justify-between">
        <p>
          © {year} Odysseo Education · {t("rights")}
        </p>
        <div className="flex gap-4">
          <Link href="/confidentialite" className="hover:text-texte">
            {t("privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
