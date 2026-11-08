import type { Metadata } from "next";

import { locales } from "@/i18n/config";
import type { Locale, ProgramSlug } from "@/lib/programs";

/**
 * Référencement et aperçus de partage (WhatsApp, Facebook, TikTok) — PACK-05.
 *
 * URL absolue du site : NEXT_PUBLIC_SITE_URL (ex. https://odysseo-education.com
 * une fois le domaine relié à Vercel). Sert de metadataBase, de base au
 * sitemap et aux balises canonical / hreflang.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://odysseo-education.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "Odysseo Education";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

type L<T> = Record<Locale, T>;
type PageSeo = { title: string; description: string };

export type PublicPage = "home" | "programs" | "services" | "partners" | "apply" | "faq" | "guide" | "parents";

/** Chemins (sans préfixe de langue) des pages publiques. */
export const PUBLIC_PAGE_PATHS: Record<PublicPage, string> = {
  home: "",
  programs: "/cursus",
  services: "/services",
  partners: "/partenaires",
  apply: "/postuler",
  faq: "/faq",
  guide: "/guides/avant-le-depart",
  parents: "/parents",
};

/** Pages légales : indexables (canonical + hreflang), titres repris des pages. */
export const LEGAL_SEO: Record<string, L<PageSeo>> = {
  "/mentions-legales": {
    fr: { title: "Mentions légales", description: "Mentions légales du site Odysseo Education : éditeur, hébergement et propriété intellectuelle." },
    en: { title: "Legal Notice", description: "Legal notice of the Odysseo Education website: publisher, hosting and intellectual property." },
  },
  "/conditions-generales": {
    fr: { title: "Conditions générales d'utilisation", description: "Conditions générales d'utilisation du site et du formulaire d'analyse de profil Odysseo Education." },
    en: { title: "Terms of Use", description: "Terms of use of the Odysseo Education website and profile assessment form." },
  },
  "/confidentialite": {
    fr: { title: "Politique de confidentialité", description: "Comment Odysseo Education collecte, utilise et protège vos données personnelles, et comment exercer vos droits." },
    en: { title: "Privacy Policy", description: "How Odysseo Education collects, uses and protects your personal data, and how to exercise your rights." },
  },
  "/cookies": {
    fr: { title: "Politique de cookies", description: "Les cookies et le stockage utilisés par le site Odysseo Education, et comment gérer votre consentement." },
    en: { title: "Cookie Policy", description: "The cookies and storage used by the Odysseo Education website, and how to manage your consent." },
  },
};
export const LEGAL_PAGE_PATHS = Object.keys(LEGAL_SEO);

/** Titres et descriptions (140-160 caractères) des pages publiques. */
export const PAGE_SEO: Record<PublicPage, L<PageSeo>> = {
  home: {
    fr: {
      title: "Étudier en Chine",
      description:
        "Étudier en Chine : langue, licence, master ou doctorat. Analyse gratuite de votre profil en 3 minutes et premier avis sur WhatsApp, avant tout engagement.",
    },
    en: {
      title: "Study in China",
      description:
        "Study in China: Chinese language, bachelor's, master's or PhD. Free 3-minute profile assessment and first advice on WhatsApp, before any commitment.",
    },
  },
  programs: {
    fr: {
      title: "Nos cursus en Chine",
      description:
        "Langue chinoise, Bachelor, Master ou Doctorat en Chine : accompagnement complet, tarif tout compris et objectif clair, une admission avec bourse en 2027.",
    },
    en: {
      title: "Our programs in China",
      description:
        "Chinese language, bachelor's, master's or PhD in China: complete support, all-inclusive fees and one clear goal, an admission with a scholarship in 2027.",
    },
  },
  services: {
    fr: {
      title: "Nos services",
      description:
        "Orientation, constitution du dossier, candidatures, bourse, visa, billet et accueil à l'arrivée : Odysseo vous accompagne à chaque étape vers la Chine.",
    },
    en: {
      title: "Our services",
      description:
        "Guidance, application file, university applications, scholarship, visa, flight and airport pick-up: Odysseo supports you at every step towards China.",
    },
  },
  partners: {
    fr: {
      title: "Devenez partenaire Odysseo",
      description:
        "Programme partenaires Odysseo Education : partagez votre lien unique, suivez vos filleuls et gagnez des points à chaque étudiant admis dans une université.",
    },
    en: {
      title: "Become an Odysseo partner",
      description:
        "Odysseo Education partner program: share your unique link, track your referrals and earn points for every student admitted to a university in China.",
    },
  },
  apply: {
    fr: {
      title: "Analyse gratuite de votre profil",
      description:
        "Répondez à quelques questions en 3 minutes : nous analysons gratuitement votre profil et revenons vers vous sur WhatsApp pour étudier en Chine en 2027.",
    },
    en: {
      title: "Free profile assessment",
      description:
        "Answer a few questions in 3 minutes: we assess your profile for free and get back to you on WhatsApp with first advice to study in China in 2027.",
    },
  },
  // PACK-09 : FAQ et guide « Avant le départ ».
  faq: {
    fr: {
      title: "Questions fréquentes",
      description:
        "Bourses, IELTS, relevé bancaire, visa X1, paiement par étapes : des réponses claires aux questions des étudiants et des parents sur les études en Chine.",
    },
    en: {
      title: "Frequently asked questions",
      description:
        "Scholarships, IELTS, bank statement, X1 visa, payment in steps: clear answers to the questions students and parents ask most often about studying in China.",
    },
  },
  guide: {
    fr: {
      title: "Avant le départ pour la Chine",
      description:
        "La checklist complète avant de partir étudier en Chine : documents du bagage à main, voyage et arrivée, argent et téléphone, santé. À cocher et à imprimer.",
    },
    en: {
      title: "Before leaving for China",
      description:
        "The complete checklist before leaving to study in China: hand-luggage documents, travel and arrival, money and phone, health. Tick it off and print it out.",
    },
  },
  // PACK-07 : page Parents.
  parents: {
    fr: {
      title: "Parents : coûts, paiement et garanties",
      description:
        "Parents : combien coûtent les études en Chine avec Odysseo, quand payer (l'essentiel après l'admission), ce qui est remboursé et comment suivre le dossier.",
    },
    en: {
      title: "Parents: costs, payment and guarantees",
      description:
        "Parents: what studying in China with Odysseo costs, when to pay (most of it after the admission), what is refunded and how to follow your child's application.",
    },
  },
};

