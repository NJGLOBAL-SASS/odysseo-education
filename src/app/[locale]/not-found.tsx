import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Briefcase, Handshake, LayoutDashboard, MessageCircle, Users } from "lucide-react";

import { NotFoundView } from "@/components/errors/not-found-view";
import { isTeamHost } from "@/lib/hosts";

/**
 * 404 de l'application : URL inconnue (via [locale]/[...rest]) ou notFound().
 * Contenu adapté au domaine : le site public ne laisse rien deviner de l'espace équipe.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");
  const host = headers().get("x-forwarded-host") || headers().get("host") || "";
  const onTeam = isTeamHost(host);
  const footer = `© ${new Date().getFullYear()} Odysseo Education — ${t("rights")}`;

  if (onTeam) {
    return (
      <NotFoundView
        eyebrow={t("eyebrow")}
        title={t("teamTitle")}
        text={t("teamText")}
        homeHref={`/${locale}/dashboard`}
        footer={footer}
        actions={
          <a href={`/${locale}/dashboard`} className="btn-primary sm:!w-auto">
            <LayoutDashboard className="h-4 w-4" /> {t("dashboard")}
          </a>
        }
        links={
          <div className="flex flex-wrap justify-center gap-2">
            <a href={`/${locale}/dashboard/candidatures`} className="btn-sm-ghost">
              <Users className="h-4 w-4" /> {t("candidates")}
            </a>
            <a href={`/${locale}/dashboard/partenaires`} className="btn-sm-ghost">
              <Handshake className="h-4 w-4" /> {t("partnersTeam")}
            </a>
          </div>
        }
      />
    );
  }

  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  return (
    <NotFoundView
      eyebrow={t("eyebrow")}
      title={t("title")}
      text={t("text")}
      homeHref={`/${locale}`}
      footer={footer}
      actions={
        <>
          <a href={`/${locale}`} className="btn-ghost transition-colors hover:bg-fond sm:!w-auto">
            <ArrowLeft className="h-4 w-4" /> {t("home")}
          </a>
          <a href={`/${locale}/postuler`} className="btn-primary sm:!w-auto">
            {t("apply")}
          </a>
        </>
      }
      links={
        <div className="card mx-auto max-w-md p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gris">{t("helpTitle")}</p>
          <ul className="divide-y divide-bord text-sm">
            <li>
              <a href={`/${locale}/services`} className="flex items-center gap-2.5 py-2.5 font-semibold hover:text-rouge">
                <Briefcase className="h-4 w-4 text-gris" /> {t("services")}
              </a>
            </li>
            <li>
              <a href={`/${locale}/partenaires`} className="flex items-center gap-2.5 py-2.5 font-semibold hover:text-rouge">
                <Handshake className="h-4 w-4 text-gris" /> {t("partners")}
              </a>
            </li>
            {wa && (
              <li>
                <a
                  href={`https://wa.me/${wa.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 py-2.5 font-semibold hover:text-rouge"
                >
                  <MessageCircle className="h-4 w-4 text-[#1FAF55]" /> {t("whatsapp")}
                </a>
              </li>
            )}
          </ul>
        </div>
      }
    />
  );
}
