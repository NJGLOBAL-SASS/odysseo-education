import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { publicSiteUrl } from "@/lib/referral";
import { publicKit } from "@/lib/kits/server";
import { KitActions } from "@/components/kits/kit-actions";

export const dynamic = "force-dynamic";

type Params = { locale: string; slug: string; code: string };

const imagePath = (slug: string, code: string, v: number) => `/api/kit/${encodeURIComponent(slug)}/${encodeURIComponent(code)}/image.jpg?v=${v}`;

/** Aperçu WhatsApp : og:image 1200 × 630 (URL absolue https), page non indexée. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const ctx = await publicKit(params.slug, decodeURIComponent(params.code).toUpperCase());
  if (!ctx) return { robots: { index: false, follow: false } };
  const og = `${publicSiteUrl()}/api/kit/${encodeURIComponent(ctx.kit.slug)}/${encodeURIComponent(ctx.partner.referralCode)}/og.jpg?v=${ctx.kit.imageVersion}`;
  const title = `Kit Odysseo – ${ctx.kit.title}`;
  const description = `Visuel et texte prêts à poster, avec ton QR code ${ctx.partner.referralCode}.`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [{ url: og, width: 1200, height: 630 }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

/** ODY-14 §7 : page du kit d'un partenaire (sans connexion, mobile d'abord). */
export default async function KitPage({ params }: { params: Params }) {
  setRequestLocale(params.locale);
  const ctx = await publicKit(params.slug, decodeURIComponent(params.code).toUpperCase());
  if (!ctx) notFound();
  const src = imagePath(ctx.kit.slug, ctx.partner.referralCode, ctx.kit.imageVersion);

  return (
    <div className="min-h-screen bg-fond">
      <header className="bg-noir">
        <div className="mx-auto flex h-14 max-w-[560px] items-center px-4">
          <Image src="/images/logo/logo-full-white-tight.png" alt="Odysseo Education" width={860} height={310} priority className="h-6 w-auto" />
        </div>
        <div className="h-[4px] bg-rouge" />
      </header>
      <main className="mx-auto max-w-[560px] space-y-4 px-4 py-5">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">Kit partenaire</p>
          <h1 className="text-xl font-extrabold">{ctx.kit.title}</h1>
          <p className="text-sm text-gris">
            {ctx.firstName}, voici ton visuel avec ton QR code et ton texte avec ton lien.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Visuel ${ctx.kit.title} – code ${ctx.partner.referralCode}`} className="w-full rounded-brand shadow-card" />
        <KitActions
          slug={ctx.kit.slug}
          code={ctx.partner.referralCode}
          imageUrl={src}
          downloadUrl={`${src}&download=1`}
          text={ctx.text}
          fileName={`odysseo-${ctx.kit.slug}-${ctx.partner.referralCode}.jpg`}
        />
        <p className="text-center text-xs text-gris">Garde le lien dans ton texte, c&apos;est lui qui t&apos;attribue tes étudiants.</p>
      </main>
    </div>
  );
}
