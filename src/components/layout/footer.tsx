import Image from "next/image";
import { MessageCircle, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { ManageCookiesButton } from "@/components/cookies/manage-cookies-button";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const year = new Date().getFullYear();
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return (
    <footer className="border-t border-bord bg-carte">
      <div className="wrap-site py-10">
        <NewsletterForm />
      </div>

      <div className="border-t border-bord">
        <div className="wrap-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/images/logo/logo-full-black-tight.png"
              alt={tNav("brand")}
              width={860}
              height={310}
              className="h-7 w-auto"
            />
            <p className="mt-3 max-w-xs text-sm text-gris">{t("description")}</p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gris">
              {t("navTitle")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-texte hover:text-rouge">
                  {tNav("home")}
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-texte hover:text-rouge">
                  {tNav("services")}
                </Link>
              </li>
              <li>
                <Link href="/postuler" className="text-texte hover:text-rouge">
                  {tNav("apply")}
                </Link>
              </li>
              <li>
                <Link href="/partenaires" className="text-texte hover:text-rouge">
                  {tNav("partners")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gris">
              {t("legalTitle")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/confidentialite" className="text-texte hover:text-rouge">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-texte hover:text-rouge">
                  {t("cookies")}
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="text-texte hover:text-rouge">
                  {t("legalNotice")}
                </Link>
              </li>
              <li>
                <Link href="/conditions-generales" className="text-texte hover:text-rouge">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <ManageCookiesButton className="text-left text-texte hover:text-rouge">
                  {t("manageCookies")}
                </ManageCookiesButton>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gris">
              {t("contactTitle")}
            </h3>
            <ul className="space-y-2 text-sm">
              {waNumber && (
                <li>
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-texte hover:text-rouge"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </li>
              )}
              <li>
                <a
                  href="mailto:contact@odysseo-education.com"
                  className="flex items-center gap-2 text-texte hover:text-rouge"
                >
                  <Mail className="h-4 w-4" /> contact@odysseo-education.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="wrap-site flex flex-col items-center gap-2 border-t border-bord py-5 text-center text-[12.5px] text-gris sm:flex-row sm:justify-between">
        <p>
          © {year} Odysseo Education · {t("rights")}
        </p>
      </div>
    </footer>
  );
}
