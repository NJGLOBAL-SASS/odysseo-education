# PACK-01 · Formulaire de qualification enrichi
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN). Formulaire existant : `/[locale]/postuler`, 4 étapes, envoi vers `/api/candidatures`._

## Contexte (formulaire en ligne au 05/11/2026)
- Étape 1 « Vous » : nom, WhatsApp, e-mail, date de naissance, pays, ville, qui finance (`managedBy`).
- Étape 2 « Parcours » : situation (`situation`), plus haut diplôme, année, moyenne en **texte libre** (« 13,5/20 · mention Assez bien · 3,2 GPA »).
- Étape 3 « Projet » : niveau visé (`level`), domaine souhaité (liste de 11 choix), passeport (`passport`), anglais Oui / Un peu / Non (`english`), financement (`funding`), rentrée (`intake`).
- Étape 4 « Validation » : orienté par un partenaire (`referred`), comment nous avez-vous connus (`discovery`), consentement, champ piège anti-robot.

**Problème** : il manque les informations qui décident vraiment de l'éligibilité d'une offre :
- la filière exacte du diplôme ;
- le type et le score du certificat d'anglais (IELTS, TOEFL, Duolingo) ;
- le niveau HSK ;
- la capacité à fournir un relevé bancaire, et pour quel montant ;
- la possession des diplômes originaux.

Sans elles, le PACK-02 (moteur de recommandation) ne peut pas filtrer correctement. De plus, la moyenne en texte libre n'est pas exploitable automatiquement.

## Objectif
Collecter ces données **sans allonger le parcours de plus de 30 secondes** : on garde 4 étapes et les questions restent en boutons cliquables.

## Tâches
1. **Explorer d'abord** : le composant multi-étapes, le schéma de validation (zod ou autre), le type TypeScript de la candidature, la route `/api/candidatures`, le stockage et les traductions FR/EN. Ajouter les champs partout où c'est nécessaire (UI, validation, type, API, stockage, éventuel affichage admin).
2. **Étape 2 – Parcours**, remplacer la moyenne en texte libre par deux champs :
   - `moyenneValeur` (nombre décimal, virgule acceptée) ;
   - `moyenneBareme` : boutons `/20` · `/100 (%)` · `/4 (GPA)` · `/5` · « Je ne sais pas ».
   - Calculer côté serveur `moyenne_pct` : /20 → ×5 ; /4 → ×25 ; /5 → ×20 ; % → tel quel ; « Je ne sais pas » → `null`. Stocker la valeur saisie et `moyenne_pct`.
   - Ajouter `filiereDiplome` (texte libre, obligatoire si le diplôme est Licence ou Master, placeholder « Ex. Génie civil, Biologie, Comptabilité »). Proposer une **autocomplétion** (non bloquante) à partir des noms de filières de `_ameliorations/PACK-01/filieres_suggestions.json`. L'étudiant peut toujours taper autre chose.
   - Ajouter `diplomesOriginaux` : Oui / Pas encore (attestation provisoire seulement).
3. **Étape 3 – Projet** :
   - Remplacer « Parlez-vous anglais ? » par `anglaisCertificat` : IELTS · TOEFL · Duolingo · Pas de certificat, mais études faites en anglais · Pas de certificat.
     - Si IELTS, TOEFL ou Duolingo : champ `anglaisScore` (nombre, avec bornes : IELTS 0-9 au pas de 0,5 ; TOEFL 0-120 ; Duolingo 10-160).
     - Garder une question courte `anglaisNiveau` (Oui / Un peu / Non) **seulement** si « Pas de certificat », pour ne pas perdre l'information actuelle.
   - Ajouter `hsk` : Aucun · HSK 1-2 · HSK 3 · HSK 4 · HSK 5 · HSK 6 (stocker un entier de 0 à 6 ; HSK 1-2 → 2).
   - Ajouter `releveBancaire` : « Moi ou ma famille pouvons montrer sur un relevé bancaire environ… » : Moins de 2 500 USD · 2 500 à 5 000 USD · 5 000 à 10 000 USD · Plus de 10 000 USD · Je ne sais pas. Stocker aussi `releve_bancaire_usd_max` : 0 · 2500 · 5000 · 10000 · null. Ajouter une aide sous la question : « Certaines universités demandent un relevé au nom de l'étudiant ou d'un parent. Ce n'est pas un paiement. »
   - Le « Domaine d'études souhaité » devient un **choix multiple (2 maximum)**, avec les mêmes options plus une nouvelle option « Éducation, langues, sport ». Codes à stocker (utilisés par le PACK-02) : `medecine`, `ingenierie`, `informatique`, `commerce`, `relations-droit`, `langue-chinoise`, `sciences`, `agriculture-environnement`, `architecture-design`, `education-sport`, `ne-sait-pas`, `autre`.
4. **Étape 1** : calculer et stocker `age` (en années, à la date d'envoi) côté serveur à partir de la date de naissance. Ne rien changer à l'interface.
5. **Rétrocompatibilité** : les dossiers déjà enregistrés restent lisibles ; les nouveaux champs sont optionnels en base.
6. **Sauvegarde du brouillon** : si ce n'est pas déjà fait, sauvegarder les réponses en `localStorage` (`odysseo_form_draft`) à chaque étape et les restaurer au retour, puis vider ce brouillon après un envoi réussi. Ne jamais y stocker le consentement.
7. Textes FR et EN pour toutes les nouvelles questions.

## Critères d'acceptation
- [ ] Le parcours reste en 4 étapes et toutes les nouvelles questions sont cliquables, sauf la filière, la moyenne et le score d'anglais.
- [ ] Saisir « 13,5 » avec « /20 » enregistre `moyenne_pct = 67.5`.
- [ ] Choisir IELTS sans score bloque l'étape avec un message clair ; un score de 6,5 est accepté, 10 est refusé.
- [ ] Un dossier envoyé contient : `filiereDiplome`, `moyenne_pct`, `diplomesOriginaux`, `anglaisCertificat`, `anglaisScore`, `hsk`, `releve_bancaire_usd_max`, `domaines[]`, `age`.
- [ ] Le formulaire fonctionne sur mobile (largeur 360 px) sans défilement horizontal.
- [ ] Recharger la page à l'étape 3 restaure les réponses des étapes 1 et 2.
- [ ] `npm run build` et les tests existants passent.

## Ne pas faire
- Ne pas supprimer de champ existant utilisé par l'équipe (`managedBy`, `situation`, `passport`, `funding`, `intake`, `referred`, `discovery`).
- Ne pas rendre la filière obligatoire pour les niveaux Bac / Probatoire.

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-01 Formulaire de qualification` dans `CHANGELOG.md`.
- Commit : `feat(form): filière, moyenne structurée, certificats anglais/HSK, relevé bancaire, diplômes originaux (PACK-01)`.
