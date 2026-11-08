# Changelog

## [0.7.1] – 2026-11-08 · Pays et numéros WhatsApp

### Modifié
- **Liste des pays complète** (245 pays et territoires, noms FR/EN figés dans `src/lib/countries-data.ts`) avec **champ de recherche** : recherche sans accents en français et en anglais (« cote », « morocco »), pays fréquents en tête, clavier ↑ ↓ Entrée Échap. La valeur enregistrée reste le nom français (« Cameroun », « RD Congo »…), comme les dossiers existants et les nationalités du catalogue d'offres.
- **Numéro WhatsApp** : indicatif dans une liste avec recherche (par pays ou par numéro, ex. « 33 »), numéro mis au **format du pays pendant la saisie** (ex. +237 → « 6 99 12 34 56 »), exemple du pays affiché dans le champ, collage d'un numéro international reconnu. Contrôle de longueur selon l'indicatif (`libphonenumber-js`). Valeur enregistrée inchangée (format international `+237699123456`).
- Appliqué au formulaire `/postuler` (candidat et parent/tuteur) et à la demande de partenariat. Le pays choisi devient l'indicatif par défaut tant qu'aucun numéro n'est saisi.

## [0.7.0] – 2026-11-06 · PACK-02 Moteur de recommandation

Catalogue : **`2027.09-v2`** (40 offres, dont 8 en vérification jamais proposées).

### Ajouté
- **Écran « Vos 3 offres recommandées »** après l'envoi du formulaire : cartes anonymisées (« Université *** – lieu »), rôle (🎯 Ambitieuse · ✅ Cible · 🛡️ Sécurité), référence, arguments, « Votre filière », date limite si connue ; message si moins de 3 offres ; repli « Nos offres [Langue / Licence] 2027 vous seront envoyées par un conseiller sur WhatsApp » ; mention « Montants indicatifs… Aucune admission n'est garantie. » ; lien vers la checklist avant le départ (PACK-09). FR/EN.
- Bouton **« Recevoir le détail sur WhatsApp »** : message pré-rempli avec le code dossier **et** les références (« Offres recommandées : MA-26, MA-17, MA-10 »).
- **Moteur** `src/lib/matching/` : port TypeScript à l'identique de `matching_reference.py` (`recommander.ts`), correspondance dossier → profil (`profil.ts`, OMM jamais automatique), projection publique et traduction anglaise des textes du catalogue (`public-offer.ts`).
- Catalogue `data/offres/offres_2027.json` et correspondance confidentielle `data/offres/offres_2027_internes.json`, lus **côté serveur uniquement** (`import "server-only"`) ; mode d'emploi dans `data/offres/README.md`.
- `/api/candidatures` : recommandations calculées et **enregistrées avec le dossier** (`recommendations` : `[{ref, role}]`, `matchingVersion`) ; la réponse ne contient que les champs publics (`ref`, `role`, `cycle`, `lieu_affiche`, `arguments`, `langue`, `duree`, `date_limite`, `filieres_correspondantes`).
- Fiche dossier du dashboard : offres recommandées avec la **vraie université**, le partenaire et la note interne (équipe seulement). Exports : colonne « Offres recommandées » (références seulement).
- Tests : les 5 profils de `fixtures_profils.json` (références, rôles, totaux identiques au script Python), exclusions (âge, moyenne, IELTS/TOEFL, certificat, HSK, relevé bancaire, nationalité, OMM, diplômes originaux), offres non publiables, correspondance formulaire → profil, absence de score/critères/nom réel dans la réponse publique, traduction anglaise complète.

### Migration
- `npm run db:push` (2 colonnes facultatives) **avant** de déployer — fait le 2026-11-06.

## [0.6.0] – 2026-11-06 · PACK-01 Formulaire de qualification

### Ajouté
- Étape 2 « Parcours » :
  - **filière du diplôme** (texte libre, obligatoire pour une Licence ou un Master, jamais pour Bac / Probatoire), avec autocomplétion non bloquante sur 345 filières (`content/filieres_suggestions.json`) ;
  - **moyenne structurée** : barème en boutons (`/20`, `/100 (%)`, `/4 (GPA)`, `/5`, « Je ne sais pas ») et valeur décimale (virgule acceptée) ; `moyenne_pct` calculée côté serveur (13,5/20 → 67,5) ;
  - **diplômes originaux** : Oui / Pas encore.
