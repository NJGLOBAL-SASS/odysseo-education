# PACK-11 · Offres de mars 2027 + rapport d'admissibilité automatique
_Consigne pour Claude Code. Projet : plateforme Odysseo (Next.js, Vercel), https://odysseo-education.vercel.app. Catalogue ajouté : `2027.03-v1` (14/11/2026). Ce pack est prioritaire sur les packs non encore appliqués._

## Le parcours voulu par le fondateur (il fait foi)
1. L'étudiant remplit le formulaire d'analyse. **Pas de compte, pas d'espace.** À l'écran : « Merci ! Votre analyse est en cours. Votre rapport d'admissibilité vous sera envoyé sur WhatsApp. » **Aucune offre n'est montrée à l'écran.**
2. **Tout de suite**, la plateforme calcule 3 à 4 offres et prépare un **brouillon de rapport**. L'équipe reçoit une alerte sur son téléphone.
3. Le fondateur relit, ajuste si besoin, clique **« Valider »**. La plateforme produit le **rapport PDF** et un **message WhatsApp prêt**. Il envoie le tout **à la main** sur WhatsApp (pas d'API WhatsApp pour l'instant).
4. L'étudiant donne son accord et fait le **1er versement** (ouverture du dossier).
5. Le fondateur clique **« 1er versement reçu »** : **c'est seulement là** que l'espace de suivi de l'étudiant est créé et que son lien lui est envoyé.

Règle absolue : **le nom réel de l'université n'apparaît jamais** (écran, PDF, nom du fichier PDF, propriétés du PDF, e-mail, WhatsApp, API publique) avant l'ouverture de l'espace.

## Fichiers fournis (dossier `packs/PACK-11/`)
| Fichier | Rôle |
|---|---|
| `data/offres_mars_2027.json` | 26 offres : Langue L-01→L-17, Bachelor B-01→B-07, MBBS MB-01, MB-02. Noms masqués |
| `data/offres_mars_2027_internes.json` | Réf. → vraie université + notes internes. **CONFIDENTIEL, serveur uniquement** |
| `data/tarifs.json` | Prix, 4 versements, règles, inclus/non inclus, validité du rapport (7 jours) |
| `matching_mars_reference.py` | Algorithme de référence (Python). **Il fait foi** |
| `fixtures_mars.json` | 7 profils de test et résultats attendus |
| `Rapport_Admissibilite_EXEMPLE.pdf` | **Maquette de référence** du rapport (données fictives). Le PDF généré doit lui ressembler : mêmes sections, même ordre, mêmes couleurs |
| `messages.md` | Textes : alertes équipe, message WhatsApp, relances |

---

## Étape 0 · Explorer d'abord (ne rien modifier)
Me résumer en 10 lignes avant de coder :
- le catalogue actuel (`offres_2027.json` : chemin, type TypeScript, `meta.version`) ;
- le moteur existant (`lib/matching/`, PACK-02) et ce qui se passe aujourd'hui pour « Langue » et « Licence » ;
- la route qui reçoit les candidatures, la base de données, le modèle « dossier » (champs, étapes) ;
- l'admin : liste des dossiers, écran de rapport (PACK-10), espace étudiant existant ou non ;
- `DOMAINE_VERS_FAMILLES` ;
- si le formulaire demande bien le **numéro WhatsApp** (obligatoire) et l'e-mail (facultatif) ;
- les tarifs déjà présents dans le code du site, s'il y en a (comparer avec `tarifs.json` et me signaler les écarts).

Si le PACK-02 n'est pas appliqué, porter aussi `recommander()` Master/PhD depuis `packs/PACK-02/` s'il existe ; sinon, faire ce pack pour Langue/Licence et me le signaler.

---

