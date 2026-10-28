# Odysseo Education — Optimisation de la plateforme selon Hormozi

28 octobre 2026

## Mode d'emploi — à lire par le développeur et par Claude Code

Ce document est un cahier des charges conçu pour être déposé tel quel dans Claude Code, à la racine du dépôt `odysseo-education`. Le développeur n'a qu'à choisir le chantier à lancer.

**Pour le développeur :**

1. Enregistrer ce document sous `docs/PLAN_HORMOZI.md` dans le dépôt.
2. Ouvrir Claude Code dans le dépôt et envoyer : « Lis `docs/PLAN_HORMOZI.md` et réalise le chantier 1. »
3. Relire, tester, fusionner, puis passer au chantier suivant dans l'ordre du planning.

**Consignes pour Claude Code (à respecter pour chaque chantier) :**

1. Lire `DOCUMENTATION.md`, `prisma/schema.prisma` et les fichiers cités dans le chantier avant d'écrire du code.
2. Réaliser **un seul chantier à la fois**, sur une branche dédiée (`hormozi/chantier-N`), dans l'ordre du planning.
3. Si une « décision à prendre par la direction » n'est pas tranchée, poser la question avant de coder, ou rendre la valeur modifiable depuis le dashboard avec la valeur proposée par défaut.
4. Suivre le style du projet : Next.js App Router, Prisma, zod, next-intl (textes FR et EN), Tailwind, couleurs Odysseo.
5. Ne jamais casser l'existant : le formulaire en 4 étapes, la séparation public / équipe et les notifications continuent de fonctionner.
6. Respecter tous les garde-fous de la dernière section, en particulier : aucun chiffre ni témoignage inventé, aucune promesse d'admission, de bourse ou de visa.
7. Avant de rendre la main : lancer le lint, la vérification des types et le build, mettre à jour `DOCUMENTATION.md`, puis démontrer le critère « Terminé quand » du chantier.
8. Terminer par un résumé : fichiers modifiés, migrations à appliquer, variables d'environnement à ajouter, et ce qui reste à faire côté direction.

## Résumé pour le développeur

Hormozi ne toucherait pas à la technique, déjà solide. Il ferait **de chaque visiteur un prospect mesuré, contacté en moins de 5 minutes et relancé jusqu'à une réponse**. Ce document liste 7 chantiers, par ordre de priorité, avec ce qu'il faut construire et comment vérifier que c'est fait.

Sa règle : on ne peut améliorer que ce qu'on mesure. D'où l'ordre ci-dessous.

| Priorité | Chantier | Pourquoi Hormozi le ferait | Effort estimé |
| --- | --- | --- | --- |
| 1 | Suivi des sources | Savoir quel canal rapporte des inscrits, pas seulement des formulaires | 1 à 2 jours |
| 2 | Réponse rapide et bascule WhatsApp | Un prospect contacté vite convertit beaucoup mieux | 2 à 3 jours |
| 3 | Rapport de chances de bourse | Donner un résultat concret avant de vendre | 3 à 4 jours |
| 4 | Pages accueil et cursus | Augmenter la valeur perçue : preuve, garantie, urgence | 3 à 5 jours |
| 5 | Ambassadeurs et partenaires payés en FCFA | Des gens motivés par l'argent ramènent des prospects | 2 à 3 jours |
| 6 | Relances automatiques | L'argent est dans les relances, pas dans le premier contact | 2 à 3 jours |
| 7 | Tableau de bord acquisition | Décider chaque semaine où mettre l'effort | 2 jours |

