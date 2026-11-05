# PACK-03 · Pages offres publiques (une page par référence)
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN). **Prérequis : PACK-02 appliqué** (catalogue `data/offres/offres_2027.json` présent et typé). PACK-04 recommandé (événement `ViewContent`)._

## Contexte
Les publicités Odysseo se terminent par « Envoyez P-04 sur WhatsApp ». Aujourd'hui, le site ne montre aucune offre : un étudiant qui clique sur une publicité arrive sur une page générique. Chaque référence doit avoir sa page, qui sert de destination aux publicités et de lien à partager sur WhatsApp.

## Objectif
- `/[locale]/offres` : catalogue filtrable (niveau, domaine, ville), noms d'universités masqués.
- `/[locale]/offres/[ref]` (ex. `/fr/offres/p-04`) : détail d'une offre, avec un bouton « Vérifier mon éligibilité » qui ouvre le formulaire en pré-remplissant le niveau et la référence.

## Tâches
1. **Explorer d'abord** : la structure des pages, la navigation (« Nos cursus », « Nos services », « Devenir partenaire »), les composants de carte et les traductions.
2. **Données** : lire `data/offres/offres_2027.json` côté serveur. Ne garder que les offres où `publiable === true`. Ne jamais lire le fichier `_internes`.
3. **Page liste `/[locale]/offres`** :
   - Filtres (boutons, avec état dans l'URL `?cycle=master&famille=...&ville=...`) : Niveau (Doctorat / Master), Domaine (les `familles` du JSON, libellés FR ; prévoir des libellés EN), Ville.
   - Carte : référence, « Université *** – lieu_affiche », 2 premières puces `arguments`, nombre de filières, date limite si connue, bouton « Voir l'offre ».
   - Tri par défaut : date limite la plus proche, puis allocation maximale décroissante. **Ne pas trier par le champ `score`, ni l'afficher.**
   - En haut de page : « [N] offres boursières pour la rentrée de septembre 2027 », puis le bouton « Analyse gratuite de mon profil » vers `/postuler`.
4. **Page détail `/[locale]/offres/[ref]`** (génération statique avec `generateStaticParams`, URL en minuscules) :
   - Bandeau : référence + « Université *** – lieu_affiche » + niveau + rentrée.
   - Tableau : langue, durée, bourse (`bourse_texte`), allocation (`allocation_texte`), logement (`logement_texte`), conditions (`conditions_texte`), date limite.
   - Liste des filières, regroupées par langue d'enseignement (anglais / chinois).
   - Encadré « Pourquoi le nom de l'université n'est pas affiché ? » : « Nos offres viennent de nos accords avec les universités. Le nom vous est communiqué dès l'ouverture de votre dossier. Il figurera sur votre lettre d'admission officielle. »
   - Bouton principal « Vérifier mon éligibilité » → `/[locale]/postuler?ref=P-04&level=master` : le formulaire pré-sélectionne le niveau, conserve `ref` (attribution PACK-04) et l'enregistre dans le dossier (`ref_offre_initiale`).
   - Bouton secondaire WhatsApp : « Bonjour Odysseo, je suis intéressé(e) par l'offre P-04. »
   - `generateMetadata` : titre « Master boursier à Xi'an – MA-07 · Odysseo Education » et image Open Graph générée (voir PACK-05) avec la ville et l'argument principal.
   - Mention : « Montants indicatifs communiqués par les universités, sous réserve de confirmation à l'admission. »
   - Référence inconnue ou non publiable → page 404 propre avec un lien vers `/offres`.
5. **Navigation** : ajouter « Nos offres » dans le menu, entre « Nos cursus » et « Nos services » (FR « Nos offres » / EN « Scholarships »). Sur la page d'accueil, ajouter un bloc « Offres à date limite proche » : les 3 offres publiables avec la `date_limite` la plus proche.
6. Ajouter les nouvelles pages au `sitemap.ts` (PACK-05), si celui-ci existe.

## Critères d'acceptation
- [ ] `/fr/offres` affiche 32 offres (les offres publiables du catalogue v2) ; les filtres fonctionnent et l'URL change.
- [ ] `/fr/offres/ma-24` affiche la date limite 31/01/2027 et le bouton d'éligibilité ouvre `/fr/postuler?ref=MA-24&level=master` avec « Master » pré-sélectionné.
- [ ] `/fr/offres/p-06` (offre en vérification) renvoie 404.
- [ ] Aucun nom réel d'université, ni « RK », ni « score / or / argent / bronze » dans le HTML généré (`grep` sur `.next/`).
- [ ] Pages lisibles à 360 px de large ; texte ≥ 12 px.
- [ ] `npm run build` passe ; les pages sont statiques (SSG).

## Ne pas faire
- Ne pas afficher les prix Odysseo sur les pages offres. Ces pages présentent ce que donne l'université, pas le tarif de l'accompagnement.

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-03 Pages offres publiques` dans `CHANGELOG.md`.
- Commit : `feat(offres): catalogue public filtrable et page par référence (PACK-03)`.
