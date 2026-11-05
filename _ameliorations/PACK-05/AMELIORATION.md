# PACK-05 · Partage social et référencement de base
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, routes `/[locale]/...` FR/EN) déployée sur Vercel._

## Contexte (constaté le 05/11/2026 sur le site en ligne)
- Aucune balise Open Graph ni Twitter : un lien partagé sur WhatsApp ou Facebook s'affiche sans image ni titre propre. Or toute l'acquisition passe par WhatsApp, Facebook et TikTok.
- `/robots.txt` et `/sitemap.xml` répondent 404.
- Pas de `<link rel="canonical">` ni d'`hreflang` entre `/fr` et `/en`.
- Seule une `meta description` existe.

## Objectif
Chaque page partagée affiche un aperçu propre (logo, titre, phrase d'accroche), et Google peut indexer les pages FR et EN.

## Tâches
1. **Explorer d'abord** : repérer la façon dont `metadata` / `generateMetadata` est géré dans `app/[locale]/layout.tsx` et les pages. S'adapter à la structure existante plutôt que d'en créer une nouvelle.
2. Définir `metadataBase` à partir d'une variable d'environnement `NEXT_PUBLIC_SITE_URL` (valeur par défaut : `https://odysseo-education.vercel.app`). Ajouter la variable dans `.env.example`.
3. Pour chaque page publique (`/`, `/cursus`, `/cursus/[slug]`, `/services`, `/partenaires`, `/postuler`), en FR et EN :
   - `title` unique (format : « [Titre de la page] · Odysseo Education ») et `description` (140-160 caractères) dans la langue de la page.
   - `openGraph` : `title`, `description`, `url`, `siteName: "Odysseo Education"`, `locale` (`fr_FR` / `en_US`), `type: "website"`, `images` (1200×630).
   - `twitter` : `card: "summary_large_image"`.
   - `alternates` : `canonical` + `languages: { fr: "/fr/...", en: "/en/..." }`.
4. **Image de partage** : créer `app/[locale]/opengraph-image.tsx` avec `next/og` (ImageResponse 1200×630) : fond noir `#0B0B0D`, logo blanc Odysseo (fichier existant dans `public/images/logo/`), barre rouge `#FF0000`, titre de la page en blanc, police Inter. Ajouter une variante par cursus (« Master – Rentrée 2027 », etc.).
5. Créer `app/robots.ts` (autoriser tout sauf `/api/` et les pages d'administration s'il y en a) et `app/sitemap.ts` listant toutes les pages publiques FR et EN avec `alternates.languages`.
6. Vérifier que les PDF de `/brochures/` restent accessibles.

## Critères d'acceptation
- [ ] `curl -s https://<preview>/fr | grep og:image` renvoie une balise avec une URL absolue.
- [ ] Le débogueur Facebook (https://developers.facebook.com/tools/debug/) affiche image, titre et description pour `/fr`, `/fr/cursus/master` et `/en`.
- [ ] Un lien collé dans WhatsApp montre l'image et le titre.
- [ ] `/robots.txt` et `/sitemap.xml` répondent 200, et le sitemap contient les URL FR et EN.
- [ ] Chaque page a un `canonical` et des `hreflang` fr/en.
- [ ] `npm run build` passe sans erreur.

## Ne pas faire
- Ne pas changer les textes visibles des pages.
- Ne pas ajouter de script de suivi (c'est le PACK-04).

## Fin du pack
- Incrémenter la version mineure dans `package.json`.
- Ajouter dans `CHANGELOG.md` : `## [x.y.0] – AAAA-MM-JJ · PACK-05 Partage & référencement` avec la liste des changements.
- Proposer le commit : `feat(seo): Open Graph, sitemap, robots, hreflang (PACK-05)`.

## Recommandation hors code (pour le fondateur)
Acheter un nom de domaine (ex. `odysseo-education.com` [À CHOISIR]) et le relier à Vercel. Une adresse `vercel.app` inspire moins confiance aux parents qui paient. Il suffira ensuite de changer `NEXT_PUBLIC_SITE_URL`.