**Ce qui ne change pas :** la stack, la séparation public / équipe, le formulaire en 4 étapes (on l'enrichit, on ne le refait pas) et le ton honnête du site (aucune admission, bourse ou visa garanti).

Les efforts sont des ordres de grandeur pour un développeur qui connaît le projet, à confirmer par lui.

## Diagnostic de la plateforme actuelle

La base est meilleure que chez la plupart des concurrents : l'offre est claire, les prix sont affichés et une vraie garantie existe. Les pertes se situent **après** le formulaire et **dans la mesure**.

**Déjà en place, à garder :**

- Un aimant à prospects (« analyse gratuite de votre profil ») et un formulaire de 3 minutes.
- Des tarifs tout compris par cursus, des brochures PDF et un paiement en étapes.
- Une garantie : l'acompte de l'étape 2 est remboursé sans admission avec bourse.
- Un programme partenaires avec code, lien traçable (`/r/[code]`) et points.
- Des notifications équipe (email, WhatsApp, push) à chaque nouveau dossier.

**Où l'argent fuit :**

| Fuite | Constat dans le code | Conséquence |
| --- | --- | --- |
| Source floue | Seuls `discoverySource` (déclaré par le candidat) et `srcParam` (`?ref=` / `?src=`) existent ; aucun UTM | Impossible de savoir si une publicité ou une vidéo rapporte des inscrits |
| Délai de réponse inconnu | Aucune date de premier contact ni historique des changements de statut | On ne sait pas combien de prospects refroidissent avant d'être appelés |
| Promesse vague | « Un premier avis » sur WhatsApp, sans contenu ni délai précis | Valeur perçue faible, moins de formulaires terminés |
| Peu de preuve | Aucun témoignage ni résultat d'étudiant sur le site | Le parent qui paie doute |
| Aucune relance | Un dossier `NOUVEAU` ou `QUALIFIE` qui ne répond pas n'est jamais relancé automatiquement | Une partie des ventes possibles est perdue en silence |
| Points sans valeur | Barème 1 / 5 / 20 points (`src/lib/points.ts`), sans équivalent en argent | Les partenaires n'ont pas de raison forte de recommander |

## Chantier 1 — Suivi des sources

Objectif : pour chaque inscrit, connaître le canal, la campagne et le contenu qui l'ont amené. Sans cela, les chantiers 3 à 7 ne se mesurent pas.

**À construire :**

1. Capturer `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` et `fbclid` à l'arrivée sur n'importe quelle page publique.
   - Les stocker dans un cookie *first-party* de 90 jours, en **premier contact** et en **dernier contact** (deux valeurs distinctes).
   - Respecter le bandeau cookies existant : sans consentement, garder la valeur seulement le temps de la session.
2. Ajouter au modèle `Candidate` : `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `firstTouch` (JSON), `lastTouch` (JSON), `landingPage`, `channel`.
3. Calculer `channel` à l'enregistrement, avec une liste fermée : `PARTENAIRE`, `AMBASSADEUR`, `META_ADS`, `TIKTOK_ORGANIQUE`, `FACEBOOK_ORGANIQUE`, `YOUTUBE`, `WHATSAPP`, `LYCEE_EVENEMENT`, `BOUCHE_A_OREILLE`, `DIRECT`, `AUTRE`.
   - Ordre de priorité : code partenaire, puis UTM, puis `srcParam`, puis `discoverySource` déclaré.
4. Garder la question « Comment nous avez-vous connus ? » : elle sert de contrôle quand les UTM manquent.
5. Ajouter dans le dashboard un générateur de liens UTM (canal + campagne → lien court copiable), pour que l'équipe ne tape jamais un UTM à la main.
6. Ajouter le Pixel Meta et l'API Conversions avec deux événements : `Lead` (formulaire envoyé) et `Purchase` (passage au statut `DOSSIER_EN_COURS`, montant de l'étape 1). Seulement avec le consentement cookies.

**Terminé quand :** un lien `?utm_source=tiktok&utm_campaign=mars2027` ouvert, puis un formulaire envoyé deux jours plus tard, affiche bien `TIKTOK_ORGANIQUE` et `mars2027` sur la fiche du candidat et dans l'export CSV.

## Chantier 2 — Réponse rapide et bascule WhatsApp

Objectif : chaque prospect reçoit un message humain sur WhatsApp **en moins de 5 minutes** pendant les heures d'ouverture. Hormozi appelle ça *speed to lead* : un prospect qui vient de remplir un formulaire est au sommet de son envie ; une heure plus tard, il est déjà ailleurs.

**À construire :**

1. **Écran de confirmation** : remplacer le bouton WhatsApp générique par un lien `wa.me` pré-rempli avec le code dossier (« Bonjour, je viens d'envoyer mon dossier ODY-2BQ9X1 »). Le prospect ouvre la conversation lui-même, ce qui évite les blocages de WhatsApp.
2. **Message automatique au candidat** via WhatsApp Cloud API (modèle Meta approuvé), dès l'envoi : prénom, code dossier, ce qu'il va recevoir et quand (voir chantier 3).
3. **Attribution automatique** du dossier à un membre de l'équipe (`assignedToId`), en tournant, avec notification push à cette personne seulement.
4. **Bouton « Contacter sur WhatsApp »** sur la fiche candidat : ouvre la conversation avec un script pré-rempli et enregistre `firstContactAt`.
5. **Historique des statuts** : nouvelle table `CandidateStatusChange` (ancien statut, nouveau statut, auteur, date) pour mesurer le temps passé à chaque étape.
6. **Alerte de retard** : sans `firstContactAt` 15 minutes après l'envoi (heures d'ouverture), le dossier passe en rouge dans le dashboard et l'administrateur est notifié.
7. **Heures d'ouverture** paramétrables (fuseau Afrique/Douala). Hors heures, le message automatique annonce l'heure du rappel.

**Terminé quand :** un formulaire de test déclenche le message WhatsApp au candidat en moins d'une minute, et le dashboard affiche le délai de premier contact pour chaque dossier.

## Chantier 3 — Rapport de chances de bourse

Objectif : transformer « un premier avis » en un **document concret livré sous 48 h**. Hormozi : *donnez tellement de valeur gratuitement que le prospect se sent redevable avant même d'acheter*.

**Le rapport (PDF aux couleurs Odysseo, envoyé sur WhatsApp et par email) contient :**

- le niveau du profil (Excellent, Bon, Moyen, Point faible), d'après la grille déjà publiée sur les pages cursus ;
- 3 universités possibles et la bourse visée pour chacune ;
- le coût estimé d'une année, sans bourse et avec la bourse visée (sur le modèle de l'exemple Jiangsu déjà sur le site) ;
- le tarif Odysseo du cursus et le paiement en étapes ;
- la date limite réelle pour la prochaine rentrée (mars ou septembre) ;
- un seul appel à l'action : « Réserver mon appel de 15 minutes ».

**À construire :**

1. Dans la fiche candidat, un formulaire « Rapport » : l'équipe choisit le niveau, les 3 universités, les bourses et les montants. Pas d'automatisation du jugement : c'est un conseiller qui décide.
2. Un pré-remplissage à partir des réponses du formulaire (niveau visé, moyenne, année du diplôme) pour gagner du temps.
3. Génération du PDF avec `pdfkit` (déjà utilisé pour les exports), en FR et EN.
4. Envoi en un clic par WhatsApp et email, et passage automatique au statut `QUALIFIE`.
5. Un lien de prise de rendez-vous dans le rapport (créneaux de l'équipe), qui enregistre `callBookedAt` sur le candidat.
6. Modifier la promesse du site : « Recevez sous 48 h votre rapport : universités possibles, bourse visée et coût réel » (accueil, `/postuler`, pages cursus).

**Terminé quand :** un conseiller produit et envoie un rapport en moins de 10 minutes depuis la fiche candidat.

**À valider par la direction :** la liste des universités et des coûts à proposer dans le formulaire (un catalogue à maintenir).

## Chantier 4 — Pages accueil et cursus

Objectif : augmenter la valeur perçue sans baisser les prix. Hormozi la résume en une équation :

```latex
\text{Valeur} = \frac{\text{Résultat rêvé} \times \text{Probabilité perçue de réussite}}{\text{Délai} \times \text{Effort et sacrifice}}
```

Chaque modification ci-dessous agit sur un des quatre leviers.

| Levier | Modification du site | Où |
| --- | --- | --- |
| Résultat rêvé | Titre centré sur le résultat : « Étudiez en Chine avec une bourse, accueilli à l'aéroport, chambre prête » | Accueil, héro des cursus |
| Probabilité perçue | Section témoignages : photo, prénom, ville d'origine, université, bourse obtenue, courte vidéo. Gérée depuis le dashboard (nouveau modèle `Testimonial`) | Accueil, chaque page cursus |
| Probabilité perçue | Compteurs réels : étudiants accompagnés, bourses obtenues, universités partenaires, calculés depuis la base ou saisis par l'admin | Accueil |
| Probabilité perçue | Garantie remontée en haut de page, dans un bloc visible : « Pas d'admission avec bourse ? Votre acompte de l'étape 2 est remboursé. » | Accueil, pages cursus, `/postuler` |
| Délai | Compte à rebours vers la date limite de la prochaine rentrée, avec une date réelle saisie par l'admin | Bandeau du site |
| Délai | « Rapport sous 48 h » affiché sur tous les boutons d'appel à l'action | Partout |
| Effort | Section « Vous fournissez 5 documents, nous faisons le reste » remontée plus haut | Pages cursus |
| Effort | FAQ des objections de parents : sécurité, coût de la vie, langue, nourriture, suivi sur place | Pages cursus, accueil |

**Rendre l'offre plus nette (*Grand Slam Offer*) :**

- Nommer chaque bonus déjà inclus comme un élément de valeur : « Accueil aéroport Odysseo », « Kit chambre prête », « Briefing départ ».
- Une page « Parents » dédiée : c'est souvent le parent qui paie (le formulaire le demande déjà avec `managedBy`).
- Un seul appel à l'action par page, répété, toujours le même : « Recevoir mon rapport gratuit ».

**Terminé quand :** les témoignages, les compteurs et la date de rentrée se modifient depuis le dashboard, sans déploiement.

**Règle :** aucun chiffre, témoignage ou compteur inventé. Si l'équipe n'a pas encore de témoignages, la section reste cachée jusqu'aux premiers.

## Chantier 5 — Ambassadeurs et partenaires payés en FCFA

Objectif : faire du programme partenaires le premier canal d'acquisition. Hormozi : *les affiliés travaillent pour l'argent, pas pour des points*. Le code et le lien de parrainage existent déjà : il reste à leur donner une valeur.

**Barème proposé (à valider par la direction) :**

| Événement | Aujourd'hui | Proposé | Déclencheur dans la plateforme |
| --- | --- | --- | --- |
| Nouveau prospect | 1 point | 0 FCFA (compté, non payé) | Formulaire envoyé avec le code |
| Prospect qualifié | 5 points | 0 FCFA (compté, non payé) | Statut `QUALIFIE` |
| Inscrit en Langue chinoise | 20 points | 75 000 FCFA | Statut `DOSSIER_EN_COURS` et étape 1 payée |
| Inscrit en Bachelor, Master ou Doctorat | 20 points | 150 000 FCFA (environ 5 %) | Statut `DOSSIER_EN_COURS` et étape 1 payée |
| Bonus palier | — | 100 000 FCFA au 5e inscrit de l'année | Compteur annuel |

**Payer seulement sur les inscrits** protège la marge : un prospect qui ne signe pas ne coûte rien.

**À construire :**

1. Remplacer `POINTS_RULES` par un barème en FCFA modifiable par l'admin (table `CommissionRule`), en gardant l'historique des points actuels.
2. Une commission par inscrit, avec un statut : `EN_ATTENTE` → `VALIDEE` (quand l'étape 2 est payée) → `PAYEE`, et la date et le moyen de paiement (Mobile Money, virement).
3. Un nouveau type de partenaire **Ambassadeur** : les étudiants Odysseo déjà en Chine reçoivent automatiquement un code au statut `ADMIS`.
4. Dans l'espace partenaire : gains en attente, gains payés, classement du mois, et un kit prêt à partager (visuels, textes WhatsApp, lien personnel).
5. Une page publique `/ambassadeurs` pour recruter des affiliés : professeurs, répétiteurs, cybercafés, associations.
6. Un export des commissions à payer pour la comptabilité.

**Terminé quand :** le passage d'un candidat parrainé au statut `DOSSIER_EN_COURS` crée une commission visible du partenaire et de l'admin, sans action manuelle.

## Chantier 6 — Relances automatiques

Objectif : aucun prospect n'est oublié. Hormozi rappelle que la plupart des ventes se font après plusieurs relances, alors que la plupart des équipes s'arrêtent après une ou deux.

**Séquence proposée pour un dossier qui ne signe pas** (la séquence s'arrête dès que le candidat répond, réserve un appel ou passe à `DOSSIER_EN_COURS`) :

| Moment | Canal | Contenu |
| --- | --- | --- |
| J+0 | WhatsApp + email | Confirmation, code dossier, « votre rapport arrive sous 48 h » |
| J+2 | WhatsApp | Le rapport de chances de bourse + lien pour réserver l'appel |
| J+3 | WhatsApp | « Avez-vous pu lire votre rapport ? Une question ? » |
| J+5 | Email | Témoignage d'un étudiant au profil proche (même cursus) |
| J+7 | WhatsApp | Réponse à l'objection la plus fréquente : le coût, avec l'exemple de bourse partielle |
| J+14 | WhatsApp | Rappel de la date limite de la prochaine rentrée |
| J+30 | Email | Newsletter mensuelle : nouvelles offres de bourses |
| Chaque nouvelle rentrée | WhatsApp + email | Relance des anciens prospects : « Les dossiers pour septembre s'ouvrent » |

**À construire :**

1. Un modèle `FollowUpSequence` (étapes, délai, canal, modèle de message FR/EN) modifiable dans le dashboard.
2. Une tâche planifiée (cron toutes les 15 minutes) qui envoie les messages dus, avec trace dans `NotificationLog`.
3. Les messages WhatsApp hors fenêtre de 24 h passent par des modèles approuvés par Meta ; prévoir leur création.
4. Un arrêt automatique quand le candidat répond (webhook WhatsApp entrant) et un bouton « Arrêter les relances » sur la fiche.
5. Un lien de désinscription dans chaque email, et le respect du « STOP » sur WhatsApp.
6. Une vue « À relancer aujourd'hui » pour les relances humaines (appels).

**Terminé quand :** un dossier de test reçoit les messages J+0 à J+3 aux bons moments (délais raccourcis en mode test), et la séquence s'arrête quand il répond.

## Chantier 7 — Tableau de bord acquisition

Objectif : une page `/dashboard/acquisition` qui répond chaque lundi à une question : *où mettre plus d'effort, et où arrêter ?* Hormozi appelle ça « More, Better, New » : faire plus de ce qui marche, l'améliorer, puis seulement tester du nouveau.

**Indicateurs, filtrables par période, cursus et canal :**

| Indicateur | Calcul | Source dans la plateforme |
| --- | --- | --- |
| Prospects | Formulaires envoyés | `Candidate.createdAt` |
| Délai médian de premier contact | `firstContactAt` − `createdAt` | Chantier 2 |
| Taux de rapport livré | Rapports envoyés / prospects | Chantier 3 |
| Taux d'appel réservé | `callBookedAt` renseigné / prospects | Chantier 3 |
| Taux d'inscription | `DOSSIER_EN_COURS` / prospects | Historique des statuts |
| Chiffre d'affaires signé | Somme des tarifs des inscrits | `src/lib/programs.ts` |
| Coût par inscrit | Dépenses du canal / inscrits du canal | Saisie mensuelle des dépenses par canal (nouveau modèle `ChannelSpend`) |
| Commissions dues | Somme des commissions `VALIDEE` | Chantier 5 |

**Affichage :**

1. Un entonnoir par canal : prospects → rapport → appel → inscrit, avec le taux entre chaque étape.
2. Un tableau des canaux trié par coût par inscrit, avec une couleur : vert (rentable), orange, rouge.
3. Un tableau des partenaires et ambassadeurs trié par inscrits.
4. Un export PDF et Excel, comme les exports existants, pour la réunion hebdomadaire.

**Terminé quand :** la direction lit en moins de 2 minutes quel canal a rapporté le plus d'inscrits le mois dernier, et à quel coût.

## Planning, critères d'acceptation et garde-fous

Livraison en 4 phases sur environ 8 semaines. La phase 1 passe avant tout le reste : les dossiers de la rentrée de mars 2027 se préparent maintenant, et chaque prospect de cette période doit être mesuré.

| Phase | Semaines | Chantiers | Validation pour passer à la suite |
| --- | --- | --- | --- |
| 1. Mesurer | 1 et 2 | Ch. 1 Sources, Ch. 2 Réponse rapide | Sources et délai de premier contact mesurés |
| 2. Convertir | 3 et 4 | Ch. 3 Rapport, Ch. 6 Relances | Rapport produit en 10 minutes |
| 3. Attirer | 5 à 7 | Ch. 4 Pages du site, Ch. 5 Ambassadeurs | Commissions créées automatiquement |
| 4. Piloter | 8 | Ch. 7 Tableau de bord acquisition | — |

Chaque validation est un passage obligé : on ne passe à la phase suivante que lorsque le critère « Terminé quand » du chantier est vérifié sur le site en production.

**Pour chaque chantier, le développeur livre :**

- [ ] les migrations Prisma, testées sur une copie de la base ;
- [ ] les textes en FR et EN (`src/i18n/messages`) ;
- [ ] une mise à jour de `DOCUMENTATION.md` ;
- [ ] une démonstration du critère « Terminé quand » à la direction.

**Garde-fous, non négociables :**

- Aucune promesse d'admission, de bourse ou de visa garanti. Le ton honnête actuel du site est un atout, pas une faiblesse.
- Aucun témoignage, compteur ou chiffre inventé.
- Les relances respectent le « STOP », la désinscription et les règles WhatsApp de Meta, sinon le numéro peut être bloqué.
- Pixel et suivi uniquement avec le consentement cookies, comme le bandeau existant.
- Aucun lien vers l'espace équipe sur le site public (§5 de `DOCUMENTATION.md`).

**Décisions à prendre par la direction avant de commencer :**

- Montants des commissions (chantier 5).
- Catalogue des universités et des coûts pour le rapport (chantier 3).
- Heures d'ouverture et personnes qui reçoivent les prospects (chantier 2).
- Premiers témoignages d'étudiants, avec leur accord écrit (chantier 4).