## Lot A · Catalogue
1. Fusionner les 26 offres dans le catalogue, **sans toucher aux P-xx et MA-xx**. Même format. `meta.version = "2027.09-v3+2027.03-v1"`, `meta.mise_a_jour = "2026-11-14"`.
2. Type d'offre : `cycle` accepte `"langue" | "bachelor" | "mbbs"` ; ajouter `rentree`, et en optionnel `cout_annuel_rmb`, `frais_langue_rmb`, `frais_candidature_rmb` ; critères optionnels `age_min`, `csca_requis`, `reserve_asie`.
3. Ajouter les familles absentes : `langue-chinoise` (« Langue chinoise »), `medecine-sante` (« Médecine & santé ») si absente. Vérifier que tous les slugs des nouvelles offres existent ; sinon me lister les écarts.
4. Fusionner `offres_mars_2027_internes.json` dans le fichier interne (serveur uniquement).
5. Pages offres publiques (PACK-03, si présent) : filtres « Langue », « Licence », « Médecine », « Rentrée mars 2027 ». Jamais d'offre `publiable === false` (L-14).
6. Placer `tarifs.json` dans les données du site et en faire **la seule source** des prix (rapport, pages). Aucun montant en dur.
   - **MBBS = sur devis** (`sur_devis: true`, pas de prix ni d'échéancier). Partout où un prix est affiché, gérer ce cas : afficher `texte_rapport` à la place du tarif et des 4 versements.

## Lot B · Moteur (Langue / Licence / Médecine)
7. Porter `recommander()` de `matching_mars_reference.py` en TypeScript (`lib/matching/recommanderMars.ts`), **à l'identique** :
   - exclusions : non publiable, date limite dépassée, âge hors `[age_min, age_max]`, `hsk_min` non atteint, `reserve_asie` ;
   - score : `pertinence×10 + valeur×3 + allocation_min/1000 − cout_annuel/10000` (+2 si `funding = bourse_uniquement` et coût nul) ; valeur or 3, argent 2, bronze 1 ;
   - tri : total décroissant puis référence ; ambitieuse → cible (autre ville) → sécurité (autre ville, la moins chère) ;
   - **4e offre facultative « alternative »** : en Licence, la meilleure restante ; en Langue, la meilleure Licence si l'étudiant a le bac (`proposer_bachelor`) ;
   - MBBS seulement si `medecine-sante` est choisi ; repli sur la Langue si aucune Licence n'est possible (`repli_langue`) ;
   - la date du jour est un paramètre (tests au `2026-11-14`).
8. Formulaire → profil : Langue → `cycle_vise: "langue"`, Licence → `"licence"`, Master/Doctorat → moteur existant. `domaines[]` → `familles`, `hsk`, `a_le_bac` (bac ou plus), `funding` comme au PACK-02.
9. Tests : chaque profil de `fixtures_mars.json` → références, rôles, `proposer_bachelor`, `repli_langue` **identiques**. Un test par exclusion. Les tests PACK-02 restent verts.

## Lot C · Candidature : calcul immédiat, rien d'affiché
10. À l'enregistrement d'une candidature : calculer les recommandations (moteur Master/PhD ou Mars selon le niveau) et créer le **brouillon de rapport** (`rapport.statut = "brouillon"`, offres + rôles, `moteur_version`, `catalogue_version`). Étape du dossier : `nouveau` → `rapport_pret`.
11. Écran de fin : **retirer l'affichage des offres** (s'il existe) et le remplacer par : « Merci {prénom} ! Votre analyse est en cours. Votre rapport d'admissibilité vous sera envoyé sur WhatsApp au {numéro}. Code de votre dossier : {code}. » + bouton WhatsApp vers Odysseo avec le code dossier (sans références d'offres).
12. Pas d'e-mail automatique à l'étudiant dans ce pack.

## Lot D · Alerte instantanée et relances (équipe)
13. `lib/notify/` : après l'enregistrement, **sans jamais bloquer la candidature** (try/catch + journal) :
    - **Telegram** : `POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, `chat_id = TELEGRAM_CHAT_ID` (groupe de l'équipe), modèle « Alerte nouveau profil » de `messages.md`, avec le lien direct vers le dossier dans l'admin ;
    - **E-mail** à `contact.odysseo@gmail.com` via Gmail SMTP (`nodemailer`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`), même contenu.
    - Variable manquante → canal ignoré avec un avertissement, sans erreur.
