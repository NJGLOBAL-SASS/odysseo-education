# PACK-11 · Modèles de messages
_Les éléments entre `{{ }}` sont remplis par la plateforme. Jamais de nom réel d'université ni de nom de partenaire dans un message destiné à l'étudiant._

## 1. Alerte nouveau profil (équipe : Telegram + e-mail)
Objet de l'e-mail : `🔔 Nouveau profil {{code_dossier}} · {{niveau}} · {{pays}}`
```
🔔 Nouveau profil {{code_dossier}}
{{prenom}} · {{age}} ans · {{pays}}
Niveau visé : {{niveau}} · Domaines : {{domaines}}
Diplôme : {{diplome}} · Moyenne : {{moyenne}} · HSK : {{hsk}} · Anglais : {{anglais}}
Budget : {{funding}}

Brouillon prêt : {{ref1}} ({{role1}}) · {{ref2}} ({{role2}}) · {{ref3}} ({{role3}}){{#ref4}} · {{ref4}} (alternative){{/ref4}}
{{#repli_langue}}⚠️ Aucune licence possible (âge/HSK) : repli sur la langue, à vérifier{{/repli_langue}}

👉 Relire et valider : {{lien_admin_dossier}}
```

## 2. Relances équipe
- Rapport non validé : `⏰ {{code_dossier}} ({{prenom}}) attend son rapport depuis {{heures}} h. 👉 {{lien_admin_dossier}}`
- Pas de réponse de l'étudiant (48 h, puis 5 jours) : `📞 {{code_dossier}} ({{prenom}}) n'a pas répondu au rapport envoyé il y a {{jours}} j. Message de relance prêt : {{lien_admin_dossier}}`
- Rapport expiré : `⌛ Rapport {{code_dossier}} expiré. Renouveler ou classer « perdu » ? 👉 {{lien_admin_dossier}}`

## 3. Message WhatsApp d'envoi du rapport (copié/ouvert par le conseiller, PDF joint à la main)
```
Bonjour {{prenom}} 👋 C'est Odysseo Education.
Bonne nouvelle : votre profil est éligible à une admission avec bourse ✅

Votre rapport d'admissibilité ({{code_dossier}}) est en pièce jointe. Nous avons sélectionné pour vous :
{{#offres}}▪️ {{ref}} · {{lieu}} · {{resume}}
{{/offres}}
Pour lancer votre dossier : ouverture de {{montant_versement_1}} FCFA. Vous ne réglez la totalité qu'une fois votre visa obtenu.
(MBBS : remplacer ces 2 lignes par « Votre devis personnalisé suit dans un prochain message. »)

⏳ Première date limite : {{premiere_date_limite}}. Rapport valable jusqu'au {{date_expiration}}.

Quelle offre vous intéresse ? Répondez simplement avec sa référence (ex. {{ref1}}). Nous pouvons aussi vous appeler 10 minutes, vous ou vos parents.
```
`{{resume}}` = premier élément de `arguments`, sinon `bourse_texte` raccourci à 70 caractères.

## 4. Relance étudiant (48 h)
```
Bonjour {{prenom}}, avez-vous pu lire votre rapport d'admissibilité ({{code_dossier}}) ? 😊
L'offre {{ref1}} ferme le {{date_limite_ref1}}. Avez-vous une question, ou souhaitez-vous qu'on appelle vos parents pour leur expliquer ?
```

## 5. Relance étudiant (5 jours)
```
Bonjour {{prenom}}, votre rapport ({{code_dossier}}) expire le {{date_expiration}}. Après cette date, certaines places et dates limites peuvent ne plus être disponibles.
Répondez « OUI + la référence » pour que nous lancions votre dossier dès aujourd'hui.
```

## 6. Ouverture de l'espace (après le 1er versement)
```
Merci {{prenom}} ! Votre versement de {{montant}} FCFA est bien reçu ✅
Votre dossier {{code_dossier}} est ouvert. Suivez chaque étape et déposez vos documents ici : {{lien_espace}}
(Pour la première connexion, on vous demandera les 4 derniers chiffres de votre numéro WhatsApp.)
L'équipe Odysseo
```
