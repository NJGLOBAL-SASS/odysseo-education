# PACK-11 · Inscription partenaire, validation et contrat signé en ligne
_Consigne pour Claude Code. Préparé le 08/11/2026. Projet : plateforme Next.js (App Router, routes `/[locale]/...` FR/EN) déployée sur Vercel._

## Objectif
Aujourd'hui, un partenaire s'inscrit et reçoit un lien de parrainage. Après ce pack :
1. il remplit une **demande de partenariat** complète ;
2. l'équipe Odysseo **confirme** la demande dans le dashboard interne ;
3. la plateforme **génère son contrat** avec ses informations et lui **envoie** un lien de signature ;
4. il **signe en ligne** (case + nom complet + code à usage unique) ;
5. il reçoit le **PDF signé** (signature du fondateur + cachet Odysseo), et **seulement alors** son lien de parrainage et son tableau de bord s'activent.

## Avant de coder : explorer l'existant
- Trouver le programme partenaires actuel : pages d'inscription partenaire, `/api/referral/...`, modèle de données des partenaires, dashboard partenaire, dashboard interne (admin), mode d'authentification admin.
- Identifier la base de données et le stockage de fichiers déjà utilisés (Supabase, Prisma, Vercel Blob, etc.) et l'outil d'envoi d'e-mails s'il existe. **Réutiliser l'existant**, ne pas ajouter une deuxième base.
- Si un partenaire existe déjà avec un code, **garder son code**. Les partenaires déjà actifs passent au statut `contrat_a_signer` (voir « Migration »).
- Écrire en tête de `CHANGELOG.md` un court résumé de ce qui existait et de ce qui change.

## Fichiers fournis dans ce pack
| Fichier | Rôle | Où le placer |
|---|---|---|
| `contrat/contrat_partenaire_v1.fr.md` | Texte du contrat avec champs `{{...}}` | `content/contrats/` (ou équivalent) |
| `config/contrat_partenaire.config.json` | Version, paliers, taux, délais, OTP, signataire | `config/` — lu côté serveur uniquement |
| `assets/cachet_odysseo.png` / `.svg` | Cachet Odysseo (rouge, fond transparent) | `public/contrat/` |
| `public/contrat/signature_fondateur.png` | **À fournir par le fondateur** (scan, fond transparent, PNG ≥ 600 px de large) | `public/contrat/` |

Tant que `signature_fondateur.png` est absent, la génération du PDF doit **échouer proprement** avec un message clair dans le dashboard admin (« Signature du fondateur manquante »), et aucun contrat ne doit partir.

## 1. Formulaire « Devenir partenaire » (`/[locale]/partenaires/inscription`)
Champs (tous obligatoires sauf mention) :
| Champ | Type | Règle |
|---|---|---|
| Prénom, Nom | texte | 2 à 60 caractères chacun |
| Pays | liste (`config.pays`) | |
| Ville | texte | |
| WhatsApp | téléphone international | format E.164, indicatif pays proposé selon le pays choisi |
| E-mail | e-mail | |
| Type de pièce d'identité | liste (`config.pieces_identite`) | |
| Numéro de la pièce | texte | 5 à 30 caractères |
| Profil | liste | Enseignant · Conseiller d'orientation · Ancien étudiant en Chine · Créateur de contenu · Association / école · Autre |
| Réseaux (facultatif) | URL ou @ | TikTok, Facebook, Instagram… |
| Nombre d'étudiants estimé par an (facultatif) | liste | 1-3 · 4-9 · 10+ |
| Moyen de paiement | liste (`config.operateurs_paiement`) | |
| Numéro ou compte de paiement | texte | par défaut = numéro WhatsApp, modifiable |
| Case 1 | case à cocher | « J'accepte que mes informations soient utilisées pour préparer mon contrat de partenariat. » |

Après envoi : écran de confirmation « Demande reçue. Notre équipe la vérifie sous 48 h et vous envoie votre contrat sur WhatsApp et par e-mail. » Statut créé : `demande_recue`.
Anti-abus : limite de 3 demandes par numéro WhatsApp et par IP sur 24 h ; doublon (même WhatsApp ou même e-mail) → message « Une demande existe déjà pour ce numéro ».

## 2. Statuts d'un partenaire
`demande_recue` → `contrat_envoye` → `actif`
Branches : `refusee` (depuis `demande_recue`), `lien_expire` (contrat non signé après `lien_contrat_validite_jours`), `suspendu`, `resilie`.
Chaque changement de statut est enregistré avec la date et l'auteur (admin ou système).