14. Route `/api/cron/relances` (protégée par `CRON_SECRET`), appelée **toutes les heures** par Vercel Cron (`vercel.json`) :
    - dossier en `rapport_pret` depuis plus de **2 h** → alerte « ⏰ rapport à valider », puis toutes les 6 h ;
    - dossier en `rapport_envoye` sans réponse depuis **48 h**, puis **5 jours** → alerte « 📞 relancer l'étudiant » avec le message de relance prêt (modèle de `messages.md`) ;
    - rapport arrivé à expiration (7 jours) → alerte « rapport expiré, à renouveler ? ».
    - Champ `derniere_relance` pour ne pas répéter. Si le plan Vercel limite les crons à 1 par jour, me le dire et proposer une solution gratuite (ex. cron-job.org qui appelle la route).

## Lot E · Admin : relire, valider, générer le PDF, envoyer à la main
15. Page d'accueil de l'admin = **« À valider »** : dossiers en `rapport_pret`, du plus ancien au plus récent, badge rouge au-delà de 2 h. Colonnes : code, prénom, niveau, âge, pays, domaines, offres proposées, temps d'attente.
16. Écran du dossier :
    - le profil déclaré complet ;
    - le brouillon : 3 ou 4 offres (ajouter / retirer / réordonner, **2 à 4 offres** choisies dans le catalogue, rôle de chacune), le **cursus facturé** (pré-rempli selon le niveau : langue, bachelor, mbbs, master, phd) et un commentaire du conseiller (500 caractères maximum, facultatif) ;
    - en dessous, pour la décision : les **notes internes** et le vrai nom des universités (visibles **uniquement** dans l'admin).
17. Bouton **« Valider et générer le rapport »** :
    1. fige le rapport (version, date, conseiller), `rapport.statut = "valide"`, date d'expiration = aujourd'hui + `validite_rapport_jours` ;
    2. génère le **PDF** côté serveur (`@react-pdf/renderer` ou équivalent compatible Vercel), conforme à `Rapport_Admissibilite_EXEMPLE.pdf` : en-tête noir/rouge avec le logo Odysseo du site, verdict, profil déclaré + mention « sous réserve de vérification », offres masquées, inclus/non inclus, tarif et 4 versements (depuis `tarifs.json` ; **si le cursus facturé est `mbbs`** : pas de tableau de tarif, phrase « sur devis » de `texte_rapport`, et l'encadré dit « Votre conseiller vous envoie votre devis sur WhatsApp » sans montant), encadré « Pour lancer votre dossier » avec le montant du 1er versement, les moyens de paiement, la première date limite et la date de validité, documents à préparer, signature « L'équipe Odysseo » ;
    3. nom du fichier : `Odysseo_Rapport_{code_dossier}.pdf` ; propriétés du PDF sans nom d'université ;
    4. affiche trois boutons : **« Télécharger le PDF »**, **« Copier le message WhatsApp »** (modèle de `messages.md`), **« Ouvrir WhatsApp »** (`https://wa.me/<numéro>?text=<message>`).
       - Numéro : chiffres seulement avec indicatif ; s'il commence par 6 et que le pays est le Cameroun, préfixer 237.
18. Bouton **« Marquer comme envoyé »** → `rapport_envoye` + date (point de départ des relances).
19. Boutons de suite : **« L'étudiant a choisi : [réf.] »** → `accord` ; **« Pas intéressé »** → `perdu` avec motif (prix, autre agence, pas de réponse, autre) ; **« Renouveler le rapport »** (rapport expiré : recalcul avec le catalogue du jour).
20. **Rattrapage** : bouton « Préparer les rapports en attente » + script `npm run backfill:rapports` qui crée un brouillon pour tous les dossiers existants sans rapport. **À lancer une fois après le déploiement.**
21. **Export CSV** des dossiers en attente (sans e-mail ni téléphone).

## Lot F · Espace étudiant : seulement après le 1er versement
22. Bouton **« 1er versement reçu »** (montant + date saisis à la main) → `ouvert`. **C'est le seul endroit qui crée l'espace de suivi** et son lien d'accès (mécanisme du PACK-10 s'il existe : lien sécurisé + 4 derniers chiffres du WhatsApp ; sinon, lien à jeton simple). Proposer « Copier le message WhatsApp d'ouverture » (modèle de `messages.md`).
23. Si le PACK-10 est déjà appliqué : supprimer l'accès à l'espace et l'étape « Je valide mon dossier » **avant** le paiement. L'espace commence à la checklist des documents.

## Étapes du dossier (récapitulatif)
`nouveau` → `rapport_pret` → `rapport_valide` → `rapport_envoye` → `accord` → `ouvert` (1er versement) → suite existante (documents, candidatures, admission, visa). Branches : `perdu`, `rapport_expire`.

## Variables d'environnement (Vercel → Settings → Environment Variables)
| Nom | Valeur |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Jeton donné par @BotFather |
| `TELEGRAM_CHAT_ID` | Identifiant du groupe de l'équipe (nombre négatif) |
| `GMAIL_USER` | `contact.odysseo@gmail.com` |
| `GMAIL_APP_PASSWORD` | Mot de passe d'application Google (16 caractères) |
| `CRON_SECRET` | Chaîne aléatoire |
| `ADMIN_BASE_URL` | URL de l'admin (ex. `https://odysseo-education.vercel.app/admin`) |

Les documenter dans `.env.example` (sans valeurs) et le README. **M'aider à récupérer `TELEGRAM_CHAT_ID`** : petit script `npm run telegram:chat-id` qui lit `getUpdates` et affiche les groupes trouvés.

## Critères d'acceptation
- [ ] Les 7 tests de `fixtures_mars.json` passent, ainsi que ceux du PACK-02.
- [ ] Après une candidature de test : aucune offre à l'écran ; brouillon créé ; alerte Telegram + e-mail reçus en moins d'une minute.
- [ ] La candidature est enregistrée même si Telegram ou Gmail sont en panne (tester avec un faux jeton).
- [ ] Profil « Licence, 19 ans, informatique, bourse uniquement » → brouillon avec B-01, B-05, B-07, B-04.
- [ ] Le PDF généré ressemble à la maquette, tient en 2 pages pour 4 offres, affiche 2 900 000 FCFA et 200 000 FCFA pour un Bachelor (lus dans `tarifs.json`), et « sur devis » sans aucun montant pour un dossier MBBS.
- [ ] Aucun nom réel d'université, ni « RK », ni score, ni note interne dans : HTML et JS publics, PDF (texte et propriétés), nom du fichier, message WhatsApp, réponses d'API publiques.
- [ ] Aucun espace étudiant n'existe avant « 1er versement reçu ».
- [ ] Les relances à 2 h, 48 h et 5 jours se déclenchent (tester en avançant les dates).
- [ ] Le rattrapage a préparé les rapports des dossiers existants.
- [ ] `npm run build` et tous les tests passent.

## Ne pas faire
- Pas d'envoi WhatsApp automatique (API WhatsApp Business : phase suivante).
- Pas de prix Odysseo sur les pages publiques ajoutées par ce pack.
- Ne pas modifier les pondérations sans mettre à jour `matching_mars_reference.py` et `fixtures_mars.json`.

## Fin du pack
- Version mineure +1 dans `package.json`, entrée `PACK-11 Offres mars 2027 + rapport d'admissibilité` dans `CHANGELOG.md`.
- Commit : `feat: offres mars 2027, rapport d'admissibilité PDF, alertes et espace après 1er versement (PACK-11)`.
- Me donner à la fin : les variables à créer, les étapes de test manuel, et le nombre de rapports préparés par le rattrapage.
