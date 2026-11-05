# PACK-07 · Page « Parents » et paiement expliqué simplement
_Consigne pour Claude Code. Projet : plateforme Next.js (App Router, FR/EN)._

## Contexte
- Dans beaucoup de familles, ce sont les parents qui financent et décident (le formulaire demande d'ailleurs « Qui gère et finance votre projet ? »). Pourtant, le site ne s'adresse qu'à l'étudiant.
- Le concurrent DigiEduPro a une page « Payment process » qui liste 7 moyens de paiement et dit clairement que **les frais de service se paient après l'admission**. C'est un argument fort pour réduire la peur de l'arnaque. En revanche, sa page est technique (PayPal, Western Union, MoneyGram) et ne parle pas aux familles africaines.
- Odysseo affiche déjà ses tarifs, une « caution de l'étape 2 » remboursable et un engagement de transparence, mais ces éléments sont dispersés.

## Objectif
Une page `/[locale]/parents`, courte et rassurante, qui répond en 1 minute aux 4 questions d'un parent :
1. Est-ce sérieux ?
2. Combien cela coûte au total, et quand faut-il payer ?
3. Que se passe-t-il si ça ne marche pas ?
4. Comment suivre le dossier ?

## Tâches
1. **Explorer d'abord** : les pages cursus (tarifs, étapes de paiement, « caution de l'étape 2 », engagement), les données de tarifs (fichier ou constantes) et les composants. **Réutiliser les données de tarifs et d'étapes de paiement déjà présentes sur le site**, sans recopier de montants en dur, pour ne jamais créer de contradiction.
2. **Page `/[locale]/parents`**, dans cet ordre :
   - **Titre** : « Parents : tout ce que vous devez savoir avant de vous engager ».
   - **Bloc 1 · « Vous payez l'essentiel après l'admission »** : frise horizontale (verticale sur mobile) des étapes de paiement du cursus choisi, avec un sélecteur Langue / Bachelor / Master / Doctorat. Pour chaque étape : montant, moment du paiement et mention « remboursable » si c'est le cas. Calculer et afficher automatiquement « X % du total est payé après la réception de l'admission », à partir des données existantes.
     - Si le site ne contient pas encore les montants par étape : afficher seulement les étapes sans montants, et laisser un `TODO` visible dans le code et dans le README (ne jamais inventer de montant).
   - **Bloc 2 · « Si aucune admission avec bourse »** : reprendre mot pour mot le texte d'engagement existant (caution de l'étape 2 remboursée).
   - **Bloc 3 · « Comment payer »** : liste lue depuis `content/paiement.json` (modèle fourni : `paiement_modele.json`). Logos ou icônes simples : Orange Money, MTN Mobile Money, virement, etc. Si le fichier est vide, afficher « Les moyens de paiement vous sont indiqués par votre conseiller ».
   - **Bloc 4 · « Vérifiez par vous-même »** : 3 puces. (1) Le nom de l'université est communiqué à l'ouverture du dossier. (2) L'Admission Notice et le JW202 sont des documents officiels vérifiables. (3) Vous recevez un reçu pour chaque paiement. Afficher les preuves du PACK-06 si elles existent.
   - **Bloc 5 · « Suivre le dossier de votre enfant »** : lien vers `/suivi` (PACK-08) s'il existe ; sinon, bouton WhatsApp.
   - **Bloc 6** : les questions de la catégorie `parents` de la FAQ (PACK-09) s'il est appliqué, sinon rien.
   - **Bas de page** : bouton « Parler à un conseiller sur WhatsApp », avec le message pré-rempli « Bonjour, je suis parent d'un futur étudiant et j'ai une question. »
3. **Navigation** : ajouter « Parents » dans le menu principal (entre « Nos services » et « Devenir partenaire ») et dans le pied de page.
4. **Formulaire** : si l'étudiant répond « Un parent » à « Qui gère et finance votre projet ? », afficher à l'étape 1, sous la question : « Vous pouvez partager la page Parents avec lui » + bouton « Envoyer le lien sur WhatsApp » (`https://wa.me/?text=` + lien vers `/parents`).
5. **Pages cursus** : sous le prix, ajouter la ligne « Payez l'essentiel après l'admission → voir le détail », qui pointe vers `/parents#paiement` avec le bon cursus présélectionné.

## Critères d'acceptation
- [ ] `/fr/parents` se lit en moins d'une minute sur mobile (5-6 blocs courts, texte ≥ 12 px, aucune image lourde).
- [ ] Les montants et pourcentages affichés viennent des données de tarifs du site : modifier un montant à un seul endroit le met à jour sur la page cursus **et** sur la page Parents.
- [ ] Le pourcentage « payé après l'admission » est juste pour chaque cursus (test unitaire).
- [ ] Le lien « Envoyer le lien sur WhatsApp » apparaît seulement quand « Un parent » est choisi.
- [ ] FR et EN disponibles ; `npm run build` passe.

## Ne pas faire
- Ne pas promettre d'admission, ni de bourse, ni de visa.
- Ne pas afficher de moyen de paiement non confirmé par le fondateur.

## Fin du pack
- Incrémenter la version mineure dans `package.json`. Ajouter l'entrée `PACK-07 Page Parents et paiement` dans `CHANGELOG.md`.
- Commit : `feat(parents): page Parents, frise de paiement, moyens de paiement (PACK-07)`.

## À fournir par le fondateur
- [ ] Moyens de paiement réellement acceptés (et, pour chacun, à quel nom ou numéro ils se font : à donner en privé, **pas sur le site**).
- [ ] Validation de l'échéancier par cursus, s'il n'est pas déjà sur le site.