/** Descriptions des pages cursus et sous-titre de leur image de partage. */
export const PROGRAM_SEO: Record<ProgramSlug, L<{ description: string; ogLabel: string }>> = {
  "langue-chinoise": {
    fr: {
      ogLabel: "Langue chinoise – Rentrée 2027",
      description:
        "Un semestre ou une année de chinois dans une université en Chine, avec préparation au HSK, à frais réduits ou avec allocation. Rentrées 2027.",
    },
    en: {
      ogLabel: "Chinese language – 2027 intake",
      description:
        "A semester or a year of Chinese at a university in China, with HSK preparation, at reduced fees or with a stipend. 2027 intakes, complete support.",
    },
  },
  bachelor: {
    fr: {
      ogLabel: "Bachelor – Rentrée 2027",
      description:
        "Bachelor (licence) en Chine pour la rentrée 2027 : choix des universités, dossier, candidature à la bourse, visa et accueil à l'arrivée inclus.",
    },
    en: {
      ogLabel: "Bachelor – 2027 intake",
      description:
        "Bachelor's degree in China for the 2027 intake: university selection, application file, scholarship application, visa and airport pick-up included.",
    },
  },
  master: {
    fr: {
      ogLabel: "Master – Rentrée 2027",
      description:
        "Master en Chine pour la rentrée 2027 : projet de recherche, contact avec les directeurs de recherche et bourse totale plus accessible. Tarif tout compris.",
    },
    en: {
      ogLabel: "Master – 2027 intake",
      description:
        "Master's degree in China for the 2027 intake: research project, contact with supervisors and a full scholarship that is easier to obtain. All-inclusive.",
    },
  },
  doctorat: {
    fr: {
      ogLabel: "Doctorat (PhD) – Rentrée 2027",
      description:
        "Doctorat (PhD) en Chine pour la rentrée 2027 : projet de recherche, prise de contact avec les directeurs de thèse, bourse visée et visa accompagnés.",
    },
    en: {
      ogLabel: "Doctorate (PhD) – 2027 intake",
      description:
        "Doctorate (PhD) in China for the 2027 intake: research proposal, contact with supervisors, targeted scholarship and visa, with complete support.",
    },
  },
};

export function toLocale(value: string): Locale {
  return value === "en" ? "en" : "fr";
}

/** « Titre de la page · Odysseo Education ». */
export function fullTitle(title: string) {
  return `${title} · ${SITE_NAME}`;
}

/** Alternatives de langue d'un chemin (sans préfixe), en chemins relatifs à metadataBase. */
export function languageAlternates(path: string) {
  return Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])) as Record<Locale, string>;
}

/**
 * Métadonnées complètes d'une page publique : title, description, Open Graph,
 * Twitter, canonical et hreflang.
 *
 * Image de partage : une page qui a son propre opengraph-image.tsx (cursus,
 * services...) la reçoit automatiquement. Les autres (accueil, pages légales)
 * passent defaultImage pour pointer vers src/app/[locale]/opengraph-image.tsx —
 * attention : une image explicite ici remplacerait celle du fichier.
 */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  defaultImage = false,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  defaultImage?: boolean;
}): Metadata {
  const full = fullTitle(title);
  const url = `/${locale}${path}`;
  return {
    title: { absolute: full },
    description,
    alternates: {
      canonical: url,
      languages: { ...languageAlternates(path), "x-default": `/fr${path}` },
    },
    openGraph: {
      title: full,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? ["en_US"] : ["fr_FR"],
      type: "website",
      ...(defaultImage && {
        images: [{ url: `/${locale}/opengraph-image`, ...OG_IMAGE_SIZE, alt: SITE_NAME, type: "image/png" }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: full,
      description,
      ...(defaultImage && { images: [`/${locale}/opengraph-image`] }),
    },
  };
}

/** Métadonnées d'une page publique « vitrine » (accueil, cursus, services...). */
export function publicPageMetadata(page: PublicPage, localeParam: string): Metadata {
  const locale = toLocale(localeParam);
  const seo = PAGE_SEO[page][locale];
  // L'accueil (groupe (marketing)) n'hérite pas de l'image du segment [locale].
  return buildPageMetadata({ locale, path: PUBLIC_PAGE_PATHS[page], ...seo, defaultImage: page === "home" });
}

/** Métadonnées d'une page légale (chemin sans préfixe, ex. "/cookies"). */
export function legalPageMetadata(path: string, localeParam: string): Metadata {
  const locale = toLocale(localeParam);
  return buildPageMetadata({ locale, path, ...LEGAL_SEO[path][locale], defaultImage: true });
}
