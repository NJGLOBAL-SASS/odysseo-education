# Changelog

## [0.13.0] – 2026-11-10 · PACK-11 Inscription partenaire, validation et contrat signé en ligne

**Avant :** le partenaire déposait une demande courte sur `/partenaires` (nom, contact, profil, motivation). L'équipe l'acceptait dans le tableau de bord, et il recevait aussitôt son code et son lien de parrainage, actifs immédiatement.
**Maintenant :** demande complète, confirmation par l'équipe, contrat généré avec ses informations et signé en ligne (case, nom, code à usage unique). Le lien de parrainage ne s'active qu'à la signature. Les 3 partenaires inscrits avant ce pack ne sont pas concernés (décision du fondateur) : statut « non_requis », lien inchangé.

### Ajouté
- **`/partenaires/inscription`** : prénom, nom, pays, ville, WhatsApp, e-mail, pièce d'identité (type + numéro), profil, réseaux, estimation, moyen et numéro de paiement (le WhatsApp par défaut), accord.
  - Au plus 3 demandes par numéro et par IP sur 24 h.
  - Une seule demande par numéro ou par e-mail.
  - `/partenaires` garde sa présentation, avec un bouton vers ce formulaire.
- **Tableau de bord → Partenaires → Demandes** :
  - statuts : demande reçue / refusée / contrat envoyé / lien expiré / actif ;
  - **Confirmer et envoyer le contrat** : code partenaire au format existant, contrat `ODY-P-AAAA-NNNN`, lien de signature valable 14 jours envoyé par e-mail ;
  - **Refuser** ; **Modifier** (avant confirmation) ; **Renvoyer le lien** (l'ancien ne marche plus) ;
  - **Ouvrir WhatsApp** avec le message prérempli ; **Télécharger le contrat signé** ;
  - historique des statuts (date, auteur) ;
  - « nouvelle version disponible » et **Demander la signature de la nouvelle version**.
- **Page de signature `/partenaires/contrat/[jeton]`** :
  - contrat rempli lisible sur mobile, avec le tableau des commissions calculé depuis la configuration (Master palier Argent = 510 000 FCFA) ;
  - aperçu PDF avec le filigrane « APERÇU », sans la signature du fondateur ;
  - case active seulement en bas du contrat ; nom identique à la demande (sans tenir compte des majuscules ni des accents) ;
  - code à 6 chiffres par e-mail : valable 10 min, 5 essais, 3 envois par heure ;
  - écran final avec le lien, le bouton Copier, le PDF signé (24 h) et l'accès au tableau de bord ;
  - lien expiré ou déjà utilisé : page « Ce lien n'est plus valable ».
  - Page jamais indexée, sans Meta Pixel ni mesure d'audience (le jeton est dans l'URL), sans « Referer ».
- **PDF signé** (pdfkit, A4, 2 pages) :
  - logo ; signature du fondateur et cachet superposé (rotation −8°, opacité 0,85) ;
  - « Signé électroniquement par… le… · code confirmé sur… » ;
  - pied de page « Contrat n° · version · empreinte · page X/Y ».
  - Empreinte SHA-256 du contenu et du fichier.
  - Envoyé par e-mail au partenaire, avec copie à contact.odysseo@gmail.com (`CONTRACT_COPY_EMAIL`).
- **Preuve d'acceptation** (`partner_contract_acceptances`) : instantané des champs, nom saisi, canal et destination masquée, date, IP, navigateur, empreinte. Aucune modification ni suppression depuis l'interface.
- **Attribution** : un code dont le contrat n'est pas signé n'attribue aucun étudiant (lien `/r/`, formulaire, cookie). L'événement `ATTRIBUTION_BLOCKED` est journalisé.
- **Espace partenaire** : rappel « signez votre contrat » et « Recevoir mon contrat signé par e-mail ». Le PDF n'y est pas téléchargeable : la page s'ouvre avec le seul code, qui est public.