- Étape 3 « Projet » :
  - **certificat d'anglais** (IELTS, TOEFL, Duolingo, études en anglais, aucun), score borné (IELTS 0-9 au pas de 0,5, TOEFL 0-120, Duolingo 10-160) ; « Parlez-vous anglais ? » seulement sans certificat ;
  - **niveau HSK** (0 à 6, HSK 1-2 → 2) ;
  - **relevé bancaire** possible (tranches, `releve_bancaire_usd_max` : 0, 2 500, 5 000, 10 000 ou null) avec aide « Ce n'est pas un paiement » ;
  - **domaines souhaités** en choix multiple (2 maximum), nouvelle option « Éducation, langues, sport », codes stockés pour le PACK-02.
- **Brouillon** du formulaire dans `localStorage` (`odysseo_form_draft`) : restauré au retour (étape comprise), vidé après l'envoi, jamais le consentement.
- Base (`candidates`) : 11 colonnes facultatives (`degreeField`, `averageValue`, `averageScale`, `averagePct`, `originalDiplomas`, `studyFields[]`, `englishCertificate`, `englishScore`, `hskLevel`, `bankStatement`, `bankStatementUsdMax`). Correspondance avec les noms du pack dans `src/lib/qualification.ts`.
- Fiche dossier du dashboard et exports : filière, moyenne sur 100, diplômes originaux, certificat et score d'anglais, HSK, relevé bancaire.
- Tests : conversions, bornes des scores, règles des étapes 2 et 3, schéma serveur.

### Modifié
- Colonnes historiques conservées et remplies avec un texte lisible : `degreeAverage` (« 13,5/20 »), `fieldOfStudy` (libellés des domaines), `englishLevel` (« Oui » si certificat ou études en anglais). Les dossiers antérieurs restent lisibles.
- `age` : toujours calculé côté serveur à l'envoi (déjà en place).

### Migration
- `npm run db:push` (colonnes facultatives) **avant** de déployer — fait le 2026-11-06.

## [0.5.0] – 2026-11-05 · PACK-06 Preuves et confiance

### Ajouté
- Contenus pilotés par JSON, **vides au départ** (rien de faux ne s'affiche) : `content/temoignages.json`, `content/preuves.json`, `content/conseillers.json`, mode d'emploi dans `content/README.md`, dossiers `public/images/{temoignages,preuves,conseillers}/`.
- **Témoignages** : cartes (photo ronde `next/image`, prénom + initiale, pays et drapeau, cursus, ville en Chine — jamais l'université —, citation ≤ 300 caractères, lien vidéo YouTube/TikTok optionnel). Accueil : 3 au hasard, carrousel horizontal sur mobile ; pages cursus : filtrés par cursus. Affichés seulement si `publie: true` et date d'accord renseignée.
- **« Ce que vous recevez »** : jusqu'à 3 documents floutés (Admission Notice, JW202, visa X1) cliquables en plein écran, après « Nous prenons en charge » sur les pages cursus (jamais dans les brochures PDF).
- **Conseiller visible** : carte « Votre conseiller » (pied de page, accueil) si `conseillers.json` n'est pas vide.
- **Bouton WhatsApp flottant** (56 px, `aria-label`) sur toutes les pages publiques sauf `/postuler`, message pré-rempli avec le nom de la page ; numéro du premier conseiller, sinon `NEXT_PUBLIC_WHATSAPP_NUMBER`. Mesuré : `whatsapp_click` avec `source: "bouton_flottant"`.
- Tests : images publiées présentes et ≤ 150 Ko, université jamais nommée, citation ≤ 300 caractères, numéro WhatsApp au bon format.

### Modifié
- Événement `whatsapp_click` : propriété `location` renommée `source`.
- Pied de page : marge basse sur mobile pour que le bouton flottant ne cache pas le copyright.

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
