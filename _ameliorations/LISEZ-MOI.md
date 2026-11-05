# Packs d'amélioration – plateforme Odysseo Education
_Préparés le 05/11/2026 après analyse de https://odysseo-education.vercel.app et du concurrent https://www.digiedupro.com (versions en ligne à cette date)._

## Comment utiliser un pack (développeur, ou n'importe qui de l'équipe)
1. Dézipper le pack **à la racine du dépôt** de la plateforme. Cela crée `_ameliorations/PACK-0X/` (et `_ameliorations/data/` pour les packs 02 et 03). Le zip complet contient tous les packs.
2. Ouvrir Claude Code dans le dossier du dépôt.
3. Écrire : **« Lis `_ameliorations/PACK-0X/AMELIORATION.md` et applique-le entièrement. »**
4. Claude Code explore le code, fait les modifications, lance les tests, met à jour la version et le `CHANGELOG.md`, puis propose un commit.
5. Vérifier en local avec la liste « Critères d'acceptation » du pack, puis déployer sur Vercel.

Un seul pack à la fois, dans l'ordre ci-dessous. Chaque pack dit s'il dépend d'un autre.

## Ordre recommandé
| Ordre | Pack | Objectif | Effort estimé | Dépend de |
|---|---|---|---|---|
| 1 | PACK-05 Partage & référencement | Aperçus propres sur WhatsApp et Facebook, Google indexe le site | ½ jour | — |
| 2 | PACK-04 Mesure des conversions | Savoir quelle publicité et quelle référence amènent les dossiers | 1 jour | — |
| 3 | PACK-09 FAQ & guide « Avant le départ » | Répondre seul aux questions répétées (arnaque, IELTS, relevé, visa) | ½ jour | — |
| 4 | PACK-06 Preuves & confiance | Témoignages réels, documents floutés, conseiller visible, bouton WhatsApp | 1 jour | — |
| 5 | PACK-01 Formulaire de qualification | Collecter les infos qui permettent de proposer les bonnes offres | 1 jour | — |
| 6 | PACK-02 Moteur « Vos 3 offres » | Afficher 3 offres personnalisées à la fin du formulaire | 2-3 jours | PACK-01 |
| 7 | PACK-07 Page Parents & paiement | Rassurer les parents : payer l'essentiel après l'admission | 1 jour | — (mieux après 06 et 09) |
| 8 | PACK-08 Suivi de dossier | Étudiant ou parent voit l'étape de son dossier avec son code | 2 jours | — |
| 9 | PACK-03 Pages offres publiques | Une page par référence (P-04, MA-07…) pour les publicités | 1-2 jours | PACK-02 (données) |
| 10 | PACK-10 Espace dossier (phase 2) | Rapport d'admissibilité, « Je valide », dépôt des documents depuis le téléphone, vérification par l'équipe | 5-7 jours | PACK-08 (et PACK-02 recommandé) |

## Règles communes à tous les packs
- Ne jamais afficher : le nom réel d'une université, le nom du partenaire, un classement, le « score » interne (or/argent/bronze).
- Le dépôt GitHub doit être **privé** : le pack 02 y ajoute `offres_2027_internes.json` (vrais noms d'universités).
- Le fichier `offres_2027_internes.json` ne doit **jamais** être importé dans un composant client ni renvoyé par une API publique.
- Ne pas casser l'existant : formulaire `/[locale]/postuler`, API `/api/candidatures`, programme partenaires (`/api/referral/...`), bandeau cookies, FR/EN.
- Tout texte visible existe en FR et en EN.
- Fin de chaque pack : version incrémentée dans `package.json` (mineure, ex. 1.3.0 → 1.4.0) et entrée datée dans `CHANGELOG.md` (créé s'il n'existe pas) avec l'identifiant du pack.
