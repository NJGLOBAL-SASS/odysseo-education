import { locales } from "@/i18n/config";
import { renderOgImage } from "@/lib/og-image";
import { OG_IMAGE_SIZE, PAGE_SEO, toLocale } from "@/lib/seo";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Odysseo Education";

// Générée au build (pas de lecture de fichiers à l'exécution).
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Image({ params }: { params: { locale: string } }) {
  return renderOgImage({ title: PAGE_SEO.tracking[toLocale(params.locale)].title });
}
