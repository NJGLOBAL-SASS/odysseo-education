import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { PROGRAMS } from "@/lib/programs";
import { LEGAL_PAGE_PATHS, PUBLIC_PAGE_PATHS, SITE_URL } from "@/lib/seo";

/** /sitemap.xml — PACK-05. Toutes les pages publiques, en FR et en EN, avec leurs alternatives hreflang. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: PUBLIC_PAGE_PATHS.home, priority: 1, changeFrequency: "weekly" },
    { path: PUBLIC_PAGE_PATHS.programs, priority: 0.9, changeFrequency: "weekly" },
    ...PROGRAMS.map((p) => ({ path: `/cursus/${p.slug}`, priority: 0.9, changeFrequency: "weekly" as const })),
    { path: PUBLIC_PAGE_PATHS.services, priority: 0.7, changeFrequency: "monthly" },
    { path: PUBLIC_PAGE_PATHS.apply, priority: 0.8, changeFrequency: "monthly" },
    { path: PUBLIC_PAGE_PATHS.partners, priority: 0.5, changeFrequency: "monthly" },
    { path: PUBLIC_PAGE_PATHS.faq, priority: 0.7, changeFrequency: "monthly" },
    { path: PUBLIC_PAGE_PATHS.parents, priority: 0.7, changeFrequency: "monthly" },
    { path: PUBLIC_PAGE_PATHS.guide, priority: 0.6, changeFrequency: "monthly" },
    ...LEGAL_PAGE_PATHS.map((path) => ({ path, priority: 0.2, changeFrequency: "yearly" as const })),
  ];

  const lastModified = new Date();
  return paths.flatMap(({ path, priority, changeFrequency }) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
      },
    })),
  );
}
