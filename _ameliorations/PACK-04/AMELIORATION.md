# PACK-04 · Mesure des conversions (publicités, références, abandons)
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN) sur Vercel._

## Contexte (constaté le 05/11/2026)
- Aucun outil de mesure détecté dans le code chargé : pas de Meta Pixel (`fbq`), pas de Google Analytics, pas de Vercel Analytics.
- Un bandeau cookies existe déjà (clé `localStorage` : `odysseo_cookie_consent`), ainsi qu'un identifiant anonyme (`odysseo_anon_id`).
- Le formulaire `/[locale]/postuler` compte 4 étapes et envoie vers `/api/candidatures`, puis ouvre WhatsApp avec un « code dossier ».
- Les publicités Odysseo utiliseront des codes de référence (ex. `P-04`, `MA-07`) et des liens UTM.
- **Problème actuel** : impossible de savoir quelle publicité produit des dossiers, ni à quelle étape les étudiants abandonnent.

## Objectif
1. Savoir pour chaque dossier d'où il vient (source, campagne, référence d'offre, partenaire).
2. Mesurer l'abandon étape par étape.
3. Envoyer à Meta un événement « Lead » fiable pour optimiser les publicités Facebook et Instagram.

## Tâches
1. **Explorer d'abord** : le composant du bandeau cookies (catégories de consentement), le composant du formulaire multi-étapes, la route `/api/candidatures` et le stockage utilisé (base de données, Google Sheets, etc.). Utiliser les mécanismes existants.
2. **Capture de l'origine (premier contact)** :
   - À la première visite, lire dans l'URL `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `fbclid`, `ref` (code d'offre, ex. `P-04`) et le code partenaire existant. Les stocker dans `localStorage` sous `odysseo_attribution`, avec la date et la page d'arrivée. Ne pas écraser une attribution existante de moins de 30 jours, sauf si l'URL contient un nouveau `utm_campaign`.
   - Joindre cet objet à l'envoi vers `/api/candidatures` et l'enregistrer avec le dossier (nouvelles colonnes ou nouveaux champs). Ce ne sont pas des données personnelles.
3. **Vercel Web Analytics** (sans cookie) : installer `@vercel/analytics`, ajouter `<Analytics />` dans le layout racine. Événements personnalisés : `form_step_view` (step 1-4), `form_submit_success`, `whatsapp_click`, `brochure_download` (cursus, langue).
4. **Meta Pixel, uniquement après consentement « marketing »** :
   - ID du pixel dans `NEXT_PUBLIC_META_PIXEL_ID` [À FOURNIR par le fondateur]. Si la variable est vide, ne rien charger.
   - Charger le script seulement quand le consentement marketing est donné, y compris quand il est donné en cours de visite. Le retirer, ou ne plus envoyer d'événements, si le consentement est retiré.
   - Événements : `PageView` ; `ViewContent` sur les pages cursus et offres (paramètre `content_ids: [ref]` quand il y a une référence) ; `Lead` à l'envoi réussi du formulaire, avec `content_category` = niveau visé et `event_id` = code dossier ; `Contact` au clic WhatsApp.
5. **API Conversions Meta (côté serveur, optionnel mais recommandé)** :
   - Si `META_CAPI_TOKEN` et `NEXT_PUBLIC_META_PIXEL_ID` sont définis, et seulement si le consentement marketing a été donné (transmis avec la candidature), envoyer depuis `/api/candidatures` un événement `Lead` avec le même `event_id` (déduplication).
   - Champs `em` et `ph` hachés en SHA-256 après normalisation (minuscules, téléphone en chiffres avec indicatif). Envoyer aussi `fbc` / `fbp` s'ils existent.
   - Ne jamais bloquer l'enregistrement du dossier si l'appel Meta échoue (try/catch + log).
6. Ajouter `NEXT_PUBLIC_META_PIXEL_ID` et `META_CAPI_TOKEN` dans `.env.example` avec un commentaire.
7. Mettre à jour la page `/[locale]/cookies` : mentionner Vercel Analytics (mesure d'audience sans cookie) et Meta Pixel (catégorie marketing, soumise à consentement).

## Critères d'acceptation
- [ ] Visiter `/fr/postuler?utm_source=facebook&utm_campaign=test&ref=P-04` puis envoyer un dossier de test : le dossier enregistré contient `utm_source=facebook`, `utm_campaign=test`, `ref=P-04`.
- [ ] Sans consentement marketing : aucune requête vers `facebook.com` / `connect.facebook.net` (vérifié dans l'onglet Réseau).
- [ ] Avec consentement : l'extension Meta Pixel Helper montre `PageView`, puis `Lead` à l'envoi du formulaire.
- [ ] Le gestionnaire d'événements Meta (Test Events) reçoit `Lead` une seule fois (navigateur + serveur dédupliqués).
- [ ] Dans le tableau de bord Vercel Analytics, les événements `form_step_view` 1 à 4 apparaissent.
- [ ] `npm run build` passe ; le formulaire fonctionne toujours si les variables Meta sont vides.

## Ne pas faire
- Ne pas envoyer de nom, d'e-mail ou de téléphone en clair à Meta ou à Vercel.
- Ne pas charger le pixel avant le consentement.

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-04 Mesure des conversions` dans `CHANGELOG.md`.
- Commit : `feat(analytics): attribution UTM/ref, Vercel Analytics, Meta Pixel + CAPI avec consentement (PACK-04)`.

## À fournir par le fondateur
- [ ] ID du Pixel Meta (Gestionnaire d'événements → Sources de données).
- [ ] Jeton de l'API Conversions (même endroit → Paramètres → Générer un jeton d'accès).
