# PACK-09 · FAQ et guide « Avant le départ » en français
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN)._

## Contexte
Les étudiants et les parents posent toujours les mêmes questions sur WhatsApp : arnaque ou pas, IELTS, relevé bancaire, visa, quand payer. Le concurrent DigiEduPro a une FAQ et des guides, mais en anglais uniquement, vieillis (articles de 2017 à 2021) et éparpillés dans un blog. Odysseo peut faire **mieux et plus simple** : une seule page de FAQ en français, à jour, et une checklist imprimable.

## Fichiers fournis
- `faq_fr.json` : 22 questions-réponses en 6 catégories, rédigées pour Odysseo.
- `checklist_depart_fr.json` : liste « Avant le départ » en 4 sections.

## Tâches
1. **Explorer d'abord** : la structure des pages, le système de traduction FR/EN et les composants existants (accordéon, cartes).
2. Copier les JSON dans `content/faq/` et `content/guides/`.
3. **Règle de publication** : ne pas afficher une question ou un élément dont le texte contient `[À VALIDER]`. Garder les crochets numériques à valider (ex. `[7]`) **masqués** aussi. Ajouter un test qui échoue si un texte affiché contient « [À ».
4. **Page `/[locale]/faq`** :
   - Titre « Questions fréquentes », puis un champ de recherche (filtre instantané sur les questions et les réponses, sans librairie lourde).
   - Catégories en onglets ou en ancres (6 catégories), questions en accordéon (une ouverte à la fois, accessible au clavier, `aria-expanded`).
   - En bas : « Vous ne trouvez pas votre réponse ? » + bouton WhatsApp + bouton « Analyse gratuite ».
   - Données structurées `FAQPage` (JSON-LD) générées à partir des questions affichées.
5. **Page `/[locale]/guides/avant-le-depart`** :
   - Checklist avec cases à cocher. L'état est mémorisé dans `localStorage` (`odysseo_checklist_depart`), dans un try/catch.
   - Bouton « Imprimer / Enregistrer en PDF » (`window.print()` + feuille de style `@media print` propre : noir sur blanc, logo, sans menu).
6. **Version EN** : traduire les deux JSON en anglais (`faq_en.json`, `checklist_depart_en.json`), dans un ton simple. Ajouter en tête de chaque fichier `"meta.traduction_a_relire": true`.
7. **Liens** : ajouter « FAQ » dans le pied de page et dans le menu mobile. Depuis les pages cursus, ajouter un lien « Questions fréquentes » sous le bloc tarifs. Depuis l'écran de résultat du formulaire (PACK-02, s'il est appliqué), ajouter un lien vers le guide.
8. Ajouter les deux pages au sitemap (PACK-05, s'il est appliqué).

## Critères d'acceptation
- [ ] `/fr/faq` affiche les questions sans aucune mention « [À VALIDER] » (19 questions visibles avec le fichier fourni).
- [ ] Taper « relevé » dans la recherche ne laisse que la question sur le relevé bancaire.
- [ ] Le test Google « Résultats enrichis » reconnaît le `FAQPage`.
- [ ] La checklist garde les cases cochées après un rechargement, et l'impression tient sur 2 pages A4 maximum.
- [ ] Les pages sont lisibles à 360 px de large ; texte ≥ 12 px.
- [ ] `npm run build` passe.

## Ne pas faire
- Ne pas créer de blog. Une FAQ à jour vaut mieux que 30 articles datés.
- Ne pas modifier le contenu des réponses : seul le fondateur valide les textes.

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-09 FAQ et guide avant le départ` dans `CHANGELOG.md`.
- Commit : `feat(content): FAQ FR/EN avec recherche et checklist avant le départ (PACK-09)`.

## À faire par le fondateur
- Valider les 3 réponses marquées [À VALIDER] (calendrier, échéancier, moyens de paiement) et le délai d'accueil à l'aéroport. Il suffit de modifier le texte dans le JSON : elles s'afficheront automatiquement.
