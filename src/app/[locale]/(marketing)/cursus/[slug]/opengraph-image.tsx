import { locales } from "@/i18n/config";
import { renderOgImage } from "@/lib/og-image";
import { PROGRAMS, getProgram } from "@/lib/programs";
import { OG_IMAGE_SIZE, PAGE_SEO, PROGRAM_SEO, toLocale } from "@/lib/seo";

// Variante par cursus : « Master – Rentrée 2027 », etc.
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Odysseo Education";

export function generateStaticParams() {
  return locales.flatMap((locale) => PROGRAMS.map((p) => ({ locale, slug: p.slug })));
}

export default function Image({ params }: { params: { locale: string; slug: string } }) {
  const locale = toLocale(params.locale);
  const program = getProgram(params.slug);
  if (!program) return renderOgImage({ title: PAGE_SEO.programs[locale].title });
  return renderOgImage({
    title: PROGRAM_SEO[program.slug][locale].ogLabel,
    subtitle: PAGE_SEO.programs[locale].title,
  });
}
