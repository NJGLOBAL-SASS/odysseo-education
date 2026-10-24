# Odysseo Education — Plateforme de gestion

Documentation technique et fonctionnelle de la plateforme Next.js qui remplace le
formulaire HTML statique + Google Sheet actuel. Source du besoin : `Prompt_Odysseo_Management_Platform.txt`.

---

## 1. Ce qui a changé par rapport à l'existant

| Avant | Maintenant |
|---|---|
| Formulaire HTML unique, envoi vers Google Apps Script → Google Sheet | Application Next.js (frontend + backend) avec base Postgres |
| Aucun suivi visuel des dossiers | Tableau de bord `/dashboard` (pipeline, recherche, statuts) |
| Aucune identification de la source d'un client | Programme partenaires : code de parrainage + points (voir §5) |
| Pas d'authentification | Connexion email/mot de passe + Google, 2FA (TOTP) |
| Français uniquement | FR / EN (next-intl) |
| Pas de notifications | Email + WhatsApp + Push à chaque nouveau dossier |
| Un seul site, pas de séparation public/équipe | `odysseo-education.com` (public) / `team.odysseo-education.com` (équipe) — aucun lien de l'un vers l'autre (voir §5) |
| Export manuel depuis le Google Sheet | Export CSV / Excel / PDF aux couleurs Odysseo depuis le dashboard, en ligne **et hors-ligne** (voir §9) |
| — | Miroir automatique des candidatures dans un Google Sheet, en parallèle de la base (voir §10) |

Le formulaire public (`/postuler`) reproduit fidèlement les 4 étapes et la logique
du formulaire original (champs, validations, bloc parent/tuteur conditionnel,
indicatif téléphonique auto, anti-robot par honeypot + délai minimum, écran de
confirmation avec code dossier et bouton WhatsApp).

---

## 2. Stack technique

- **Next.js 14** (App Router, Server Components) + TypeScript
- **PostgreSQL** via **Prisma** (`prisma/schema.prisma`)
- **Auth.js / NextAuth v5** — email+mot de passe, Google OAuth, 2FA TOTP
- **Tailwind CSS** — design repris du formulaire actuel (noir `#0B0B0D`, rouge `#FF0000`, Inter)
- **next-intl** — FR/EN, routage `/fr/...` et `/en/...`
- **lucide-react** — icônes
- **API Brevo** (email transactionnel), **WhatsApp Cloud API** (fetch HTTP), **web-push** (notifications push)
- **googleapis** — miroir des candidatures dans un Google Sheet
- **exceljs** / **pdfkit** — exports Excel / PDF aux couleurs Odysseo
- **zod** — validation des entrées API
- Service worker + **IndexedDB** — consultation et export hors-ligne du dashboard

---

## 3. Démarrage

```bash
npm install
cp .env.example .env        # puis renseigner DATABASE_URL, AUTH_SECRET, etc.
npm run db:push             # crée les tables (ou npm run db:migrate en dev itératif)
npm run db:seed             # crée un compte admin + un partenaire de démo
npm run dev
```

Identifiants créés par le seed :
- Admin : `admin@odysseo-education.com` / `ChangeMoi123!` (à changer immédiatement)
- Partenaire démo : code `DEMO-001`

### Variables d'environnement clés (`.env.example`)

