# Catalogue d'offres « Vos 3 offres » (PACK-02)

| Fichier | Contenu | Où il est lu |
|---|---|---|
| `offres_2027.json` | Catalogue : 40 offres, critères, filières, familles, score interne. Noms d'universités masqués (« Université *** »). | Serveur uniquement : `src/lib/matching/catalogue.ts` (API `/api/candidatures`, tableau de bord). |
| `offres_2027_internes.json` | **CONFIDENTIEL** : référence → vraie université, partenaire, notes internes. | Serveur uniquement : `src/lib/matching/internes.ts`, lu par la fiche dossier du tableau de bord. |

Les deux modules commencent par `import "server-only"` : le build échoue si un composant client les importe.
Le navigateur ne reçoit que les champs publics des 3 offres retenues : `ref`, `role`, `cycle`, `lieu_affiche`,
`arguments`, `langue`, `duree`, `date_limite`, `filieres_correspondantes`. Jamais `score`, `criteres` ni `statut`.

## Mettre à jour le catalogue (sans toucher au code)

1. Remplacer `offres_2027.json` par le nouveau fichier, **au même format** (mêmes champs pour chaque offre).
2. Changer `meta.version` (ex. `2027.09-v3`) : cette valeur est enregistrée avec chaque dossier (`matchingVersion`).
3. Mettre à jour `offres_2027_internes.json` si des références ont été ajoutées.
4. Une offre en vérification garde `"publiable": false` : elle n'est jamais proposée.
5. Vérifier : `npm test` (les tests de `src/lib/matching/recommander.test.ts` utilisent `_ameliorations/PACK-02/fixtures_profils.json` ;
   si les offres changent, les résultats attendus des fixtures peuvent changer : les régénérer avec
   `python3 _ameliorations/PACK-02/matching_reference.py data/offres/offres_2027.json _ameliorations/PACK-02/fixtures_profils.json`).
6. Commit + push : Vercel redéploie.

Les textes `arguments`, `langue` et `duree` sont rédigés en français ; leur traduction anglaise est faite par
`src/lib/matching/public-offer.ts` (`translateOfferText`). Un test signale tout texte resté en français :
compléter la liste de remplacements si un nouveau texte apparaît.

## Algorithme

`src/lib/matching/recommander.ts` est le port à l'identique de `_ameliorations/PACK-02/matching_reference.py`,
qui fait foi. Ne pas modifier les exclusions, pondérations ou l'ordre de sélection sans mettre à jour le script
Python et les fixtures en même temps.

Le dépôt GitHub doit rester **privé** (fichier interne).
