# ODY-15 · Suivi d'envoi du rapport d'admissibilité + relances (dashboard équipe)
_Odysseo Education · v1.1 du 19/11/2026 · Document à donner tel quel à Claude Code dans le dépôt de la plateforme (https://odysseo-education.vercel.app)._

**Principes du fondateur : simplicité, efficacité, professionnalisme.** En cas de doute, prendre la solution la plus simple pour l'équipe.

---

## 1. Le problème
- Dans le dashboard équipe, **toutes les candidatures restent affichées « Nouveau »**, même quand le rapport d'admissibilité a déjà été envoyé.
- Pour savoir si un rapport est parti, il faut ouvrir la candidature, cliquer sur le WhatsApp de l'étudiant et regarder dans le WhatsApp Odysseo (+8613179468571). **Tous les membres n'ont pas accès à ce WhatsApp.**
- Le rapport (PDF) et le message envoyé ne sont stockés nulle part sur la plateforme : un membre à distance ne peut ni les voir ni les envoyer à la place du fondateur.
- Les étudiants qui ne répondent pas ne sont pas relancés de façon régulière.

## 2. Ce qu'on veut
1. **Déposer** dans chaque candidature le rapport PDF + le message WhatsApp (aujourd'hui préparés par le fondateur avec Claude dans le projet Odysseo ; plus tard générés automatiquement par le PACK-13).
2. **N'importe quel membre** peut ensuite envoyer depuis la fiche (WhatsApp ou partage du PDF).
3. Une fois envoyé, la candidature passe à **« Rapport envoyé »** avec la date et le membre, **visible directement dans la liste**, sans ouvrir la candidature.
4. Dans la fiche : on voit **le PDF envoyé, le message envoyé, qui l'a envoyé et quand**.
5. **Relances préparées automatiquement** : chaque jour, la plateforme liste les étudiants à relancer avec le message prêt ; un membre envoie en 1 clic (§7).

Ce pack est **la couche « envoi + suivi + relances »**. Il fonctionne seul, en mode manuel, sans clé API. Quand le PACK-13 sera actif, l'IA remplira le même bloc automatiquement (§9).

---

## 3. Instructions pour Claude Code
1. Lis d'abord le code : modèle « demande d'analyse / candidature », dashboard équipe, statuts existants (PACK-11 si appliqué), relances PACK-11 si elles existent, stockage de fichiers déjà utilisé, authentification équipe, alertes Telegram / e-mail. **Réutilise l'existant**, n'ajoute pas de nouveau service.
2. `[À VÉRIFIER]` Pourquoi toutes les candidatures affichent « Nouveau » : champ statut absent, jamais mis à jour, ou PACK-11 pas appliqué ? Corrige la cause, puis applique ce pack.
3. Les statuts doivent être **les mêmes que ceux du PACK-13 §2** (`a_valider`, `envoye`, `lu`, `oui_recu`, `premier_versement_recu`…). Pas de second système de statuts. Les relances de ce pack **remplacent** les relances 48 h / 5 jours du PACK-11.
4. Dashboard **confortable sur téléphone** : le fondateur travaille surtout depuis son mobile.
5. Mets à jour le numéro de version et le changelog.

---

## 4. Modèle de données

**RapportAdmissibilite** (un ou plusieurs par candidature, versions conservées)
| Champ | Type | Note |
|---|---|---|
| id | uuid | |
| demande_id | réf. | candidature concernée |
| version | entier | 1, 2, 3… (un nouveau dépôt ne supprime pas l'ancien) |
| pdf_url | texte | fichier stocké dans le stockage existant, **privé** |
| nom_fichier | texte | ex. `Rapport_Odysseo_{Prenom}.pdf` |
| message | texte long | message WhatsApp qui accompagne le PDF |
| source | enum | `manuel` (déposé par un membre) · `ia` (PACK-13) · `regles` (secours PACK-11) |
| cas | enum | `standard` · `moyenne_faible` · `mbbs` · `parcours_complet` · `master_phd` · `langue` (choisi au dépôt, rempli par l'IA en PACK-13) — sert à choisir les relances |
| nb_offres | entier | nombre d'offres du rapport |
| premier_versement | entier FCFA | lu dans `tarifs.json` selon le service |
| date_validite | date | envoi + 7 jours |
| token | texte 32 car. | lien privé `/rapport/{token}` (voir §6) |
| depose_par, depose_le | | |
| envoye_par, envoye_le | | vides tant que non envoyé |
| mode_envoi | enum | `whatsapp_lien` · `partage_pdf` · `hors_plateforme` |
| lu_le | date-heure | 1re ouverture du lien privé |

**Relance**
`demande_id, numero (1, 2, 3), prevue_le, envoyee_le, envoyee_par, message, statut (a_faire, envoyee, reportee, annulee)`.

**Sur la candidature** : `relances_actives` (booléen, vrai par défaut), `motif_arret` (`oui_recu`, `versement`, `pas_interesse`, `autre_rentree`, `injoignable`, `autre`).

**JournalCandidature** (historique visible dans la fiche)
`demande_id, type (rapport_depose, rapport_modifie, rapport_envoye, envoi_annule, rapport_lu, relance_envoyee, relances_arretees, oui_recu, versement_recu, note), membre, date, detail`.

---

## 5. Écrans

### 5.1 Liste des candidatures (dashboard équipe)
- Nouvelle colonne **« Rapport »** avec un badge, visible sans ouvrir la candidature :

| Badge | Couleur | Quand |
|---|---|---|
| Nouveau | gris | aucun rapport déposé |
| Rapport prêt | orange | rapport déposé, pas encore envoyé |
| Envoyé · 18/11 · Jiresse | vert | envoyé (date courte + prénom du membre) |
| Lu | bleu | l'étudiant a ouvert le lien du rapport |
| Relance 1/3, 2/3, 3/3 | violet | dernière relance envoyée |
| OUI reçu | vert foncé | marqué par un membre |
| 1er versement | noir | PACK-11 |
| Sans suite | gris clair | relances arrêtées (motif au survol) |

- **Filtres rapides** en haut : « À envoyer » (Nouveau + Rapport prêt, par défaut), **« À relancer aujourd'hui »**, « Envoyés non lus », « Tous ». Compteurs sur chaque filtre.
- Tri : plus ancien en premier dans « À envoyer », avec le temps écoulé depuis la soumission (rouge au-delà de 24 h).
- **Rattrapage des dossiers déjà traités** : cases à cocher + action groupée **« Marquer rapport envoyé »** (date modifiable, `mode_envoi = hors_plateforme`, PDF facultatif, cas à choisir). Sert à mettre à jour d'un coup toutes les candidatures auxquelles le fondateur a déjà répondu ; elles entrent ensuite dans le calendrier de relances à partir de la date indiquée.

### 5.2 Fiche d'une candidature : bloc « Rapport d'admissibilité »
Placé en haut de la fiche, sous le profil.

**État « Nouveau »**
- Bouton **« Déposer le rapport »** : zone de dépôt du PDF (10 Mo max, PDF uniquement) + champ **« Message WhatsApp »** (collé depuis Claude) + sélecteur **« Cas »** + nombre d'offres + bouton « Enregistrer ».
- Raccourci **« Copier le profil pour Claude »** : copie dans le presse-papiers un résumé texte du profil (tous les champs du formulaire, sans données internes), pour le coller dans le projet Claude Odysseo. Format :
```
Demande ODY-XXXXXX · reçue le JJ/MM/AAAA
Rempli par : étudiant | parent
Prénom / Nom : …
Téléphone WhatsApp : …
Pays / Ville : …
Âge : …
Niveau demandé : … · Rentrée : …
Diplôme / Série : … · Moyenne : …
Filière souhaitée : …
Budget : …
Bourse : …
Commentaire : …
```

**État « Rapport prêt »**
- Aperçu du PDF (lecteur intégré) + « Télécharger ».
- Message affiché, **modifiable** avant l'envoi.
- Boutons :
  1. **« Envoyer via WhatsApp »** (principal) : ouvre `https://wa.me/{numero}?text={message encodé}`. Si le message ne contient pas déjà le lien du rapport, ajouter à la fin : `📄 Votre rapport : {lien_rapport}`.
  2. **« Partager le PDF »** (téléphone, si `navigator.canShare({ files })`) : copie d'abord le message dans le presse-papiers, puis `navigator.share({ files: [pdf], text: message })`. Toast : « Message copié : collez-le sous le PDF ».
  3. **« Copier le message »** (secours).
  4. « Remplacer le rapport » (nouvelle version).
- **Confirmation d'envoi** : sans API WhatsApp, la plateforme ne peut pas savoir seule que le message est parti. Donc, quand le membre revient sur l'onglet après avoir cliqué sur 1 ou 2 (événement `visibilitychange`), afficher : **« Le rapport est bien parti ? »** → **[Oui, marquer envoyé]** / [Pas encore]. « Oui » → statut `envoye`, `envoye_par`, `envoye_le`, `mode_envoi`, entrée au journal, **création des 3 relances prévues** (§7).
- Bouton discret **« Marquer comme envoyé »** pour un envoi fait en dehors de la plateforme.

**État « Envoyé » et suivants**
- Encart vert : **« Rapport envoyé le 18/11/2026 à 14:32 par Jiresse »** (+ « Lu le … » si ouvert).
- PDF envoyé (aperçu + téléchargement) et **message exact envoyé**, en lecture seule.
- Encart **« Relances »** : les 3 relances avec leur date prévue et leur état (✓ envoyée le … par … / prévue le … / annulée).
- Boutons : « L'étudiant a répondu OUI » (1 clic → `oui_recu`, relances arrêtées), **« Arrêter les relances »** (motif obligatoire, liste du §4), « Renvoyer le rapport », « Annuler l'envoi » (en cas d'erreur, entrée au journal).
- Si une nouvelle version est déposée après l'envoi : elle passe en « Rapport prêt (v2) », la v1 envoyée reste consultable.

**Historique** (bas de fiche) : liste chronologique du JournalCandidature, ex. « 18/11 10:05 · Rapport déposé par Jiresse » → « 18/11 14:32 · Envoyé par Aïcha via WhatsApp » → « 18/11 19:10 · Lu par l'étudiant » → « 19/11 09:12 · Relance 1 envoyée par Aïcha ».

### 5.3 Numéros
Normaliser au format international sans `+`, espaces ni `00` initial ; ajouter l'indicatif s'il manque selon le pays (Cameroun 237, Gabon 241, Tchad 235, Côte d'Ivoire 225, Sénégal 221, Mali 223, Guinée 224). Numéro absent ou invalide : boutons WhatsApp désactivés + mention « numéro manquant » (« Partager le PDF » reste possible).

---

## 6. Lien privé du rapport (même chose que PACK-13 §4.4)
- `/rapport/{token}` : sans compte, `noindex`, actif 30 jours, page légère pour téléphone : aperçu du PDF + « Télécharger » + « Répondre OUI sur WhatsApp » (`wa.me/8613179468571` avec « OUI, je souhaite ouvrir mon dossier ({ref_demande}) »).
- **Première ouverture → statut `lu` automatiquement** (c'est la seule confirmation automatique possible sans API WhatsApp).
- Le fichier PDF n'est jamais public : il est servi uniquement via ce token.

---

## 7. Relances

### 7.1 Ce qui est automatique, ce qui ne l'est pas
- **Automatique** : le calendrier, le choix du message, la liste du jour, l'alerte quotidienne, l'arrêt quand l'étudiant répond OUI ou paie.
- **Manuel (1 clic)** : l'envoi lui-même. Sans API WhatsApp Business, la plateforme ne peut pas envoyer seule ; le membre ouvre la liste « À relancer aujourd'hui » et enchaîne les envois. L'API viendra quand Odysseo sera une entreprise enregistrée (modèles de messages validés par Meta) ; ce pack est construit pour la brancher sans tout refaire (`Relance.message` déjà prêt).

### 7.2 Calendrier `[À VALIDER — fondateur]`
3 relances au maximum, calées sur la validité de l'offre (7 jours) :

| Relance | Quand | But |
|---|---|---|
| R1 | J+1 (24 h après l'envoi) | Vérifier qu'il a vu le rapport, ouvrir la discussion |
| R2 | J+3 | Répondre aux freins (paiement, bourse, parents) |
| R3 | J+6 (veille de l'expiration) | Dernier rappel, puis on laisse la porte ouverte |

- Pas de relance tous les jours sans fin : au-delà de 3 messages sans réponse, l'étudiant se sent harcelé et **le numéro WhatsApp Odysseo risque d'être signalé et bloqué**.
- Les jours sont paramétrables dans un fichier `relances.json` (ex. `[1, 3, 6]`), sans toucher au code.
- Heure : la relance apparaît dans la liste à partir de 8 h (heure de l'étudiant, Afrique de l'Ouest et du Centre, UTC+0/+1). Pas d'envoi le dimanche : décaler au lundi.
- **Arrêt automatique** dès : `oui_recu`, `premier_versement_recu`, ou « Arrêter les relances ». Si l'étudiant répond autre chose (question, « je réfléchis »), le membre peut « Reporter de 2 jours ».
- Rattrapage : pour les candidatures marquées envoyées en groupe (§5.1), les relances dont la date est déjà passée sont regroupées en **une seule relance « R1 » à faire aujourd'hui**, puis le calendrier continue.

### 7.3 Liste « À relancer aujourd'hui »
- Une ligne par étudiant : prénom, cas, relance n°, « Lu ✓ / Non lu », jours restants avant expiration de l'offre.
- **« Relancer »** → ouvre `wa.me` avec le message prêt → confirmation au retour (« Relance envoyée ? ») → `Relance.statut = envoyee` + journal.
- « Copier », « Reporter de 2 jours », « Arrêter les relances ».
- Bouton **« Suivant »** pour enchaîner sur téléphone. Objectif : relancer 20 étudiants en moins de 5 minutes.
- **Alerte quotidienne** (Telegram + e-mail, canaux PACK-11) à 8 h heure de Douala : « 📲 7 relances à faire aujourd'hui · 3 rapports à envoyer » + lien direct vers le filtre.

### 7.4 Messages de relance (`messages_relance.json`)
Ton identique aux rapports d'admissibilité : chaleureux, phrases courtes, vouvoiement, compréhensible par un parent, aucune fausse urgence, jamais « financement », jamais de test d'anglais à passer. Variables : `{prenom}`, `{lien_rapport}`, `{nb_offres}`, `{rentree}`, `{premier_versement}`, `{date_validite}`. Si le formulaire a été rempli par un parent : remplacer « vous » par « votre enfant » là où c'est indiqué (variante `_parent`). Le membre peut modifier le texte avant l'envoi.

**R1 — non lu**
```
Bonjour {prenom} 👋
Avez-vous pu ouvrir votre rapport d'admissibilité Odysseo ?
📄 {lien_rapport}
Il contient vos {nb_offres} offres d'admission avec bourse et tout le détail pour démarrer.
Une question ? Répondez ici, on vous répond rapidement 🙂
L'équipe Odysseo
```

**R1 — lu**
```
Bonjour {prenom} 👋
Vous avez pu consulter votre rapport Odysseo, merci !
Avez-vous des questions sur les offres, la bourse ou les étapes ? Nous sommes là pour vous répondre, à vous ou à vos parents.
Pour démarrer, il suffit de votre passeport et du 1er versement de {premier_versement} FCFA. Le reste, on s'en occupe.
L'équipe Odysseo
```

**R2 — standard / bachelor / master / langue**
```
Bonjour {prenom} 👋
Petit rappel : votre offre Odysseo est valable jusqu'au {date_validite}.
📄 {lien_rapport}
Le test d'anglais et les lettres de recommandation, c'est nous qui nous en occupons. Vous n'avez qu'à préparer votre passeport.
Souhaitez-vous qu'on en parle par appel, avec vous ou vos parents ? Répondez « OUI » pour ouvrir votre dossier 📲
L'équipe Odysseo
```

**R2 — moyenne_faible**
```
Bonjour {prenom} 👋
Votre dossier reste solide pour une admission en Chine, avec une bourse partielle accordée par l'université et des bourses au mérite possibles pendant les études.
C'est maintenant que nous sécurisons les places grâce à nos quotas. Votre offre est valable jusqu'au {date_validite}.
📄 {lien_rapport}
Répondez « OUI » pour ouvrir votre dossier 📲
L'équipe Odysseo
```

**R2 — mbbs / parcours_complet**
```
Bonjour {prenom} 👋
Votre projet d'études en Chine est toujours réalisable : 6 mois de chinois en Chine dès mars, puis votre entrée en filière en septembre, avec un seul accompagnement Odysseo du début à la fin.
Le rapport explique clairement le budget et l'option supplémentaire pour maximiser vos chances de bourse.
📄 {lien_rapport}
Les places de mars sont limitées. On en parle aujourd'hui ? Répondez « OUI » 📲
L'équipe Odysseo
```

**R3 — tous les cas**
```
Bonjour {prenom} 👋
Dernier rappel : votre offre Odysseo expire demain ({date_validite}).
📄 {lien_rapport}
Si c'est le bon moment, répondez « OUI » et nous ouvrons votre dossier aujourd'hui.
Si ce n'est pas le bon moment, dites-le-nous simplement : nous garderons votre profil pour la prochaine rentrée 🙂
L'équipe Odysseo
```

- Si l'offre a déjà une vraie date limite d'université plus proche que `{date_validite}`, R2 et R3 citent cette date limite (même règle que les rapports : urgence uniquement avec de vraies dates).

### 7.5 Mesure (simple)
Petit tableau hebdomadaire : rapports envoyés → lus → OUI, et à quelle étape le OUI arrive (sans relance, après R1, R2, R3). Permet de garder le calendrier et les messages qui convertissent.

---

## 8. Droits
- Tous les membres de l'équipe connectés voient les rapports, les messages, les relances et l'historique, et peuvent déposer, envoyer et relancer.
- Seul l'auteur du dépôt ou le fondateur peut supprimer une version (suppression = archivage, jamais effacement définitif).

---

## 9. Compatibilité avec le PACK-13 (analyse IA automatique)
- Quand le PACK-13 sera actif, l'analyse IA crée automatiquement un `RapportAdmissibilite` avec `source = ia`, le PDF généré, le message choisi (PACK-13 §5.4) et le `cas`. La candidature arrive directement en « Rapport prêt ».
- Les boutons d'envoi, la confirmation, les badges, les relances et l'historique de ce pack **remplacent** ceux décrits au PACK-13 §5.3 et les relances PACK-11 : un seul circuit pour les deux modes.
- Le dépôt manuel reste toujours possible (secours, ou rapport refait à la main par le fondateur). Quand un membre remplace un rapport `ia` par un rapport `manuel`, l'enregistrer comme correction (PACK-13 §3.2).

---

## 10. Critères de validation
- [ ] Les candidatures déjà traitées peuvent être passées en « Envoyé » en une seule action groupée.
- [ ] Je dépose un PDF + un message sur une candidature : le badge passe à « Rapport prêt » dans la liste.
- [ ] Un autre membre, connecté depuis un autre téléphone, voit le PDF et le message et peut envoyer.
- [ ] « Envoyer via WhatsApp » ouvre la bonne conversation avec le message complet et le lien du rapport.
- [ ] Au retour sur la plateforme, la question « Le rapport est bien parti ? » apparaît ; « Oui » affiche « Envoyé · date · prénom » dans la liste.
- [ ] « Partager le PDF » joint le fichier sur Android et iPhone.
- [ ] Ouvrir le lien `/rapport/{token}` passe la candidature en « Lu ».
- [ ] La fiche montre le PDF envoyé, le message exact, les relances et l'historique complet.
- [ ] Le lendemain de l'envoi, l'étudiant apparaît dans « À relancer aujourd'hui » avec le bon message (lu / non lu, selon le cas).
- [ ] « OUI reçu » ou « Arrêter les relances » fait disparaître l'étudiant des relances.
- [ ] L'alerte de 8 h arrive avec le bon nombre de relances.
- [ ] Le PDF n'est pas accessible sans le token.