## 3. Dashboard interne : liste « Demandes partenaires »
- Tableau : date, nom, pays, profil, WhatsApp, estimation, statut. Filtre par statut.
- Fiche d'une demande : toutes les informations, plus trois boutons :
  - **Confirmer et envoyer le contrat** : génère le code partenaire (format existant, sinon 6 caractères majuscules sans 0/O/1/I), crée le contrat, passe le statut à `contrat_envoye`, envoie le lien (section 4).
  - **Refuser** : motif facultatif, statut `refusee`, message poli envoyé.
  - **Modifier** : corriger une faute dans les informations **avant** confirmation uniquement.
- Après envoi : bouton **Renvoyer le lien** (nouveau jeton, l'ancien est invalidé) et bouton **Ouvrir WhatsApp** (voir 4).
- Fiche d'un partenaire actif : bouton **Télécharger le contrat signé** et l'historique des acceptations.

## 4. Envoi du lien de signature
- Jeton aléatoire de 32 octets, stocké **haché** (SHA-256), valable `lien_contrat_validite_jours` jours, à usage unique pour la signature. URL : `/[locale]/partenaires/contrat/[jeton]`.
- **E-mail** (si un service d'envoi existe ; sinon en ajouter un léger, par ex. Resend, clé en variable d'environnement `EMAIL_API_KEY`) :
  objet « Votre contrat de partenariat Odysseo », bouton « Lire et signer mon contrat ».
- **WhatsApp** : sans API WhatsApp payante, le bouton admin « Ouvrir WhatsApp » ouvre `https://wa.me/<numéro>?text=<message>` prérempli :
  > Bonjour {{prénom}}, votre demande de partenariat Odysseo est acceptée 🎉 Voici votre contrat à lire et signer en ligne (2 minutes) : {{lien}}. Votre lien de parrainage sera activé dès la signature. L'équipe Odysseo
- Si la variable `WHATSAPP_API_*` existe un jour (API WhatsApp Business Cloud), le même message part automatiquement. Prévoir l'interface, ne pas l'implémenter sans clé.

## 5. Page de signature (`/[locale]/partenaires/contrat/[jeton]`)
Ordre de la page, mobile d'abord :
1. Titre « Votre contrat de partenariat », bandeau « Prime dès 50 000 FCFA · jusqu'à 20 % ».
2. Le contrat **rempli**, rendu en HTML lisible (12 pt min., Inter, noir #0B0B0D, intertitres rouges #FF0000), avec un bouton « Télécharger l'aperçu PDF ».
3. Case « J'ai lu le contrat et j'en accepte toutes les conditions. » (active seulement après défilement jusqu'à la fin du contrat).
4. Champ « Votre nom complet » : doit correspondre (sans tenir compte des majuscules ni des accents) au nom de la demande.
5. Bouton « Recevoir mon code » → OTP de `otp.longueur` chiffres envoyé sur `otp.canal_par_defaut` (`email` par défaut ; `whatsapp` seulement si l'API est configurée). Afficher la destination masquée (`j***@gmail.com`, `+237 6** ** 45 12`).
6. Champ code + bouton « Signer mon contrat ». Code valable `validite_minutes` min., `tentatives_max` essais, `renvois_max_par_heure` renvois.
7. Écran final : « Contrat signé ✅ Votre lien est actif » + lien personnel avec bouton Copier + bouton « Télécharger mon contrat signé » + bouton « Accéder à mon tableau de bord » + rappel du kit (vidéo étudiants, visuels).

Jeton expiré ou déjà utilisé → page claire : « Ce lien n'est plus valable. Écrivez-nous sur WhatsApp +86 131 7946 8571 pour en recevoir un nouveau. »
Interface en FR et EN ; le **texte du contrat reste en français** (version EN à ajouter plus tard, en traduction indicative).

## 6. Génération du PDF signé
- Rendu côté serveur (réutiliser la librairie PDF existante ; sinon `@react-pdf/renderer` ou `pdf-lib`), format A4, 2 pages visées.
- En-tête : logo Odysseo noir (kit existant ODY-01). Pied de page sur chaque page : « Contrat n° {{contrat_numero}} · version {{contrat_version}} · empreinte {{empreinte_courte}} · page X/Y ».
- `{{tableau_commissions}}` : calculé depuis `config.prix_services` × `config.paliers[].taux` (pas de montants écrits en dur). Arrondi au millier.
- `{{bloc_signatures}}` : colonne Odysseo = nom, fonction, `signature_fondateur.png`, `cachet_odysseo.png` superposé (rotation −8°, opacité 0,85, environ 3,5 cm) ; colonne Partenaire = « Lu et approuvé · Signé électroniquement par {{nom}} le {{date}} à {{heure}} · code confirmé sur {{destination masquée}} ».
- Numéro de contrat : `ODY-P-AAAA-NNNN` (séquentiel).
- Calculer l'empreinte SHA-256 du PDF final, la stocker, afficher ses 12 premiers caractères en pied de page (empreinte du contenu hors pied de page, pour éviter la boucle).
- Stocker le PDF en **stockage privé** (jamais une URL publique devinable) ; téléchargement via une route qui vérifie le droit d'accès (admin, ou partenaire connecté à son tableau de bord, ou jeton de la page finale pendant 24 h).
- Envoyer le PDF signé par e-mail au partenaire et en copie à contact.odysseo@gmail.com.

## 7. Preuve d'acceptation (table `contrat_acceptations` ou équivalent)
Enregistrer à la signature : id partenaire, numéro et version du contrat, **instantané JSON des champs** utilisés pour remplir le contrat, nom saisi, canal et destination masquée de l'OTP, date-heure UTC, IP, user-agent, empreinte SHA-256, chemin du PDF. **Aucune ligne de cette table ne peut être modifiée ni supprimée** depuis l'interface.

## 8. Activation du lien de parrainage
- Un code partenaire dont le statut n'est pas `actif` **n'attribue aucun étudiant** : le visiteur arrive normalement sur le site, mais l'attribution n'est pas enregistrée (journaliser l'événement pour l'admin).
- `suspendu` ou `resilie` : même comportement pour les nouveaux étudiants ; les étudiants déjà attribués restent attribués.

## 9. Versions du contrat
- La version vient de `config.contrat_version`. Chaque contrat signé garde sa version.
- Si la version change, les partenaires déjà actifs restent actifs ; le dashboard admin affiche « Contrat v1.0 · nouvelle version 1.1 disponible » et un bouton « Demander la signature de la nouvelle version » (même circuit, statut inchangé).

## 10. Migration des partenaires existants
- Partenaires déjà inscrits : créer leur fiche avec les champs connus, statut `contrat_a_signer` (traité comme `contrat_envoye` mais sans couper leur lien pendant `lien_contrat_validite_jours` jours, puis attribution suspendue s'ils n'ont pas signé).
- Le dashboard admin liste les champs manquants (pièce d'identité, moyen de paiement…) ; la page de signature les demande au partenaire avant la case d'acceptation.

## 11. Sécurité et données
- Le numéro de pièce d'identité et le numéro de paiement ne sont visibles que dans le dashboard admin et dans le PDF ; jamais dans le tableau de bord public ou les journaux.
- Routes admin protégées par l'authentification admin existante.
- `config/contrat_partenaire.config.json` et le modèle de contrat ne sont jamais envoyés au navigateur tels quels (seul le contrat rempli du partenaire concerné l'est).
- Variables d'environnement à documenter dans `.env.example` : `EMAIL_API_KEY`, `EMAIL_FROM`, `CONTRAT_STORAGE_BUCKET` (ou équivalent), `WHATSAPP_API_TOKEN` (facultatif), `WHATSAPP_PHONE_ID` (facultatif).

## 12. Critères d'acceptation (à vérifier en local)
1. Une demande complète crée un partenaire `demande_recue` ; une demande avec le même WhatsApp est refusée.
2. « Confirmer » génère un code, un contrat n° `ODY-P-2026-0001`, passe à `contrat_envoye`, envoie l'e-mail et prépare le message WhatsApp.
3. Sans `signature_fondateur.png`, « Confirmer » affiche l'erreur et ne change pas le statut.
4. La page de signature affiche le contrat rempli avec les bonnes informations et le bon tableau (Master palier Argent = 510 000 FCFA).
5. La case ne s'active qu'en bas du contrat ; un nom différent bloque ; un mauvais code 5 fois bloque.
6. Après signature : statut `actif`, PDF de 2 pages avec signature + cachet + pied de page, e-mail reçu, ligne d'acceptation créée, lien de parrainage fonctionnel.
7. Avant signature, une visite avec `?ref=CODE` n'attribue pas l'étudiant.
8. Un lien déjà utilisé ou expiré affiche la page « lien n'est plus valable ».
9. Tous les textes d'interface existent en FR et EN.
10. Version incrémentée dans `package.json` (mineure) et entrée datée « PACK-11 » dans `CHANGELOG.md`.

## Règles communes (rappel)
- Ne jamais afficher le nom réel d'une université, d'un partenaire universitaire, un classement ou un score interne.
- Ne rien casser : formulaire `/[locale]/postuler`, API `/api/candidatures`, programme partenaires existant, bandeau cookies, FR/EN.
