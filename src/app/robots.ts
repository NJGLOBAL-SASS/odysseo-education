import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/** /robots.txt — PACK-05. Tout est indexable sauf l'API et l'espace équipe. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/fr/dashboard",
        "/en/dashboard",
        "/fr/login",
        "/en/login",
        "/fr/espace-partenaire",
        "/en/espace-partenaire",
        "/fr/brochure/",
        "/en/brochure/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
