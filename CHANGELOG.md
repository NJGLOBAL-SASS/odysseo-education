# Changelog

## [0.2.0] – 2026-11-05 · PACK-05 Partage & référencement

### Ajouté
- `src/lib/seo.ts` : source unique du référencement (URL du site, titres « [Page] · Odysseo Education », descriptions FR/EN de 140-160 caractères, helper de métadonnées).
- `metadataBase` lu depuis `NEXT_PUBLIC_SITE_URL` (défaut : `https://odysseo-education.vercel.app`), documenté dans `.env.example`.
- Métadonnées complètes (title, description, Open Graph, Twitter `summary_large_image`, `canonical`, `hreflang` fr/en/x-default) sur l'accueil, `/cursus`, `/cursus/[slug]`, `/services`, `/partenaires`, `/postuler` et les 4 pages légales, en FR et en EN.
- Images de partage 1200×630 générées au build avec `next/og` (fond #0B0B0D, logo blanc, barre rouge #FF0000, police Inter) : accueil, cursus, services, partenaires, postuler, et une variante par cursus (« Master – Rentrée 2027 »…).
- `/robots.txt` (tout autorisé sauf `/api/`, dashboard, connexion, espace partenaire et pages d'impression des brochures) et `/sitemap.xml` (26 URL FR + EN avec alternatives `hreflang`).
- Polices Inter (TTF, licence OFL) dans `src/assets/fonts/` pour les images de partage.

### Modifié
- `app/[locale]/layout.tsx` : métadonnées par défaut selon la langue (au lieu d'un titre français fixe).

### Inchangé
- Textes visibles des pages, PDF de `/brochures/` (toujours servis en 200).
