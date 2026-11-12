import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";

import { LinkButtons, type LinkItem } from "@/components/links/link-buttons";
import { buildPageMetadata, toLocale } from "@/lib/seo";

/**
 * /liens — lien unique des bios TikTok et Facebook (v0.14.0).
 * Page statique, hors du gabarit vitrine (ni en-tête, ni bandeau cookies, ni Meta Pixel) :
 * légère et rapide sur mobile. La source (?src=tiktok…) est lue au clic, côté navigateur,
 * pour garder la page statique. Liens à mettre dans les bios :
 *   https://odysseo-education.vercel.app/liens?src=tiktok
 *   https://odysseo-education.vercel.app/liens?src=facebook
 */
const TITLE = "Odysseo Education — Liens";
const DESCRIPTION = "Étudier en Chine : bourses, admission, visa. Analyse de profil gratuite, chaîne et groupe WhatsApp.";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb9Aike1CYoOiBhjgL0M";
const WHATSAPP_GROUP = "https://chat.whatsapp.com/KiK1e7WXWhG98uE9hpCKaO";
const WHATSAPP_ADVISOR = `https://wa.me/8613179468571?text=${encodeURIComponent("Bonjour Odysseo, je viens de votre page liens")}`;
const FACEBOOK = "https://www.facebook.com/share/1EUkka21iQ/";
const TIKTOK = "https://www.tiktok.com/@odysseo.cn";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const meta = buildPageMetadata({
    locale: toLocale(params.locale),
    path: "/liens",
    title: "Liens",
    description: DESCRIPTION,
    defaultImage: true,
  });
  return {
    ...meta,
    title: { absolute: TITLE },
    openGraph: { ...meta.openGraph, title: TITLE },
    twitter: { ...meta.twitter, title: TITLE },
  };
}

export default function LiensPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);

  const items: LinkItem[] = [
    { id: "analyse", emoji: "🎓", label: "Analyse de profil gratuite", href: `/${locale}/postuler`, variant: "primary" },
    { id: "chaine", emoji: "📢", label: "Chaîne WhatsApp : bourses & infos", href: WHATSAPP_CHANNEL, variant: "whatsapp", external: true },
    { id: "groupe", emoji: "👥", label: "Rejoindre le groupe Odysseo", href: WHATSAPP_GROUP, variant: "whatsapp", external: true },
    { id: "conseiller", emoji: "💬", label: "Parler à un conseiller", href: WHATSAPP_ADVISOR, variant: "whatsapp", external: true },
    { id: "partenaire", emoji: "🤝", label: "Devenir partenaire (gagnez des primes)", href: `/${locale}/partenaires/inscription`, variant: "ghost" },
  ];

  return (
    <div className="min-h-screen bg-fond">
      <div aria-hidden="true" className="h-1.5 bg-rouge" />
      <main className="mx-auto flex w-full max-w-[480px] flex-col px-4 pb-8 pt-10">
        <header className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-noir shadow-pop">
            <Image
              src="/images/logo/logo-mark-white-tight.png"
              alt="Logo Odysseo Education"
              width={640}
              height={450}
              priority
              sizes="64px"
              className="h-auto w-16"
            />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-noir">Odysseo Education</h1>
          <p className="mt-1.5 text-[15px] text-gris">
            Étudier en Chine <span aria-label="drapeau de la Chine">🇨🇳</span>
            <br />
            Bourses · Admission · Visa
          </p>
        </header>

        <LinkButtons items={items} />

        <footer className="mt-10 text-center text-sm text-gris">
          <nav aria-label="Réseaux sociaux" className="flex items-center justify-center gap-5">
            <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center font-semibold hover:text-noir">
              Facebook
            </a>
            <span aria-hidden="true">·</span>
            <a href={TIKTOK} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center font-semibold hover:text-noir">
              TikTok
            </a>
          </nav>
          <p className="mt-2 text-xs">© Odysseo Education</p>
        </footer>
      </main>
    </div>
  );
}
