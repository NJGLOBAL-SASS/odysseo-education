# Changelog

## [0.4.0] – 2026-11-05 · PACK-09 FAQ et guide avant le départ

### Ajouté
- Contenus dans `content/` : `faq/faq_fr.json` (fourni), `faq/faq_en.json` et `guides/checklist_depart_{fr,en}.json` (traductions EN marquées `meta.traduction_a_relire: true`).
- Règle de publication (`src/lib/content/faq.ts`) : toute question ou tout élément contenant `[À …]` ou un nombre entre crochets à valider (`[7]`) est masqué ; il s'affiche dès que le texte est corrigé dans le JSON. 19 questions sur 22 et 18 éléments sur 19 visibles aujourd'hui.
- Page `/[locale]/faq` : recherche instantanée (sans accents, sans librairie), 6 catégories en ancres, accordéon accessible (une question ouverte à la fois, `aria-expanded`, flèches ↑ ↓), bloc « Vous ne trouvez pas votre réponse ? » (WhatsApp + analyse gratuite), données structurées `FAQPage` (JSON-LD).
- Page `/[locale]/guides/avant-le-depart` : checklist à cocher mémorisée dans `localStorage` (`odysseo_checklist_depart`), bouton « Imprimer / Enregistrer en PDF » avec mise en page d'impression noir sur blanc, logo, sans menu.
- Tests `npm test` (`node:test` via tsx) : aucun texte affiché ne contient « [À », 19 questions visibles, « relevé » ne trouve que la question sur le relevé bancaire.
- Liens « FAQ » dans le pied de page et le menu mobile ; lien « Questions fréquentes » sous l'échéancier des pages cursus (pas dans les brochures PDF).
- Sitemap, titres, descriptions et images de partage pour les deux pages.

### Modifié
- En-tête, pied de page et bandeau cookies masqués à l'impression.

## [0.3.0] – 2026-11-05 · PACK-04 Mesure des conversions

### Ajouté
- **Attribution « premier contact »** (`src/lib/attribution.ts`) : `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `fbclid`, `ref` (code d'offre, ex. `P-04`) et code partenaire lus dans l'URL, gardés 30 jours dans `localStorage` (`odysseo_attribution`) avec la date et la page d'arrivée ; remplacés seulement par une nouvelle `utm_campaign`.
- Attribution enregistrée avec chaque dossier : nouveaux champs `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `fbclid`, `offerRef`, `landingPage`, `firstVisitAt`, `marketingConsent` (table `candidates`), visibles dans la fiche du dossier (section « Origine »).
- **Vercel Web Analytics** (`@vercel/analytics`, sans cookie, zone équipe exclue) et événements `form_step_view` (étapes 1-4), `form_submit_success`, `whatsapp_click`, `brochure_download` (cursus, langue).
- **Meta Pixel** chargé uniquement après consentement « Marketing » (aussi en cours de visite), retiré au retrait du consentement ; rien n'est chargé si `NEXT_PUBLIC_META_PIXEL_ID` est vide. Événements `PageView`, `ViewContent` (cursus / offres, `content_ids` = référence d'offre), `Lead` (`event_id` = code dossier, `content_category` = niveau visé), `Contact` (clic WhatsApp).
- **API Conversions Meta** (`src/lib/meta-capi.ts`) : `Lead` serveur avec le même `event_id` (déduplication), email et téléphone hachés SHA-256, `fbp` / `fbc`, seulement avec consentement marketing ; un échec Meta ne bloque jamais l'enregistrement du dossier.
- Variables `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_CAPI_TEST_EVENT_CODE` (facultative) dans `.env.example`.

### Modifié
- Page `/cookies` (FR/EN) : Vercel Analytics (mesure sans cookie), Meta Pixel (catégorie marketing, soumis à consentement), `odysseo_attribution`, `_fbp` / `_fbc`.
- Bandeau cookies : émet `odysseo:cookie-consent-changed` à chaque enregistrement des choix.

### Migration
- Schéma Prisma : 9 colonnes facultatives ajoutées à `candidates` → `npm run db:push` **avant** de déployer.

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
