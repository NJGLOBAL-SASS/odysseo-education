# Lettres d'admission : floutage et filigrane

Les originaux vont dans `content/admissions/` (ignoré par git, **jamais commité**).
Les noms des étudiants à flouter vont dans `content/admissions/noms.txt` (un mot en MAJUSCULES par ligne).

1. `swift ocr.swift content/admissions <dossier de travail>` : une image PNG par page (`a01-p1.png`…) + `ocr.json`.
2. Choisir une page par lettre (la page en anglais pour les lettres bilingues ; écarter ce qui n'est pas une admission).
3. `swift boxes.swift <dossier de travail> content/admissions/noms.txt a01-p1 a02-p1 …` : zones à flouter
   (noms, n° de passeport / dossier / étudiant, date de naissance, codes-barres, mots de passe, comptes bancaires).
4. `node render.cjs <playwright> <dossier de travail> <sortie> public/images/logo/logo-full-black-tight.png '["a01-p1",…]'` :
   pixellisation + filigrane « ODYSSEO EDUCATION » + logo, WebP 1000 px, 150 Ko max.
5. **Vérifier chaque image à l'œil** avant publication, puis copier dans `public/images/preuves/` et ajouter les entrées
   dans `content/preuves.json` (légende sans nom d'université, date de l'accord de l'étudiant).
