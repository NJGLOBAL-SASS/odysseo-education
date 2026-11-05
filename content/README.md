# Contenus du site (sans toucher au code)

Les textes ci-dessous sont lus au moment du déploiement. Pour les modifier : éditer le fichier,
commiter, pousser sur `main` → Vercel redéploie. **Aucun code à modifier.**

| Fichier | Où ça s'affiche |
|---|---|
| `faq/faq_fr.json`, `faq/faq_en.json` | Page `/faq` (PACK-09) |
| `guides/checklist_depart_fr.json`, `…_en.json` | Page `/guides/avant-le-depart` (PACK-09) |
| `temoignages.json` | Accueil (3 au hasard) et page du cursus concerné (PACK-06) |
| `preuves.json` | Pages cursus, section « Ce que vous recevez » (PACK-06) |
| `conseillers.json` | Carte « Votre conseiller » (pied de page, accueil) et bouton WhatsApp flottant (PACK-06) |

**Règle d'or : rien de faux ne s'affiche jamais.** Une liste vide = la section n'apparaît pas.
Ne jamais inventer un témoignage, une photo ou un chiffre. Ne jamais nommer l'université.

FAQ et checklist : un texte qui contient `[À VALIDER]` (ou un nombre entre crochets comme `[7]`)
reste masqué. Retirez le marqueur une fois le texte validé.

---

## Ajouter un témoignage

1. **Faire signer l'accord** (`_ameliorations/PACK-06/accord_temoignage.md`, ou « J'accepte » écrit
   sur WhatsApp). Garder la preuve.
2. **Photo** : carrée, visage centré, **600 × 600 px max et 150 Ko max** (compresser par ex. sur
   squoosh.app, format JPG ou WebP). La déposer dans `public/images/temoignages/`, nommée par
   l'identifiant : `t-001.jpg`.
3. **Ajouter une entrée** dans la liste `"temoignages"` de `temoignages.json` :

```json
{
  "id": "t-001",
  "prenom": "Aïcha",
  "initiale_nom": "K.",
  "pays": "Cameroun",
  "drapeau": "🇨🇲",
  "cursus": "master",
  "ville_chine": "Nanjing",
  "annee_depart": 2027,
  "citation_fr": "Ses mots à elle, 300 caractères maximum.",
  "citation_en": "Optional English version.",
  "photo": "/images/temoignages/t-001.jpg",
  "video_url": null,
  "accord_signe_le": "2026-11-20",
  "publie": true
}
```

- `cursus` : `langue-chinoise`, `bachelor`, `master` ou `doctorat`.
- `ville_chine` : la ville seulement, **jamais le nom de l'université**.
- `video_url` : lien YouTube ou TikTok (ou `null`). Il s'ouvre dans un nouvel onglet.
- `accord_signe_le` : date réelle de l'accord (AAAA-MM-JJ). Sans date valide, rien ne s'affiche.
- `publie` : `true` pour afficher, `false` pour masquer sans supprimer. Si l'étudiant retire son
  accord : `false`, puis supprimer l'entrée et la photo (sous 7 jours).

4. **Vérifier** : `npm test` (contrôle que la photo existe et pèse moins de 150 Ko), puis déployer.

## Ajouter un document d'exemple (« Ce que vous recevez »)

1. Photo d'une Admission Notice, d'un JW202 ou d'un visa X1 réellement reçu, avec l'accord de
   l'étudiant. **Flouter le nom, la photo, les dates de naissance et tous les numéros** avant tout
   envoi (passeport, dossier, code-barres, QR code). L'université peut être floutée elle aussi.
2. Format portrait, **150 Ko max**, dans `public/images/preuves/` (ex. `admission-floutee.jpg`).
3. Entrée dans `preuves.json` (3 documents affichés au maximum) :

```json
{
  "id": "p-001",
  "type": "admission_notice",
  "image": "/images/preuves/admission-floutee.jpg",
  "legende_fr": "Admission Notice – informations personnelles masquées",
  "legende_en": "Admission Notice – personal details hidden",
  "accord_signe_le": "2026-11-20",
  "publie": true
}
```

`type` : `admission_notice`, `jw202` ou `visa_x1`.

## Ajouter un conseiller

Photo carrée (150 Ko max) dans `public/images/conseillers/`, puis dans `conseillers.json` :

```json
{
  "prenom": "Prénom",
  "role_fr": "Conseiller admissions",
  "role_en": "Admissions advisor",
  "photo": "/images/conseillers/prenom.jpg",
  "langues": ["Français", "Anglais"],
  "whatsapp": "2376XXXXXXXX"
}
```

Le **premier** conseiller de la liste est affiché ; son numéro (format international, sans « + »
ni espaces) est utilisé par le bouton WhatsApp flottant. Liste vide : le bouton utilise
`NEXT_PUBLIC_WHATSAPP_NUMBER`.
