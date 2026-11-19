# PACK-13 · Analyse IA + rapport PDF + offres évolutives
_Odysseo Education · v4 du 19/11/2026 · Document à donner tel quel à Claude Code dans le dépôt de la plateforme (https://odysseo-education.vercel.app)._
_Fourni avec `PACK-13_connaissances_v4.zip` (base de connaissances, 11 exemples, 11 PDF de référence)._
_Prérequis : **ODY-15 appliqué** (statuts unifiés `AdmissionReport.status`, dépôt / envoi / relances). Le PACK-13 ne fait que **produire** le rapport ; l'envoi, la confirmation, les badges et les relances restent ceux d'ODY-15._

**Principes du fondateur : simplicité, efficacité, professionnalisme.** En cas de doute, la solution la plus simple pour l'équipe et pour l'étudiant.

---

## 0. Instructions pour Claude Code
1. Lis d'abord le code (ODY-15 en place, modèle de demande, moteur de brouillon PACK-11/12, catalogue JSON). **Adapte-toi au stack** ; ne réécris pas ce qui marche.
2. L'analyse IA crée un rapport dans le bloc « Rapport d'admissibilité » d'ODY-15 avec `source = ia`. Le moteur de règles existant reste en **secours** (`source = regles`).
3. **Ne fais pas** le circuit d'envoi ni les relances : ils existent dans ODY-15.
4. Aucun nom réel d'université ne sort vers l'étudiant ; **l'IA ne reçoit que les noms masqués**. Les **prix Odysseo ne viennent jamais de l'IA** (`tarifs.json`).
5. Dashboard confortable sur téléphone. Mets à jour la version et le changelog.

---

## 1. Circuit
```
Étudiant soumet son profil
  → infos manquantes ? → statut infos_manquantes + message de question (§3.6), pas d'IA
  → analyse_en_cours → pré-filtre (code) → analyse IA → validation serveur → PDF
  → a_valider (« Rapport prêt » dans ODY-15) + alerte équipe
Équipe : relit, corrige si besoin, envoie (ODY-15)
À l'ouverture du dossier : « Revérifier les offres » (§5) → rapport v2 si une offre a fermé
À chaque mise à jour du catalogue (§6) : liste des rapports touchés
```
Objectif : rapport prêt à valider en **moins de 5 minutes** après la soumission. Afficher le temps de réponse (soumission → envoi) par demande et en moyenne sur la semaine.

**Statuts ajoutés par ce pack** (dans le champ unique d'ODY-15) : `infos_manquantes`, `analyse_en_cours`, `a_revoir` (IA en échec ou alerte : secours utilisé).

---

## 2. Base de connaissances (dans le dépôt, hors code)
```
connaissances/
  regles_odysseo.md      ← prompt système (règles de vente, de rédaction, offres évolutives, MBBS)
  structure_rapport.md   ← ordre des blocs, mise en page, textes fixes « offres évolutives »
  exemples/              ← 11 rapports validés, anonymisés ; cas et statut en tête de chaque fichier
tarifs.json, offres_2027.json, offres_mars_2027.json   ← déjà en place
```
- `reference_visuelle/` (dans le zip) : les 11 PDF réellement envoyés. **Le PDF de la plateforme doit leur ressembler.** Ils contiennent des noms réels : **hors dépôt public, jamais envoyés à l'IA**.
- Quand une règle change, le fondateur reçoit de Claude un nouveau `regles_odysseo.md` : on remplace le fichier, sans toucher au code. Chaque version porte un `PROMPT_VERSION` en tête, enregistré avec chaque rapport.
- **Prompt caching** Anthropic sur le bloc « règles + structure + exemples » (identique d'une analyse à l'autre).

### 2.1 Choix des exemples envoyés à l'IA (2 par analyse)
| Cas du profil | Exemples |
|---|---|
| MBBS | 01, 02 (07 seulement si réorientation, partie médecine périmée) |
| Licence, moyenne < 12 | 04, 09 |
| Licence, rentrée pas encore ouverte | 10 (bonne moyenne) ou 11 (moyenne moyenne / filière à choisir), 03 |
| Master | 08 ; 05 si doctorat demandé sans Master ; 06 si profil lettres / langues |
| Langue « uniquement avec bourse » | 06 |
Ensuite, priorité aux rapports **validés sur la plateforme** du même cas et du même niveau (§3.5).

---

## 3. Moteur d'analyse

### 3.1 Pré-filtre (code, sans IA)
Ne transmettre que les offres qui passent **tous** les filtres :
1. `statut = active` (exclure `expiree`, `quota_atteint`, `non_eligible_afrique`).
2. Date limite non dépassée (« à confirmer » incluse).
3. Cycle compatible (langue / bachelor / mbbs / master / phd).
4. Âge dans la fourchette (borne basse « ? » : filtrer sur la borne haute seulement).
5. Filière compatible (table ODY-11 si en JSON, sinon mots-clés).
6. MBBS : toutes les `MB-xx` + les `L-xx` (plan mars → septembre) + les `B-xx` sciences / ingénierie.

Moins de 3 offres : envoyer ce qui reste + alerte « peu d'offres compatibles ».

### 3.2 Appel à Claude
- `ANTHROPIC_API_KEY` dans Vercel **[À COMPLÉTER — fondateur]**. Modèle `claude-sonnet-5-5`, `temperature 0.2`, `max_tokens 2500`, en arrière-plan (60 s max).
- Échec : 1 nouvelle tentative, puis secours + `a_revoir` + alerte. Bouton « Relancer l'analyse ».
- Prompt système = `regles_odysseo.md` + `structure_rapport.md` + 2 exemples (§2.1).
- Données envoyées : `profil`, `offres_candidates` (champs publics, noms masqués), `date_du_jour`, `catalogue_version`, `mode` (`nouveau` | `mise_a_jour`), `offres_rapport_precedent` (mode mise à jour). **Jamais** : nom réel, partenaire (RK), notes internes.
- Sortie obligatoire via l'outil `rapport_admissibilite` (§3.3) ; rejeter toute réponse hors schéma.
- Journaliser : durée, tokens, coût estimé, `PROMPT_VERSION`, `catalogue_version`.

### 3.3 Schéma JSON de sortie
```json
{
  "cas": "standard | moyenne_faible | mbbs | parcours_complet | septembre_non_ouvert | master_phd | langue | peu_offres",
  "service_tarif": "langue | bachelor | mbbs | master | phd | parcours_complet",
  "destinataire": "etudiant | parent",
  "verdict": "1 ligne positive contenant « admissible »",
  "verdict_nuance": "1-2 phrases",
  "section_contexte": { "titre": "…", "puces": ["…"], "encadre": "NOTRE GARANTIE / NOTRE ENGAGEMENT (optionnel)" },
  "synthese_profil": "atouts + point d'attention éventuel",
  "offres": [
    { "ref": "B-03", "role": "ambitieuse | cible | securite | reorientation",
      "type_bourse": "totale | partielle | sans_bourse",
      "pourquoi_cette_offre": "1-2 phrases" }
  ],
  "pourquoi_option_1": "1-2 phrases",
  "pret_plus_tot": "texte de l'encadré « Si vous êtes prêt plus tôt » ou null",
  "plan_mbbs": { "etape_langue": "…", "etape_mbbs": "…", "contraintes": ["…"] },
  "reorientation": { "proposee": false, "texte": "…", "refs": [] },
  "changements": ["mode mise_a_jour : offre remplacée et pourquoi"],
  "a_preparer": ["Passeport : à demander | à finaliser | déjà valide", "Se préparer à un éventuel entretien en anglais"],
  "argument_urgence": "1 phrase (vraie date limite ou quotas)",
  "niveau_confiance": "haut | moyen | bas",
  "alertes_internes": ["visible équipe uniquement"]
}
```

### 3.4 Validation serveur (avant le PDF)
- Chaque `ref` existe dans `offres_candidates`, sinon retirée + alerte.
- 3 ou 4 offres hors réorientation ; pas 3 fois la même université ; pas 3 BRONZE → sinon `a_revoir`.
- Aucun nom réel ni « RK » → sinon remplacé par le libellé masqué + alerte.
- Aucun « test d'anglais à passer », « trouver des enseignants », « financement », « bourse CSC » → sinon `a_revoir`.
- **Frais d'origine, frais après bourse, allocation et dates limites recopiés par le code depuis l'offre** (l'IA ne fait que citer les `ref`).
- Offre dont la date limite tombe dans moins de 21 jours : alerte « date proche » (visible équipe).

### 3.5 Apprentissage par les corrections
- Quand un membre modifie puis valide un rapport `ia`, enregistrer sortie d'origine + version validée + cas + niveau.
- Les 3 derniers rapports validés du même cas et niveau remplacent progressivement les exemples fixes.
- Onglet « Corrections » : modifications les plus fréquentes, pour en faire des règles dans `regles_odysseo.md`.

### 3.6 Profil incomplet
Moyenne, diplôme / série, âge ou filière manquants : pas d'IA, statut `infos_manquantes`, message prêt (bouton WhatsApp d'ODY-15) :
```
Bonjour {prenom} 👋 Merci pour votre demande d'analyse Odysseo.
Pour vous proposer les meilleures offres d'admission avec bourse, il nous manque : {liste_infos}.
Répondez simplement ici, et vous recevez votre rapport dans la journée 🙂
L'équipe Odysseo
```
Le membre complète le profil → l'analyse se lance.

---

## 4. Rapport PDF
- Généré côté serveur, stocké dans le stockage existant (privé, servi par le lien `/rapport/{token}` d'ODY-15).
- **Suivre `structure_rapport.md` et `reference_visuelle/`** : bandeau noir ODYSSEO / EDUCATION (rouge), titres rouges numérotés, encadré verdict à filet rouge, tableau des offres (« Notre choix »), graphique en barres, encadré noir « Pour lancer votre dossier », Inter, 3 pages (4 max), pied de page WhatsApp + e-mail. Pas de signature ni de cachet.
- **Textes fixes « offres évolutives »** insérés par le code (voir fin de `structure_rapport.md`) : sous le tableau des offres et dans l'encadré final.
- Tarifs, 4 versements, inclus / non inclus : depuis `tarifs.json`.
- `destinataire = parent` : on s'adresse au parent (« votre enfant »).
- Chaque rapport enregistre un **instantané** : `catalogue_version`, `date_emission`, et pour chaque offre proposée `ref`, date limite, frais et bourse au moment de l'émission.

---

## 5. Revérifier les offres (offres évolutives)
Un étudiant peut se décider 2 à 3 semaines après son rapport, ou compléter son dossier plus tard. Entre-temps, des offres ferment (date limite, quota) et d'autres arrivent.

**Bouton « Revérifier les offres »** dans la fiche (visible dès que le rapport est envoyé ; mis en avant à `oui_recu` et à `premier_versement_recu`) :
1. Compare chaque offre de l'instantané au catalogue actuel : ✅ toujours ouverte · ⚠️ date limite dans moins de 21 jours · ❌ fermée (date passée, `expiree`, `quota_atteint`) · 🆕 nouvelle offre compatible apparue depuis.
2. Tout est ✅ : rien à faire, entrée au journal « Offres revérifiées le … ».
3. Une offre ❌, ou une 🆕 meilleure que l'option sécurité : bouton « **Préparer le rapport mis à jour** » → analyse IA en `mode = mise_a_jour` → nouvelle version du rapport (v2) en « Rapport prêt », avec bandeau « RAPPORT MIS À JOUR » et ligne « Ce qui change ». L'envoi se fait par ODY-15, avec le message MSG-MAJ (§7).
4. Sans clé API : le membre dépose la v2 à la main (dépôt manuel ODY-15).

Rien n'est envoyé automatiquement à l'étudiant.

---

## 6. Mise à jour du catalogue (paquet MAJ-OFFRES)
Aujourd'hui, les nouvelles offres passent par le projet Claude Odysseo. Pour que ce soit **un seul geste** :

**Le paquet** `MAJ-OFFRES_AAAA-MM-JJ.zip`, fourni par Claude au fondateur :
```
offres_2027.json, offres_mars_2027.json   ← catalogue complet (remplace les anciens)
CHANGELOG_OFFRES.md                        ← ajoutées / modifiées / fermées, par ref
regles_odysseo.md                          ← seulement si une règle change
```
- Chaque JSON porte `"version"` (ex. `2027.09-v3`) et `"maj_le"`.
- Statuts d'offre : `active`, `a_confirmer`, `expiree`, `quota_atteint`, `non_eligible_afrique`. **Une ref n'est jamais renumérotée ni supprimée** : une offre fermée change de statut.

**Ce que fait Claude Code à chaque paquet** (consigne donnée par le fondateur : « Applique MAJ-OFFRES_… ») :
1. Remplace les fichiers. Lance le script de contrôle `npm run check-offres` (**à créer avec ce pack**) : JSON valide, refs uniques, aucune ref disparue, dates au bon format, statuts connus. S'il échoue : ne rien déployer, expliquer.
2. Déploie.
3. Au déploiement, la plateforme calcule les **rapports touchés** (envoyés, `lu` ou `oui_recu`, non encore au 1er versement) qui contiennent une offre passée ❌ ou ⚠️ ; alerte équipe (Telegram + e-mail) : « 4 rapports touchés par la mise à jour du catalogue » + lien vers le filtre **« Offres à revérifier »** du dashboard.

**Plus tard (hors périmètre)** : page « Catalogue » dans le dashboard pour importer l'Excel du partenaire et changer un statut (fermée, quota atteint) en 1 clic, sans passer par Claude ni par le développeur.

---

## 7. Messages WhatsApp (`messages_whatsapp.json`)
Variables : `{prenom}`, `{lien_rapport}`, `{nb_offres}`, `{rentree}`, `{premier_versement}`, `{date_validite}`. Choix automatique selon le cas ; le membre peut changer de modèle et modifier le texte. Chaque message se termine par « L'équipe Odysseo ».

| Condition | Modèle |
|---|---|
| `cas = mbbs` | MSG-MBBS |
| `service_tarif = parcours_complet` | MSG-PARCOURS |
| `cas = moyenne_faible` | MSG-MOYENNE |
| `cas = septembre_non_ouvert` | MSG-SEPTEMBRE |
| Langue | MSG-LANGUE |
| Bachelor | MSG-BACHELOR |
| Master / PhD | MSG-MASTER-PHD |
| Rapport mis à jour | MSG-MAJ |

**MSG-BACHELOR**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Votre profil correspond à {nb_offres} offres d'admission avec bourse ouvertes aujourd'hui pour la rentrée {rentree}. Le rapport détaille chaque offre, ce que vous économisez grâce à la bourse et le montant pour ouvrir votre dossier : {premier_versement} FCFA.

Pour démarrer, il vous suffit de votre passeport. Le reste, on s'en occupe.
Les places dépendent des dates limites et des quotas : rapport valable jusqu'au {date_validite}. Répondez « OUI » 📲
L'équipe Odysseo
```

**MSG-MOYENNE**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Votre dossier est solide pour une admission en Chine. Nous avons sélectionné {nb_offres} offres ouvertes aujourd'hui, avec bourse partielle accordée par l'université, et des bourses au mérite possibles pendant vos études.

C'est maintenant que nous sécurisons les places grâce à nos quotas. Il vous suffit de votre passeport pour commencer.
Rapport valable jusqu'au {date_validite}. Répondez « OUI » pour ouvrir votre dossier 📲
L'équipe Odysseo
```

**MSG-SEPTEMBRE**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Les universités ouvrent leurs candidatures pour la rentrée {rentree} au fil des mois. C'est maintenant que nous attribuons les places de nos quotas : un dossier ouvert aujourd'hui est déposé dès le premier jour. Le rapport vous montre les offres déjà ouvertes, du même niveau que celles que nous viserons pour vous.

Pour réserver votre place : {premier_versement} FCFA et votre passeport.
Rapport valable jusqu'au {date_validite}. Répondez « OUI » 📲
L'équipe Odysseo
```

**MSG-MBBS**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Bonne nouvelle : votre projet de médecine en Chine est réalisable. Nous vous proposons un parcours sécurisé : 6 mois de chinois en Chine dès mars, puis votre entrée en médecine en septembre.

Le rapport vous explique clairement les bourses possibles en médecine et le budget à prévoir. Il contient aussi une option supplémentaire, à votre choix, pour maximiser vos chances de bourse.

Les places sont limitées : on en parle aujourd'hui ? Répondez « OUI » 📲
L'équipe Odysseo
```

**MSG-PARCOURS**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Nous vous proposons notre parcours complet : 6 mois de chinois en Chine, puis votre licence, avec un seul accompagnement Odysseo du début à la fin (visa, accueil à l'aéroport, installation).

Tout est détaillé dans le rapport, avec le montant pour ouvrir votre dossier. Il vous suffit de votre passeport pour commencer.
Rapport valable jusqu'au {date_validite}. Répondez « OUI » 📲
L'équipe Odysseo
```

**MSG-LANGUE**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Nous avons sélectionné {nb_offres} programmes de chinois ouverts aujourd'hui pour la rentrée {rentree}, avec le budget détaillé et le montant pour ouvrir votre dossier : {premier_versement} FCFA.

Il vous suffit de votre passeport pour commencer.
Rapport valable jusqu'au {date_validite}. Répondez « OUI » 📲
L'équipe Odysseo
```

**MSG-MASTER-PHD**
```
Bonjour {prenom} 👋
Votre rapport d'admissibilité Odysseo est prêt ✅
📄 {lien_rapport}

Votre profil correspond à {nb_offres} offres d'admission avec bourse pour la rentrée {rentree}. Bonne nouvelle : le niveau d'anglais exigé et les lettres de recommandation, c'est Odysseo qui s'en occupe. Vous n'avez qu'à vous préparer à un éventuel entretien.

Le rapport détaille chaque offre et le montant pour ouvrir votre dossier : {premier_versement} FCFA.
Rapport valable jusqu'au {date_validite}. Répondez « OUI » 📲
L'équipe Odysseo
```

**MSG-MAJ**
```
Bonjour {prenom} 👋
Comme prévu, nous avons revérifié vos offres avant de déposer votre dossier ✅
📄 Votre rapport mis à jour : {lien_rapport}

Certaines universités ont fermé leurs candidatures ou rempli leurs places depuis votre premier rapport : nous les avons remplacées par les meilleures offres équivalentes ouvertes aujourd'hui. Tout est expliqué dans la partie « Ce qui change ».

Une question ? Répondez ici, on vous répond rapidement 🙂
L'équipe Odysseo
```

---

## 8. Tests d'acceptation
| # | Profil / action | Résultat attendu |
|---|---|---|
| 1 | Bac C, 16,5/20, 19 ans, informatique, mars | 3-4 offres B-xx (ambitieuse / cible / sécurité), frais d'origine à côté des frais après bourse, MSG-BACHELOR |
| 2 | Bac D, 11/20, gestion | `moyenne_faible`, aucune promesse de bourse totale, MSG-MOYENNE |
| 3 | Bac D, 14/20, médecine | `mbbs`, plan mars → sept, 15 000 – 35 000 RMB/an + reste à charge de chaque MB-xx, réorientation APRÈS |
| 4 | Bac A, médecine | `mbbs`, **pas** de réorientation ingénierie |
| 5 | Licence lettres → Master | MA-xx, MSG-MASTER-PHD, aucun test d'anglais demandé |
| 6 | Licence, rentrée sept. pas ouverte, passeport valide | `septembre_non_ouvert`, offres de mars en exemple, encadré « Si vous êtes prêt plus tôt », MSG-SEPTEMBRE |
| 7 | Moyenne non renseignée | `infos_manquantes`, message de question, aucun appel IA |
| 8 | Formulaire rempli par un parent | PDF adressé au parent |
| 9 | Clé API invalide | 1 nouvelle tentative, secours, `a_revoir`, alerte |
| 10 | Tous | Aucun nom réel ni « RK » ; textes fixes « offres évolutives » présents ; jamais « Financement » ; < 5 min |
| 11 | Passer une offre d'un rapport envoyé en `quota_atteint` puis déployer | Alerte « rapports touchés », filtre « Offres à revérifier », ❌ dans « Revérifier les offres », v2 avec « Ce qui change », MSG-MAJ |
| 12 | `npm run check-offres` avec une ref supprimée | Échec, rien n'est déployé |

---

## 9. À compléter
- [À COMPLÉTER — fondateur] Clé `ANTHROPIC_API_KEY` + plafond de dépense mensuel (console Anthropic).
- [À VALIDER — fondateur] Seuil « date proche » : 21 jours.
- [À VÉRIFIER auprès de RK] MB-01 / MB-02 valables pour une entrée en septembre après 6 mois de langue.
