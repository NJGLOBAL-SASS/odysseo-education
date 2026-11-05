# PACK-06 · Preuves et confiance : témoignages, documents d'exemple, conseiller visible
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN)._

## Contexte (comparaison avec le concurrent DigiEduPro, 05/11/2026)
- Le concurrent montre 8 témoignages d'étudiants (photo, pays, cursus, université), des vidéos, des exemples d'Admission Letter, de JW202 et de visa, ainsi que ses conseillers avec leur prénom (« Digi, Lexi, Tony ») et leurs contacts.
- Le site Odysseo n'affiche **aucune preuve sociale** : aucun témoignage, aucune image de document, aucun visage. Pour un parent qui va payer plusieurs millions de FCFA, c'est le premier frein.
- Odysseo doit le faire **en plus simple et en plus honnête** : uniquement de vrais témoignages, avec l'accord des étudiants, et des documents floutés.

## Objectif
Ajouter trois éléments de confiance, **pilotés par des fichiers JSON**. Une section reste invisible tant que son fichier est vide : rien de faux ne s'affiche jamais.

## Tâches
1. **Explorer d'abord** : la page d'accueil, les pages cursus, les composants existants, le dossier `public/images/` et le système FR/EN.
2. **Témoignages** :
   - Créer `content/temoignages.json` d'après le modèle `temoignages_modele.json`, avec une liste **vide** au départ.
   - Composant `Temoignages` : cartes avec photo ronde (`next/image`), prénom et initiale du nom, pays (drapeau emoji), cursus et ville en Chine (l'université n'est **pas** nommée, conformément à la charte), citation courte (300 caractères max), et vidéo optionnelle (lien YouTube ou TikTok ouvert dans un nouvel onglet ; pas d'intégration lourde au chargement).
   - Affichage : page d'accueil (3 témoignages au hasard, carrousel horizontal sur mobile) et pages cursus (filtrés par `cursus`). Si la liste est vide, la section **n'est pas rendue**.
3. **« Ce que vous recevez »** (documents d'exemple) :
   - Créer `content/preuves.json` (liste vide au départ, même modèle) et un dossier `public/images/preuves/`.
   - Composant affichant 3 vignettes cliquables (agrandissement plein écran) : Admission Notice, JW202, visa X1, **toujours floutés** sur le nom, la photo et les numéros. Légende : « Exemple réel, informations personnelles masquées, publié avec l'accord de l'étudiant. »
   - Section placée sur les pages cursus, après « Nous prenons en charge ». Non rendue si la liste est vide.
4. **Conseiller visible et bouton WhatsApp flottant** :
   - Créer `content/conseillers.json` : prénom, rôle, photo, langues parlées, numéro WhatsApp (format international, sans « + »).
   - Bouton WhatsApp flottant en bas à droite, sur toutes les pages sauf le formulaire `/postuler` (pour ne pas distraire). Message pré-rempli selon la page : « Bonjour Odysseo, j'ai une question sur [nom de la page]. » Taille du bouton ≥ 48 px, `aria-label`.
   - Dans le pied de page et sur la page d'accueil : petite carte « Votre conseiller : [Prénom], [rôle] » avec photo, si `conseillers.json` n'est pas vide.
   - Si le PACK-04 est appliqué, envoyer l'événement `whatsapp_click` avec `source: "bouton_flottant"`.
5. **Documenter** dans `content/README.md` comment ajouter un témoignage : déposer la photo dans `public/images/temoignages/`, ajouter une entrée au JSON, déployer. Aucun code à modifier.

## Critères d'acceptation
- [ ] Avec les JSON vides, le site s'affiche exactement comme avant (sauf le bouton WhatsApp flottant).
- [ ] En ajoutant l'exemple de `temoignages_modele.json` (en local seulement), la carte s'affiche sur l'accueil et sur la page du cursus concerné.
- [ ] Le bouton flottant n'apparaît pas sur `/fr/postuler`, ne cache aucun bouton important sur mobile (360 px) et ouvre WhatsApp avec le bon message.
- [ ] Les images sont optimisées (`next/image`, ≤ 150 Ko chacune).
- [ ] `npm run build` passe.

## Ne pas faire
- **Ne jamais inventer de témoignage, de photo ou de chiffre** (« 500 étudiants accompagnés », etc.). Le concurrent affiche « 500 » puis « 600 universités » sur la même page : c'est exactement ce qui fait perdre la confiance.
- Ne pas nommer l'université dans un témoignage.

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-06 Preuves et confiance` dans `CHANGELOG.md`.
- Commit : `feat(trust): témoignages, documents d'exemple, conseiller et bouton WhatsApp (PACK-06)`.

## À fournir par le fondateur
- [ ] 3 à 8 témoignages réels : photo, prénom, pays, cursus, ville, citation, **accord écrit** (voir `accord_temoignage.md`).
- [ ] 2 ou 3 photos de documents reçus par un étudiant (Admission Notice, JW202, visa), floutées.
- [ ] Prénom, rôle et photo du ou des conseillers.