### Sécurité et données
- Signature du fondateur et cachet rangés dans `content/contrats/`, **hors de `public/`** : jamais servis par le site.
- Tant que `content/contrats/signature_fondateur.png` manque, « Confirmer » affiche « Signature du fondateur manquante » et aucun contrat ne part.
- Pièce d'identité et numéro de paiement : visibles seulement dans le tableau de bord et le PDF, jamais dans l'espace partenaire ni dans les e-mails d'alerte.
- PDF signés stockés dans la base (jamais d'URL publique).
- Configuration (`config/contrat_partenaire.config.json`) lue côté serveur uniquement. Un test vérifie que ses prix restent égaux à ceux des cursus.

### Corrigé
- Transactions de la base plus robustes quand la connexion est lente : la signature est groupée en un seul envoi, et les autres transactions ont un délai de 20 s.

### Migration
- `npm run db:push` : colonnes facultatives sur `partners` et `partner_applications`, tables `partner_contracts`, `partner_contract_otps`, `partner_contract_acceptances`, `partner_status_events`, valeur `ATTRIBUTION_BLOCKED`. Fait le 2026-11-10 ; ajouts uniquement.

### À fournir
- `content/contrats/signature_fondateur.png` (scan PNG, fond transparent, 600 px de large minimum), à ajouter au dépôt.

## [0.12.0] – 2026-11-10 · PACK-10 Espace dossier (rapport, validation, documents)

Adapté aux décisions du fondateur : tout se passe dans l'**espace étudiant existant** (pas de lien magique ni de code à 4 chiffres) ; le **nom réel de l'université** n'apparaît jamais automatiquement ; le **parent** ne voit que l'état des documents.

### Ajouté
- **Rapport d'admissibilité** (fiche dossier → « Rapport et documents ») :
  - 2 à 4 offres du catalogue (pré-remplies avec les recommandations), ordre, rôle, commentaire de 500 caractères, cursus facturé ;
  - « Publier le rapport » : notification e-mail + push, étape « Rapport d'admissibilité envoyé » ;
  - message WhatsApp à copier, toujours en français.
- **Espace étudiant, page « Mon rapport »** :
  - offres anonymisées, tarif et échéancier lus depuis les données des cursus ;
  - case des conditions générales et « Je valide mon dossier » (étudiant seulement) ;
  - date, IP et version enregistrées ; étape « Dossier validé ».
  - Un rapport republié doit être revalidé.
- **Révélation du nom de l'université**, offre par offre, par l'équipe : au moment d'un entretien, d'une pré-admission ou d'une admission. Avant, toujours « Université *** – ville ».
- **« Paiement tranche 1 reçu »** (montant + date saisis à la main) : étape « Dossier ouvert », la checklist est générée.
- **Checklist** depuis `data/documents/documents_requis.json` :
  - base par cycle + ajouts et notes selon les offres (ex. MA-21 : vidéo de présentation, relevé bancaire obligatoire) ;
  - groupes « À fournir maintenant », « Plus tard » et « Préparés par Odysseo ».
- **Onglet Documents (étudiant)** :
  - progression et prochaine date limite ;
  - par document : « Prendre une photo » ou « Choisir un fichier » ; photos réduites à 2 000 px avant l'envoi ; formats et taille contrôlés ;
  - langue du document (français / autre → tâche « Traduction » pour l'équipe) ;
  - date d'expiration du passeport, avec une alerte à moins de 6 mois après la rentrée ;
  - formulaire des 2 enseignants recommandants ;
  - commentaire « À refaire » bien visible ;
  - documents préparés par Odysseo : « Je valide » ou « Demander une modification » ;
  - accord de conservation demandé avant le premier envoi.
- **Parent** : progression et état de chaque document seulement (ni fichier, ni aide, ni commentaire). Il ne peut ni valider ni envoyer.
- **Stockage** :
  - privé (Vercel Blob), chemin `documents/espace/checklist/{code}/{document}/{AAAAMMJJ-HHMMSS}-{n}.{ext}`, sans le nom d'origine ;
  - type réel vérifié par signature : un « .exe » renommé est refusé et supprimé ;
  - fichiers servis uniquement par des routes authentifiées et journalisés.
- **Équipe** :
  - valider / « À refaire » avec commentaire, retirer / remettre, document libre, dépôt des documents préparés ;
  - aperçu et téléchargement ; « Télécharger tout (ZIP) » avec des noms `NOM_Prenom_Document_n.ext` ;
  - liste des traductions à cocher ;
  - messages WhatsApp à copier : documents à refaire, documents à relire, relance ;
  - compteur des documents à vérifier dans le menu et dans la liste des dossiers ;
  - alerte e-mail + push au plus une fois par heure et par dossier.
- **Conservation** : 12 mois après la fin du dossier (clos ou arrivé).
  - Tâche mensuelle (`vercel.json`, `/api/cron/retention`, protégée par `CRON_SECRET`) qui envoie la liste à l'équipe.
  - Suppression par un administrateur depuis la fiche dossier.
  - Politique de confidentialité mise à jour (FR/EN).
- Deux étapes ajoutées à la frise : « Rapport d'admissibilité envoyé » et « Dossier validé », entre « Analyse du profil » et « Dossier ouvert ».

### Migration
- `npm run db:push` : tables `admission_reports`, `checklist_items`, `translation_tasks`. Fait le 2026-11-10 ; ajouts uniquement.

### À configurer
- Vercel : variable `CRON_SECRET` (sinon la tâche mensuelle est refusée).

## [0.11.0] – 2026-11-10 · PACK-03 Pages offres publiques

### Ajouté
- **Catalogue `/offres`** : les 32 offres publiables du catalogue 2027 (jamais les offres « à vérifier »), noms d'universités masqués (« Université *** – lieu »). Filtres Niveau (boutons), Domaine et Ville, gardés dans l'URL (`?cycle=&famille=&ville=`). Tri : date limite la plus proche, puis allocation maximale. Page statique ; sans JavaScript, la liste complète s'affiche.
- **Une page par offre `/offres/[ref]`** (ex. `/fr/offres/ma-24`, 64 pages statiques FR/EN) :
  - bandeau référence, niveau, rentrée et date limite ;
  - tableau (langue, durée, bourse, allocation, logement, conditions, date limite) ;
  - filières regroupées par langue d'enseignement ;
  - encadré « Pourquoi le nom de l'université n'est pas affiché ? » ;
  - bouton « Vérifier mon éligibilité » et bouton WhatsApp avec la référence ;
  - titre « Master boursier à Xi'an – MA-24 », image de partage propre à l'offre ;
  - adresse en majuscules redirigée vers les minuscules ; référence inconnue ou non publiable → 404 avec un lien vers le catalogue.
- **Formulaire** : `/postuler?ref=MA-24&level=master` pré-sélectionne le niveau, affiche « Offre choisie : MA-24 » et enregistre la référence dans le dossier (champ `offerRef` existant, affiché sur la fiche dossier). Aucune modification de la base.
- **Accueil** : bloc « Offres à date limite proche » (3 offres, recalculé chaque jour). **Menu** : « Nos offres » / « Scholarships » entre « Nos cursus » et « Nos services », et dans le pied de page. **Sitemap** : catalogue et 32 offres.
- Traduction anglaise des textes du catalogue : `data/offres/offres_2027_en.json` (à compléter quand le catalogue change). Libellés anglais des domaines.

### Corrigé
- Une référence d'offre dans `?ref=` ne remplace plus le code partenaire mémorisé : le parrainage (lien, cookie, session) reste attribué.

## [0.10.1] – 2026-11-09 · Page Parents retirée, invitation aux notifications

### Supprimé
- **Page Parents du site public** (décision du fondateur) : page `/parents` et son image de partage, liens du menu (ordinateur et mobile) et du pied de page, lien « Payez l'essentiel après l'admission » des pages cursus, bloc « Envoyer le lien sur WhatsApp » du formulaire, entrée du sitemap et textes FR/EN. Les anciens liens `/parents` déjà partagés redirigent vers l'accueil. L'accès parent existe toujours, dans l'espace étudiant.

### Ajouté
- **Espace étudiant — invitation à activer les notifications**, sur toutes les pages : apparaît peu après l'ouverture si l'appareil peut recevoir des notifications et qu'elles ne sont ni activées ni refusées (« Plus tard » la masque 3 jours) ; relancée avec un message adapté après l'envoi d'un message (« Soyez prévenu(e) de la réponse ») ou de documents ; sur iPhone hors application installée, explique comment l'installer. Si l'autorisation est déjà donnée, l'appareil est abonné sans rien demander et rattaché au compte connecté. État partagé avec la page « Mon compte ».

## [0.10.0] – 2026-11-08 · Espace étudiant (odysseo-application)

### Ajouté
- **Espace étudiant privé** sur un sous-domaine dédié (`odysseo-application.vercel.app`, configurable par `PORTAL_HOSTNAME`), séparé du site public et de l'espace équipe : le middleware n'y sert que `/espace`, et `/espace` n'existe pas ailleurs. Jamais indexé.
- **Comptes créés par l'équipe** depuis la fiche dossier (carte « Espace étudiant ») : accès **étudiant** et **parent(s)**, invitation par e-mail (FR/EN), « Renvoyer le lien », « Copier un lien » (pour WhatsApp), désactivation (déconnexion de tous les appareils).
- **Connexion** : e-mail + mot de passe choisi via le lien d'activation (14 jours, usage unique), ou **Google** (OAuth fait côté serveur avec PKCE ; uniquement pour une adresse déjà invitée). Mot de passe oublié (lien 2 h), changement de mot de passe. Session propre à l'espace (cookie `odysseo_portal`, 90 jours), totalement distincte de celle de l'équipe. Limites d'essais en base.
- **Suivi du dossier** : frise des 9 étapes, prochaine action, note du conseiller, offres recommandées anonymisées. L'étudiant et le parent sont prévenus (e-mail + notification) à chaque changement d'étape.
- **Documents** : l'étudiant / le parent envoie ses pièces ; il ne voit que ses envois et les documents **approuvés** par l'équipe. Un document ajouté par l'équipe reste privé jusqu'à « Approuver et rendre visible » sur la fiche dossier (qui, quand). Accès journalisé.
- **Messagerie** dossier ↔ équipe : fil dans l'espace et sur la fiche dossier (rafraîchi toutes les 15 s), lu / non lu, pastille dans le menu et la liste des candidatures. Alertes e-mail + notification dans les deux sens.
- **Application installable « Mon dossier »** (logo blanc Odysseo sur fond noir, manifeste dédié), bouton d'installation, notifications sur le téléphone. Les appareils de l'espace ne reçoivent jamais les alertes de l'équipe.
- Page Parents : mention de l'accès parent. Tests : visibilité des documents, isolement des domaines, règles du mot de passe.

### Migration
- `npm run db:push` (tables `portal_accounts`, `portal_tokens`, `portal_messages` + colonnes facultatives) — fait le 2026-11-08.

### À configurer
- Vercel : ajouter le domaine `odysseo-application.vercel.app` au projet.
- Google Cloud : URI de redirection `https://odysseo-application.vercel.app/api/portal/oauth/google/callback`.

## [0.9.2] – 2026-11-08 · Retrait du suivi public

### Supprimé
- **Suivi de dossier sur le site public** (décision du fondateur) : page `/suivi`, API `/api/suivi`, lien du pied de page, bouton et lien de suivi après l'envoi du formulaire, bouton de la page Parents, entrée du sitemap. Le suivi se fera dans l'**espace étudiant** privé (sous-domaine dédié, à venir).
- Conservé : l'étape, l'historique et la note publique sur la fiche dossier (équipe), qui alimenteront l'espace étudiant. Le message WhatsApp à copier ne contient plus de lien.
- La table `TrackingAttempt` n'est plus utilisée (à supprimer de la base plus tard, avec accord).

## [0.9.1] – 2026-11-08 · Correctifs suivi et page d'erreur

### Modifié
- **Suivi (`/suivi`)** : les 4 derniers chiffres du WhatsApp du **parent ou tuteur** (s'il est indiqué dans le formulaire) sont acceptés en plus de ceux de l'étudiant. Textes FR/EN adaptés.
- **Limite d'essais** : 5 par heure par adresse IP **et par dossier** (protège les 4 chiffres d'un dossier), plus 30 par heure par adresse IP tous dossiers confondus. Avant : 5 par IP, ce qui pouvait bloquer des abonnés mobiles partageant la même adresse.
- **Message WhatsApp copié** depuis la fiche dossier : toujours en français, lien vers `/fr/suivi`.

### Ajouté
- **Page d'erreur** (FR/EN) à la place de l'écran brut « Application error » : « Un problème est survenu » + « Recharger la page » / « Retour à l'accueil ». Après un déploiement, un onglet resté ouvert affiche « Une nouvelle version du site est disponible » et se recharge une fois automatiquement. Filet de sécurité `global-error` bilingue.

## [0.9.0] – 2026-11-08 · PACK-08 Suivi de dossier

### Ajouté
- **Page `/suivi`** (FR/EN), sans compte ni mot de passe : code dossier (pré-rempli par `?code=`, « ODY- » facultatif) + 4 derniers chiffres du WhatsApp → « Bonjour [Prénom] », frise des 9 étapes (passées cochées, actuelle en rouge, suivantes grisées), « Prochaine étape », note du conseiller, références recommandées, bouton WhatsApp « Une question sur mon dossier ». Statuts « En attente de votre part » et « Dossier clôturé » affichés à la place de la frise. Rien n'est gardé sur l'appareil, sauf le code si « Se souvenir de ce code » est coché.
- **API `POST /api/suivi`** : réponse seulement si le code **et** les 4 chiffres correspondent, sinon « Dossier introuvable » (sans dire lequel est faux). Renvoie uniquement prénom, niveau visé, étape, date, note publique, historique et références d'offres — jamais nom de famille, e-mail, téléphone, université réelle ni partenaire. **5 essais par heure et par IP** (table `TrackingAttempt`, IP hachée, purge après 24 h).
- **Base** : `stage` (défaut `recu`, appliqué aux dossiers existants), `stageUpdatedAt`, `stageHistory` (`[{stage, date}]`), `publicNote` (200 caractères max.). Distinct du statut interne du pipeline.
- **Fiche dossier (équipe)** : carte « Suivi visible par l'étudiant » — liste « Étape », « Note publique », « Enregistrer » (chaque changement ajoute une ligne à l'historique), historique, bouton « Copier le message WhatsApp » (toujours en français, avec le lien vers `/fr/suivi` ; envoi manuel). L'espace équipe existant (connexion, `noindex`) sert d'administration : pas de `/admin/dossiers` séparé.
- **Liens** : « Suivre mon dossier : [lien] » ajouté au message WhatsApp après l'envoi du formulaire ; bouton « Suivre mon dossier » sur l'écran de résultat et sur la page Parents ; lien dans le pied de page. Sitemap et titre/description.
- Tests : prénom sans nom de famille, code saisi, 4 chiffres, historique.

### Migration
- `npm run db:push` (4 colonnes + table `TrackingAttempt`) **avant** de déployer — fait le 2026-11-08.

## [0.8.0] – 2026-11-08 · PACK-07 Page Parents et paiement

### Ajouté
- **Page `/parents`** (FR/EN), 6 blocs courts : frise des paiements avec sélecteur Langue / Bachelor / Master / PhD (verticale sur mobile), « X % du total est payé après la réception de l'admission » calculé automatiquement (Langue 60 %, Bachelor 58 %, Master 63 %, PhD 58 %, arrondi inférieur) ; engagement de remboursement repris mot pour mot des pages cursus ; « Comment payer » ; « Vérifiez par vous-même » (+ documents d'exemple du PACK-06 s'ils existent) ; suivi du dossier sur WhatsApp (pas encore de page `/suivi`) ; questions « Pour les parents » de la FAQ ; bouton « Parler à un conseiller sur WhatsApp » (message parent pré-rempli).
- **Montants et étapes lus dans `src/lib/programs.ts`** (même source que les pages cursus et les brochures) : nouveau marqueur `afterAdmission` sur les étapes payées à l'admission ou après, fonction `paidAfterAdmission()`.
- **`content/paiement.json`** : moyens de paiement affichés seulement s'ils sont `"actif": true` (confirmés par le fondateur). Tous inactifs pour l'instant → « Les moyens de paiement vous sont indiqués par votre conseiller. » Règles affichées en FR/EN (reçu, ne jamais payer sur un numéro non communiqué par le conseiller).
- **Navigation** : « Parents » dans le menu (entre « Nos services » et « Devenir partenaire »), le menu mobile et le pied de page. Sitemap, titre/description et image de partage.
- **Pages cursus** : sous le prix, « Payez l'essentiel après l'admission → voir le détail », vers `/parents?cursus=<cursus>#paiement` (cursus présélectionné). Absent des brochures PDF.
- **Formulaire** : si « Un parent » gère le projet, « Vous pouvez partager la page Parents avec lui » + bouton « Envoyer le lien sur WhatsApp ».
- Tests : somme des étapes = prix, pourcentage par cursus, moyens de paiement actifs seulement.

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
