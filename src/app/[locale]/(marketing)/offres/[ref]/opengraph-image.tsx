import { getTranslations } from "next-intl/server";

import { locales } from "@/i18n/config";
import { renderOgImage } from "@/lib/og-image";
import { getPublicOffer, publicOfferSlugs } from "@/lib/offers/public-catalogue";
import { OG_IMAGE_SIZE, toLocale } from "@/lib/seo";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Odysseo Education";

export function generateStaticParams() {
  return locales.flatMap((locale) => publicOfferSlugs().map((ref) => ({ locale, ref })));
}

/** Image de partage d'une offre : « Master boursier à Xi'an – MA-24 » + argument principal. */
export default async function Image({ params }: { params: { locale: string; ref: string } }) {
  const locale = toLocale(params.locale);
  const offer = getPublicOffer(params.ref, locale);
  const t = await getTranslations({ locale, namespace: "offers" });
  if (!offer) return renderOgImage({ title: t("index.eyebrow") });
  return renderOgImage({
    title: t("detail.metaTitle", { cycle: t(`cycles.${offer.cycle}`), city: offer.ville, ref: offer.ref }),
    subtitle: offer.arguments[0],
  });
}
