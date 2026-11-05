# PACK-02 · Moteur de recommandation « Vos 3 offres »
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN). **Prérequis : PACK-01 appliqué** (champs `filiereDiplome`, `moyenne_pct`, `anglaisCertificat`, `anglaisScore`, `hsk`, `releve_bancaire_usd_max`, `diplomesOriginaux`, `domaines[]`, `age`)._

## Contexte
Aujourd'hui, après l'envoi du formulaire, l'étudiant n'obtient rien d'autre qu'un message WhatsApp pré-rempli avec son code dossier. Or la promesse du site est « Bénéficiez des meilleurs programmes ». Odysseo dispose d'un catalogue de **40 offres** (14 PhD, 26 Master, rentrée septembre 2027), structuré dans `data/offres_2027.json`.

## Objectif
Juste après l'envoi du dossier, afficher **3 offres personnalisées** (anonymisées : « Université *** – Ville »), chacune avec son rôle : ambitieuse, cible ou sécurité. Le message WhatsApp pré-rempli contient alors le code dossier **et** ces 3 références. L'étudiant voit immédiatement de la valeur, et l'équipe reçoit un lead déjà qualifié.

## Fichiers fournis
| Fichier | Rôle | Où le mettre |
|---|---|---|
| `../data/offres_2027.json` | Catalogue public (noms masqués) : 40 offres, critères, filières, familles | `data/offres/offres_2027.json` (ou équivalent serveur) |
| `../data/offres_2027_internes.json` | Correspondance référence → vraie université et partenaire. **CONFIDENTIEL** | `data/offres/` **uniquement côté serveur**. Jamais dans un composant client, jamais dans une réponse d'API publique |
| `matching_reference.py` | Algorithme de référence (Python), qui fait foi | À porter en TypeScript : `lib/matching/` |
| `fixtures_profils.json` | 5 profils de test avec les résultats attendus | Tests unitaires du port TypeScript |

## Tâches
1. **Explorer d'abord** : la route `/api/candidatures`, l'écran affiché après l'envoi, la construction du lien `wa.me`, le framework de test (Vitest ou Jest ; en installer un s'il n'y en a pas).
2. **Porter l'algorithme** `recommander()` de `matching_reference.py` en TypeScript (`lib/matching/recommander.ts`), **à l'identique** : mêmes exclusions, mêmes pondérations (`pertinence×10 + valeur×3 + allocation_min/1000`), même ordre de tri (total décroissant puis référence), même sélection ambitieuse → cible (autre ville, de préférence or/argent) → sécurité (autre ville, de préférence sans critères). Typer les offres d'après le JSON.
3. **Tests** : un test par profil de `fixtures_profils.json`. La liste des références obtenues doit être **exactement** `attendu_refs`. Ajouter des tests sur les exclusions (âge > `age_max`, IELTS insuffisant, `hsk_min`, relevé bancaire, nationalité exclue, `eligibilite_omm_requise`).
4. **Correspondance entre formulaire et profil** (fonction `profilDepuisCandidature`) :
   - `level` Master → `cycle: "master"` ; Doctorat → `"phd"` ; Langue ou Licence → **pas de recommandation** (voir point 6).
   - `domaines[]` → `domaines` (les codes du PACK-01 sont déjà ceux de `DOMAINE_VERS_FAMILLES`).
   - `filiereDiplome` → `filiere_libre` ; `age`, `moyenne_pct`, `hsk`, `releve_bancaire_usd_max` tels quels ; `diplomesOriginaux` Oui → `true`, Pas encore → `false`.
   - `anglaisCertificat` : IELTS, TOEFL ou Duolingo → `{type, score}` ; « études en anglais » → `{type:"etudes_en_anglais"}` ; sinon → `{type:"aucun"}`.
   - `pays` → `nationalite` ; `funding` « Uniquement avec une bourse » → `"bourse_uniquement"`, « une partie » → `"partiel"`, « tout » → `"total"`.
   - `eligible_omm` : toujours `false` (l'offre OMM est proposée par un conseiller, jamais automatiquement).
5. **Côté serveur** : dans `/api/candidatures`, après l'enregistrement du dossier, calculer les recommandations, les **enregistrer avec le dossier** (`recommandations: [{ref, role}]`, `moteur_version: "2027.09-v2"`) et renvoyer au client **uniquement** les champs publics des offres retenues : `ref`, `role`, `cycle`, `lieu_affiche`, `arguments`, `langue`, `duree`, `date_limite`, `filieres_correspondantes`. Ne jamais renvoyer `score`, `criteres` ou `statut`.
6. **Écran de résultat** (remplace ou complète l'écran actuel après l'envoi) :
   - Titre : « Vos 3 offres recommandées » ; sous-titre : « Sélection indicative, confirmée par un conseiller Odysseo sous 24 h. »
   - 3 cartes : badge du rôle (🎯 Ambitieuse · ✅ Cible · 🛡️ Sécurité), « Université *** – [lieu_affiche] », référence, puces `arguments`, « Votre filière : [filieres_correspondantes[0]] », date limite si connue.
   - **Moins de 3 offres** : afficher celles trouvées, puis « Un conseiller vous proposera d'autres options adaptées à votre profil. »
   - **Aucune offre, ou niveau Langue / Licence** : « Nos offres [Langue / Licence] 2027 vous seront envoyées par un conseiller sur WhatsApp. »
   - Bouton principal **« Recevoir le détail sur WhatsApp »** : message pré-rempli = message actuel + « Offres recommandées : P-04, MA-07, MA-21 ».
   - Mention en bas : « Montants indicatifs communiqués par les universités, sous réserve de confirmation à l'admission. Aucune admission n'est garantie. »
   - Design : charte existante (noir `#0B0B0D`, rouge `#FF0000`, Inter, texte ≥ 12 px), mobile d'abord.
7. **Administration** : si une vue admin des dossiers existe, y afficher les recommandations avec la **vraie université** (lecture de `offres_2027_internes.json` côté serveur uniquement).
8. **Mise à jour des données** : documenter dans `data/offres/README.md` que le catalogue se remplace en déposant un nouveau `offres_2027.json` au même format (champ `meta.version`), sans toucher au code.

## Critères d'acceptation
- [ ] Les 5 tests de `fixtures_profils.json` passent avec exactement les références attendues.
- [ ] Le profil de test « Licence génie civil 14/20, 25 ans, IELTS 6.5, relevé 5 000 USD, Master » affiche MA-26, MA-17 et MA-10 avec les rôles ambitieuse, cible et sécurité.
- [ ] Aucun nom d'université réel, ni « RK », ni score n'apparaît dans le HTML, le JS client ou la réponse réseau de `/api/candidatures` (rechercher « University », « RK », « bronze » dans l'onglet Réseau).
- [ ] Le lien WhatsApp contient le code dossier et les références recommandées.
- [ ] Pour le niveau « Licence », aucun plantage : le message de repli s'affiche.
- [ ] Le dossier enregistré contient `recommandations` et `moteur_version`.
- [ ] `npm run build` et tous les tests passent.

## Ne pas faire
- Ne pas modifier les pondérations ni l'ordre de sélection sans mettre à jour `matching_reference.py` et les fixtures en même temps. Ce sont eux qui font foi.
- Ne pas afficher les offres où `publiable` vaut `false` (offres en vérification).

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-02 Moteur de recommandation` dans `CHANGELOG.md`, en indiquant la version du catalogue (`2027.09-v2`).
- Commit : `feat(matching): recommandation de 3 offres après candidature (PACK-02)`.
