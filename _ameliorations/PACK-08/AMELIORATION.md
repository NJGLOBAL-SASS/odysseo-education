# PACK-08 · Suivi de dossier en ligne (étudiant et parent)
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN). Les dossiers sont créés par `/api/candidatures`, avec un « code dossier » envoyé sur WhatsApp._

## Contexte
- La question la plus fréquente après l'inscription est « Où en est mon dossier ? ». Aujourd'hui, la réponse passe par WhatsApp, à la main.
- Le concurrent DigiEduPro montre un schéma figé en 10 étapes (10 % à 100 %), identique pour tout le monde. **Aucun suivi personnel.**
- Odysseo peut faire mieux et plus simplement : l'étudiant ou son parent tape son code dossier et voit **son** étape, sans créer de compte ni de mot de passe.

## Objectif
- Page publique `/[locale]/suivi` : code dossier + 4 derniers chiffres du WhatsApp → frise du dossier avec l'étape actuelle et la prochaine action attendue.
- Pour l'équipe : changer l'étape d'un dossier en 2 clics.

## Étapes du dossier (liste fixe, dans cet ordre)
| Code | Libellé affiché (FR) | Prochaine action affichée |
|---|---|---|
| `recu` | Dossier reçu | Un conseiller vous contacte sur WhatsApp sous 24 h |
| `analyse` | Analyse du profil | Nous préparons votre sélection d'universités |
| `ouvert` | Dossier ouvert | Envoyez les documents demandés par votre conseiller |
| `documents` | Documents en préparation | Traductions, CV, plan d'études en cours |
| `depose` | Candidatures déposées | Les universités étudient votre dossier (plusieurs semaines) |
| `admis` | Admission reçue | Réception de l'Admission Notice et du JW202 |
| `visa` | Visa en préparation | Rendez-vous à l'ambassade |
| `depart` | Prêt pour le départ | Envoyez votre vol pour l'accueil à l'aéroport |
| `arrive` | Arrivé en Chine 🎉 | — |
Statuts parallèles, affichés à la place de la frise : `en_attente_etudiant` (« Nous attendons un document de votre part »), `clos` (« Dossier clôturé, contactez votre conseiller »).

## Tâches
1. **Explorer d'abord** : le stockage des dossiers (base, Google Sheets, etc.), le format du code dossier, la présence éventuelle d'un espace administrateur et d'une authentification.
2. **Données** : ajouter au dossier `etape` (défaut `recu`), `etape_maj_le` (date), `historique_etapes` (liste `{etape, date}`) et `note_publique` (texte court optionnel, visible par l'étudiant, 200 caractères maximum). Les dossiers existants reçoivent `recu`.
3. **API publique `POST /api/suivi`** : corps `{ code, telephone4 }`.
   - Répond seulement si le code existe **et** si les 4 derniers chiffres du WhatsApp correspondent. Sinon : message générique « Dossier introuvable » (ne jamais dire lequel des deux est faux).
   - Renvoie uniquement : prénom, niveau visé, étape, date de mise à jour, note publique, historique (étapes + dates) et références recommandées (PACK-02, s'il est appliqué). **Jamais** le nom complet, l'e-mail, le téléphone, l'université réelle ou le partenaire.
   - Limiter le nombre d'essais : 5 par heure et par adresse IP (simple compteur en mémoire ou dans le stockage existant).
4. **Page `/[locale]/suivi`** :
   - 2 champs : code dossier, 4 derniers chiffres du WhatsApp. Bouton « Voir mon dossier ». Le code peut être pré-rempli par l'URL `?code=XXXX`.
   - Résultat : « Bonjour [Prénom] », frise des 9 étapes (étapes passées cochées, étape actuelle en rouge, étapes suivantes grisées), encadré « Prochaine étape : [action] », note publique s'il y en a une, bouton WhatsApp « Une question sur mon dossier » (message pré-rempli avec le code).
   - Ne rien stocker sur l'appareil, sauf le code si l'utilisateur coche « Se souvenir de ce code ».
5. **Liens vers le suivi** :
   - Dans le message WhatsApp pré-rempli après l'envoi du formulaire, ajouter : « Suivre mon dossier : [URL]/fr/suivi?code=XXXX ».
   - Sur l'écran de résultat (PACK-02) et la page Parents (PACK-07), ajouter le bouton « Suivre mon dossier ».
   - Ajouter « Suivre mon dossier » dans le pied de page.
6. **Mise à jour par l'équipe** :
   - **S'il existe un espace administrateur** : ajouter sur la fiche d'un dossier une liste déroulante « Étape », un champ « Note publique » et un bouton « Enregistrer ». Chaque changement s'ajoute à `historique_etapes`.
   - **S'il n'en existe pas** : créer `/admin/dossiers`, protégé par un mot de passe unique (`ADMIN_PASSWORD` dans les variables d'environnement, cookie de session `httpOnly`). Cette page affiche la liste des dossiers (code, prénom, niveau, étape, date) avec une recherche par code, et les mêmes contrôles. Elle ne doit pas être indexée (`noindex`) ni figurer dans le sitemap.
   - Ajouter un bouton « Copier le message WhatsApp » qui prépare « Bonjour [Prénom], votre dossier Odysseo passe à l'étape : [libellé]. Suivi : [lien] » pour l'envoyer à la main. Pas d'envoi automatique dans ce pack.
7. Textes FR et EN.

## Critères d'acceptation
- [ ] Avec un dossier de test, le bon code et les bons 4 chiffres affichent la frise ; un seul des deux faux affiche « Dossier introuvable ».
- [ ] Le 6e essai en moins d'une heure depuis la même IP est refusé.
- [ ] La réponse réseau de `/api/suivi` ne contient ni e-mail, ni numéro complet, ni nom de famille, ni université réelle.
- [ ] Changer l'étape dans l'admin met à jour la page de suivi immédiatement et ajoute une ligne à l'historique.
- [ ] `/admin/dossiers` est inaccessible sans mot de passe et renvoie `noindex`.
- [ ] Page de suivi lisible à 360 px ; `npm run build` passe.

## Ne pas faire
- Pas de création de compte, pas de mot de passe pour l'étudiant.
- Pas d'envoi automatique de WhatsApp (ce sera un pack séparé, avec l'API WhatsApp Business).

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-08 Suivi de dossier` dans `CHANGELOG.md`.
- Commit : `feat(suivi): suivi de dossier par code + 4 chiffres, mise à jour des étapes par l'équipe (PACK-08)`.

## À fournir par le fondateur
- [ ] Choisir le mot de passe administrateur et le donner au développeur en privé (jamais dans le code).