- `DATABASE_URL` — connexion Postgres
- `AUTH_SECRET`, `NEXTAUTH_URL` — Auth.js
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — connexion Google (Google Cloud Console)
- `TEAM_HOSTNAME` — domaine du dashboard équipe (défaut `team.odysseo-education.com`, voir §5)
- `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` — email transactionnel (app.brevo.com)
- `GOOGLE_SHEETS_SPREADSHEET_ID` / `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` / `GOOGLE_SHEETS_TAB_NAME` — miroir Google Sheet (voir §10)
- `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_ADMIN_NUMBER` — WhatsApp Cloud API (Meta for Developers)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (+ `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) — notifications push (`npx web-push generate-vapid-keys`)

Tant que ces clés ne sont pas renseignées, chaque intégration se dégrade proprement
(log d'avertissement, entrée `NotificationLog` marquée `FAILED`) sans jamais faire
planter la soumission du formulaire.

---

## 4. Structure du projet

```
src/
  app/
    [locale]/
      (marketing)/        site public : accueil, services, /postuler, /partenaires (aucun lien équipe)
      (auth)/              /login, /verify-2fa — réservés au sous-domaine équipe (voir §5)
      dashboard/            back-office protégé (session staff requise)
      espace-partenaire/   portail partenaire (accès par code, voir §6.3)
    api/
      export/[resource]/    export CSV/Excel/PDF (voir §9)
      candidatures, partners, newsletter, auth, cookies, push/subscribe
    r/[code]/               lien de parrainage court -> journalise le clic + redirige vers /postuler
  components/
    forms/intake/           formulaire multi-étapes (4 steps, validation, écran de confirmation)
    dashboard/               sidebar, tableaux, badges de statut, export, bannière hors-ligne, widgets 2FA/push
    marketing/                hero, services, newsletter, trust section
    layout/, cookies/         header/footer/langue, bandeau cookies
  hooks/
    use-offline-dataset.ts    cache IndexedDB + détection hors-ligne (voir §11)
  lib/
    auth.ts, auth-2fa.ts, pending-2fa-token.ts   authentification + 2FA
    notifications/            email.ts (Brevo), whatsapp.ts, push.ts, index.ts (orchestrateur)
    google-sheets.ts           miroir des candidatures (voir §10)
    export/                    csv.ts, excel.ts, pdf.ts, columns.ts, index.ts (voir §9)
    offline/db.ts               wrapper IndexedDB (voir §11)
    points.ts                  barème et attribution des points partenaires
    validations/intake.ts      schéma zod + helpers (âge, normalisation téléphone)
  i18n/                        config next-intl, messages fr.json / en.json
  middleware.ts                routage i18n + séparation des domaines public/équipe (voir §5)
prisma/
  schema.prisma                modèle de données complet
  seed.ts                      admin + partenaire de démo
public/
  images/                      assets renommés (voir §7)
  sw.js, manifest.webmanifest   app shell hors-ligne du dashboard (voir §11)
```

---

## 5. Séparation des domaines public / équipe

Demande explicite : **aucun lien ou référence à l'espace équipe ne doit
apparaître sur le site public**. Déploiement cible :

- `odysseo-education.com` → site public (accueil, services, `/postuler`, newsletter, `/partenaires`)
- `team.odysseo-education.com` → dashboard équipe (`/login`, `/verify-2fa`, `/dashboard/*`)

C'est **un seul déploiement Next.js** (un seul build, une seule base de
données) ; la séparation se fait par nom d'hôte dans `src/middleware.ts` :

- Sur le domaine public, toute tentative d'accès à `/login`, `/verify-2fa` ou
  `/dashboard/*` renvoie une 404 — ces routes n'existent tout simplement pas
  de ce côté. Le header public (`src/components/layout/header.tsx`) ne
  contient plus aucun lien vers l'espace équipe.
- Sur `team.odysseo-education.com`, seules ces mêmes routes sont accessibles ;
  tout le reste (accueil, services, formulaire candidat...) renvoie une 404 et
  `/` redirige directement vers `/dashboard`.
- En développement local, utiliser `team.localhost:3000` (résolu nativement
  vers `127.0.0.1` par les navigateurs modernes, sans modifier `/etc/hosts`)
  pour tester la zone équipe, et `localhost:3000` pour le site public.
- Le nom de domaine équipe est configurable via `TEAM_HOSTNAME` (`.env`).

En production, pointer les deux sous-domaines (DNS) vers le même déploiement
(même projet Vercel, par exemple, avec les deux domaines ajoutés dans ses
réglages) — le routage par Host fait le reste.

---

## 6. Programme partenaires — remplace l'idée de « signature »

Le prompt d'origine proposait une **signature manuscrite** pour savoir qui a
« amené » un client, avec des points pour récompenser les apporteurs d'affaires,
en demandant explicitement une meilleure solution si j'en avais une.

**Recommandation retenue : code de parrainage + lien traçable**, plutôt qu'une
signature :

- Une signature ne peut pas être vérifiée automatiquement, n'est pas horodatée de
  façon fiable, et ne fonctionne pas pour un partage en ligne (WhatsApp, réseaux
  sociaux) — qui est pourtant le canal réel d'acquisition évoqué dans le prompt.
- Un **code de parrainage unique par partenaire** (ex. `AUDY-012`) couplé à un
  **lien court `/r/AUDY-012`** résout le même besoin sans intervention manuelle :
  - le clic est journalisé (`ReferralEvent`, type `LINK_CLICK`) ;
  - si le candidat soumet le formulaire, le dossier est automatiquement rattaché
    au partenaire (`Candidate.partnerId`), que le lien ait été cliqué ou que le
    candidat ait simplement tapé le code au champ « Nom du partenaire » (étape 4) ;
  - c'est 100 % auditable a posteriori (qui, quand, quel dossier).

### 6.1 Barème de points (`src/lib/points.ts`)

| Événement | Points |
|---|---|
| Nouveau dossier soumis avec le code | 1 |
| Dossier passé au statut « Qualifié » | 5 |
| Étudiant admis | 20 |
| Ajustement manuel (admin) | libre (`/api/partners/[id]/points`) |

Le barème est isolé dans une constante (`POINTS_RULES`) pour rester modifiable
sans toucher à la logique métier.

### 6.2 Tableau de bord partenaires (`/dashboard/partenaires`)

Permet à l'équipe de créer un partenaire (génère automatiquement son code), de
copier son lien de parrainage, et de suivre son nombre de dossiers apportés et
son solde de points.

### 6.3 Espace partenaire (`/espace-partenaire/[code]`)

**Choix de scope assumé** : dans cette v1, l'accès à l'espace partenaire se fait
par le code de parrainage (comme un lien privé partagé par l'équipe), **sans
mot de passe dédié** — le modèle `Partner` n'a volontairement pas de champ
d'authentification. C'est pourquoi `/espace-partenaire/*` est exclu de la
protection par session dans `src/middleware.ts`.

**Piste d'évolution recommandée avant mise en production** si l'espace doit
rester confidentiel même en cas de fuite du lien : ajouter une authentification
par lien magique envoyé par email (`NextAuth` supporte nativement un provider
Email) plutôt qu'un système de mot de passe supplémentaire à gérer pour des
partenaires externes.

---

## 7. Assets — mapping ancien nom → nouveau nom

Les fichiers du dossier `asset/` (noms d'export génériques du type `647.JPG`)
ont été renommés pour être explicites, puis copiés dans `public/images/` avec
une organisation par usage :

| Ancien nom | Nouveau nom | Usage |
|---|---|---|
| `572.PNG` | `logo-full-black.png` | Logo complet noir (fonds clairs) |
| `576.PNG` | `logo-full-white.png` | Logo complet blanc (header, footer, dashboard) |
| `573.PNG` | `logo-mark-black.png` | Pictogramme seul, noir |
| `575.PNG` | `logo-mark-white.png` | Pictogramme seul, blanc → source du favicon |
| `574.PNG` | `logo-wordmark-white.png` | Texte « Odysseo » seul, blanc (sans tagline) |
| `578.PNG` | `brand-guidelines-sheet.png` | Planche de référence des 3 variantes du logo (documentation uniquement) |
| `579.JPG` | `logo-white-raw-screenshot.jpg` | Capture d'écran brute (UI Photos visible) — **non utilisée dans l'app**, conservée pour archive |
| `5271.PNG` | `hero-banner-home.png` (→ `hero-banner-home.jpg` optimisé) | Bannière d'accueil (`/`, `/postuler`) |
| `647.JPG` | `service-00-cover-nos-services.jpg` | Bandeau de couverture section « Nos services » |
| `648.JPG` | `service-01-orientation-evaluation.jpg` | Carte service 1 — Orientation et évaluation du profil |
| `649.JPG` | `service-02-recherche-bourses.jpg` | Carte service 2 — Recherche et sélection des bourses |
| `651.JPG` | `service-04-gestion-candidatures.jpg` | Carte service 4 — Gestion et suivi des candidatures |
| `652.JPG` | `service-05-dossier-optimisation.jpg` | Carte service 5 — Constitution et optimisation du dossier |

> Note : il manque un visuel « étape 3 » dans les fichiers fournis — la section
> Services n'affiche donc que 4 cartes (1, 2, 4, 5). Ajouter l'asset manquant
> dans `public/images/services/service-03-....jpg` et l'entrée correspondante
> dans `src/components/marketing/services-section.tsx` si ce visuel est retrouvé.

Les originaux renommés restent dans `asset/` ; des copies organisées (et, pour
la bannière, optimisées en JPEG ~380 Ko au lieu d'1,6 Mo en PNG) vivent dans
`public/images/{logo,hero,services,brand-reference}/`.

---

## 8. Authentification & 2FA — comment ça marche

`/login` et `/verify-2fa` vivent dans le groupe de routes `(auth)` et ne sont
accessibles que sur `team.odysseo-education.com` (voir §5) — aucune page
publique n'y renvoie.

1. `/login` : l'utilisateur saisit email + mot de passe → `POST /api/auth/password-check`.
   - Si la 2FA n'est pas activée : connexion directe via `signIn("credentials", {mode:"password", ...})`.
   - Si la 2FA est activée : un cookie signé de courte durée (« pending », 5 min)
     est posé, et l'utilisateur est redirigé vers `/verify-2fa`.
2. `/verify-2fa` : l'utilisateur saisit le code à 6 chiffres de son app
   d'authentification → `POST /api/auth/2fa/verify` vérifie le code TOTP contre
   le secret stocké, puis émet un jeton d'assertion (1 min).
3. Le client appelle `signIn("credentials", {mode:"2fa-assertion", assertionToken})`
   → le provider Credentials vérifie ce jeton et crée la session NextAuth finale.

Ce flux en deux temps évite de créer une session tant que les deux facteurs ne
sont pas validés, sans dépendre d'un state serveur additionnel (tout est porté
par des JWT signés avec `AUTH_SECRET`, via la librairie `jose`).

Activation de la 2FA : `/dashboard/parametres` génère un secret + QR code
(`/api/auth/2fa/setup`), l'utilisateur scanne avec Google Authenticator / Authy,
confirme avec un premier code (`/api/auth/2fa/enable`) qui persiste le secret.

**Protection des routes** : `src/middleware.ts` fait une vérification légère
(présence du cookie de session) pour `/dashboard/*` — en edge runtime, on ne
peut pas interroger Prisma. La vérification faisant autorité a lieu ensuite
côté serveur dans `src/app/[locale]/dashboard/layout.tsx` via `auth()`.

---

## 9. Exports CSV / Excel / PDF aux couleurs Odysseo

Chaque liste du dashboard (candidatures, partenaires, newsletter) propose trois
boutons d'export (`src/components/dashboard/export-buttons.tsx`), servis par
`GET /api/export/[resource]?format=csv|xlsx|pdf` (`src/lib/export/`,
`runtime = "nodejs"` car `exceljs`/`pdfkit` ont besoin de l'environnement Node).

Charte appliquée à chaque document :
- **En-tête** : logo Odysseo (`logo-full-black.png`), titre du jeu de données,
  date de génération et nombre de lignes.
- **Pied de page** : `odysseo-education.com — Document confidentiel` (+
  pagination pour le PDF).
- **Couleurs** : en-tête de colonnes noir `#0B0B0D` / texte blanc, liseré rouge
  `#FF0000`, lignes zébrées en gris clair `#F4F4F6` — mêmes tokens que
  `tailwind.config.ts`.
- **Filigrane** : pour le **PDF**, texte « ODYSSEO » pivoté à 35°, gris très
  clair, dessiné derrière le contenu sur chaque page (`src/lib/export/pdf.ts`,
  via `pdfkit`). Pour **Excel**, `exceljs` ne permet pas nativement un
  filigrane diagonal transparent ; le choix assumé est un bandeau de marque en
  haut de feuille (texte « ODYSSEO » en gris très clair) plutôt qu'un rendu
  dégradé en tentant de forcer un effet non supporté par la librairie.
- **CSV** : UTF-8 avec BOM (affichage correct des accents à l'ouverture dans Excel).

Le module `src/lib/export/columns.ts` centralise la liste et le libellé des
colonnes par ressource — à modifier à un seul endroit si un champ doit être
ajouté ou retiré d'un export.

> **Déploiement** : `pdfkit` embarque ses métriques de police dans le paquet
> npm lui-même (`node_modules/pdfkit/js/font/data/*.afm`) — vérifier après le
> premier déploiement que l'export PDF fonctionne réellement en production
> (certaines configurations serverless personnalisées, type build Docker
> multi-étapes, peuvent omettre ces fichiers si `node_modules` n'est pas copié
> intégralement). Sur Vercel/Next.js standard, cela fonctionne sans configuration.

---

## 10. Miroir Google Sheets

Demande explicite : garder un accès aux données sans passer par le dashboard.
`src/lib/google-sheets.ts::appendCandidateRow()` est appelé (non bloquant,
comme les notifications) à chaque nouvelle candidature (`POST /api/candidatures`)
et ajoute une ligne au Google Sheet configuré — avec création automatique de la
ligne d'en-têtes si l'onglet est vide.

Mise en place :
1. Créer un compte de service sur console.cloud.google.com, activer l'API Google Sheets.
2. Générer une clé JSON → renseigner `GOOGLE_SHEETS_CLIENT_EMAIL` et
   `GOOGLE_SHEETS_PRIVATE_KEY` (conserver les `\n` littéraux, le code les
   reconvertit en retours à la ligne).
3. Partager le Google Sheet cible en **Éditeur** avec l'email du compte de service.
4. Renseigner `GOOGLE_SHEETS_SPREADSHEET_ID` (dans l'URL du sheet) et
   `GOOGLE_SHEETS_TAB_NAME` (défaut `Candidatures`).

Tant que ces variables ne sont pas renseignées, la synchronisation est ignorée
avec un avertissement en log — elle ne bloque jamais l'enregistrement du dossier
en base, qui reste la source de vérité (le Sheet n'est qu'un miroir pratique).

---

## 11. Mode hors-ligne du dashboard

Le dashboard équipe reste consultable (et exportable en CSV) sans connexion
internet, via deux mécanismes complémentaires :

- **Les données** : `src/hooks/use-offline-dataset.ts` tente de charger chaque
  liste (candidatures, partenaires, newsletter) depuis son API ; en cas
  d'échec réseau, il retombe sur la dernière copie mise en cache en
  **IndexedDB** (`src/lib/offline/db.ts`) et affiche un bandeau « Mode
  hors-ligne » (`OfflineBanner`) avec la date de la dernière synchronisation.
  Les actions qui nécessitent le serveur (changement de statut, ajout de
  partenaire, copie de lien) sont désactivées dans cet état.
- **L'app shell** : `public/sw.js` (service worker, enregistré automatiquement
  à l'arrivée sur `/dashboard`) met en cache les pages et assets du dashboard
  déjà visités, pour que l'application elle-même puisse se charger sans réseau
  — sans quoi même des données en cache IndexedDB seraient inutiles, faute de
  pouvoir afficher la page. Les appels `/api/*` ne sont jamais mis en cache par
  le service worker (la fraîcheur prime en ligne ; IndexedDB prend le relais
  hors-ligne). Un `public/manifest.webmanifest` rend aussi le dashboard
  installable comme une app (PWA) sur les postes de l'équipe.

**Export hors-ligne** : le CSV fonctionne intégralement hors-ligne (généré
côté client avec les données en cache, zéro dépendance). Les exports **Excel et
PDF restent désactivés hors-ligne** (grisés, avec une infobulle) — choix assumé
pour ne pas alourdir le bundle client avec deux moteurs de rendu PDF/Excel
redondants avec ceux déjà utilisés côté serveur ; le CSV couvre l'essentiel du
besoin de portabilité des données en l'absence de réseau. Piste d'évolution si
nécessaire : embarquer `exceljs` (déjà isomorphe navigateur/Node) côté client
pour un export Excel hors-ligne.

**Portée assumée** : seules les 3 listes (candidatures, partenaires,
newsletter) sont consultables hors-ligne. La vue détail d'un dossier
(`/dashboard/candidatures/[id]`), la vue d'ensemble (stats) et les paramètres
restent des pages serveur classiques — elles ne sont consultables hors-ligne
que si déjà visitées en ligne (mises en cache par le service worker), sans
données nécessairement à jour.

---

## 12. Notifications

`src/lib/notifications/index.ts::notifyNewCandidate()` est appelé après chaque
soumission de formulaire réussie (de façon non bloquante — un échec de
notification n'empêche jamais l'enregistrement du dossier). Trois canaux
indépendants, chacun avec son propre log (`NotificationLog`) :

- **Email** (`email.ts`) — API transactionnelle **Brevo** (`BREVO_API_KEY`).
  Appel HTTP direct (`https://api.brevo.com/v3/smtp/email`), pas de SDK.
- **WhatsApp** (`whatsapp.ts`) — WhatsApp Cloud API (Meta for Developers), appel
  HTTP direct, pas de SDK tiers.
- **Push** (`push.ts` + `public/sw.js`) — Web Push standard (VAPID). Le staff
  active la réception depuis `/dashboard/parametres` (bouton « Activer les
  notifications push »).

Tant qu'une intégration n'a pas ses clés renseignées dans `.env`, elle logue un
avertissement et marque l'entrée `FAILED` au lieu de lever une exception.

---

## 13. Internationalisation

- `src/i18n/messages/fr.json` et `en.json` couvrent : navigation, accueil,
  services, formulaire de candidature (tous les champs/erreurs/étapes),
  newsletter, cookies, authentification, tableau de bord, espace partenaire.
- Routage : `/fr/...` et `/en/...` (`localePrefix: "always"`), sélecteur de
  langue dans le header.
- **Simplification assumée** : les champs à choix multiples texte-libre (diplôme,
  domaine d'études) sont stockés en base avec le libellé affiché dans la langue
  de soumission (le champ `Candidate.locale` l'indique). Si une consolidation
  multilingue stricte est nécessaire plus tard, migrer ces champs vers des clés
  d'énumération stables plutôt que du texte.

---

## 14. Pipeline des candidatures

`CandidatePipelineStatus` (Prisma) : `NOUVEAU → QUALIFIE → DOSSIER_EN_COURS →
BOURSE_SOUMISE → ADMIS → VISA_EN_COURS → CLOTURE` (+ `REFUSE`). Modifiable
depuis la fiche dossier (`/dashboard/candidatures/[id]`) ; chaque changement
vers `QUALIFIE` ou `ADMIS` déclenche l'attribution de points au partenaire
source s'il y en a un (voir §6.1).

---

## 15. Conformité cookies

Bandeau (`CookieConsentBanner`) avec 3 catégories (nécessaires / mesure
d'audience / marketing), préférence stockée en `localStorage` **et** journalisée
côté serveur (`CookieConsentLog`) à des fins de preuve. Aucun cookie non
essentiel n'est posé avant consentement explicite dans ce scaffold (aucun outil
d'analytics n'est câblé par défaut — à brancher conditionnellement au
consentement `analytics` si besoin).

---

## 16. Limites connues de ce scaffold / prochaines étapes

- Espace partenaire sans mot de passe dédié (voir §6.3).
- Pas de tests automatisés (unitaires/E2E) — à ajouter avant mise en prod.
- Visuel « étape 3 » des services manquant dans les assets fournis.
- Les intégrations Brevo/WhatsApp/push/Google Sheets nécessitent leurs clés
  d'API réelles pour fonctionner en conditions réelles ; elles sont
  scaffoldées mais pas activées par défaut.
- Pas de pagination sur les listes (candidatures limitées à 100, newsletter à
  500) — à ajouter si le volume le justifie (impacte aussi la taille du cache
  hors-ligne, voir §11).
- Mode hors-ligne limité aux 3 listes du dashboard, pas à l'ensemble des pages
  (voir §11 « Portée assumée »). Export Excel/PDF non disponible hors-ligne
  (CSV uniquement).
- Filigrane Excel approximé par un bandeau de marque plutôt qu'un rendu
  diagonal transparent (limite technique d'ExcelJS, voir §9).

---

## 17. Déploiement

Compatible Vercel (ou tout hébergeur Node 18+), **un seul déploiement pour les
deux domaines** (voir §5) :

```bash
npm run build
npm run start
```

1. Ajouter les deux domaines au projet (`odysseo-education.com` et
   `team.odysseo-education.com`) pointant vers le même déploiement.
2. Renseigner `TEAM_HOSTNAME=team.odysseo-education.com` dans les variables
   d'environnement de production.
3. Exécuter `npm run db:migrate deploy` (ou `db:push` en environnement simple)
   contre la base de production avant le premier déploiement.
4. Configurer toutes les variables d'environnement de `.env.example`
   (Brevo, Google OAuth, Google Sheets, WhatsApp, VAPID) dans les réglages du
   projet.
5. Vérifier après déploiement que `GET /api/export/candidatures?format=pdf`
   fonctionne réellement (voir l'avertissement pdfkit en §9).
