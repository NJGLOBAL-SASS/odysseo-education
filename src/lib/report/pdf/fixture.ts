/**
 * Rapport fictif (aucune donnée réelle) : contrôle visuel du PDF face aux rapports de
 * référence, et base des tests. Cas « Licence, rentrée de septembre pas encore ouverte ».
 */
import { availabilityNote, type ReportContent } from "./render";

const emittedAt = new Date("2026-11-19T10:00:00Z");

export const FIXTURE_REPORT: ReportContent = {
  code: "ODY-TEST01",
  emittedAt,
  validUntil: new Date("2026-11-26T10:00:00Z"),
  fullName: "Paul Exemple",
  verdict: {
    title: "Admissible en Licence d'informatique avec bourse, rentrée de septembre 2027.",
    nuance: "Les universités n'ont pas encore toutes ouvert leurs candidatures pour septembre, mais c'est maintenant que nous attribuons les places de nos quotas.",
  },
  profile: [
    ["Projet", "Licence · informatique"],
    ["Diplôme", "Bac C (2026), 14,5/20"],
    ["Langues", "Anglais : moyen · chinois : débutant"],
    ["Âge à la rentrée", "19 ans · Douala, Cameroun"],
    ["Budget", "Avec une bourse"],
    ["Passeport", "Pas encore"],
  ],
  atouts: "un bac scientifique, une bonne moyenne et votre jeune âge. L'informatique est l'un des domaines où les universités chinoises offrent le plus de bourses.",
  sections: [
    {
      kind: "bullets",
      title: "Septembre 2027 : pourquoi agir maintenant",
      bullets: [
        "**Les universités ouvrent leurs candidatures progressivement**, à partir du début de l'année 2027.",
        "**Nous disposons de quotas de places** dans nos universités partenaires, attribuées dans l'ordre d'ouverture des dossiers.",
        "**Votre bourse, en toute transparence :** en Licence, une bourse totale demande en général environ 16/20. Avec 14,5/20, votre dossier ouvre des **bourses partielles** qui réduisent fortement la scolarité.",
      ],
      box: { title: "Notre garantie", text: "Grâce à nos quotas, nous vous garantissons une **admission**. Si aucune admission avec bourse n'est obtenue après nos 3 candidatures, **votre caution vous est remboursée**." },
    },
    {
      kind: "offers",
      title: "Ce que proposent déjà nos universités",
      intro: "Voici les offres déjà ouvertes (rentrée de mars 2027). Les offres de septembre 2027 seront publiées au fil de l'ouverture des universités.",
      deadlineLabel: "Date limite (mars)",
      offers: [
        { ref: "B-01", title: "Université *** · Pékin", details: "Informatique, génie logiciel · 6 mois de chinois puis 4 ans en anglais", afterScholarship: ["**Scolarité gratuite** (~~24 000 RMB/an~~)", "Logement : 750 RMB/mois"], deadline: "30/03/2027", chosen: true },
        { ref: "B-02", title: "Université *** · Xinyu (Jiangxi)", details: "**Informatique** · cours en anglais · 4 ans", afterScholarship: ["1re année : 11 000 RMB", "Dès la 2e année, selon vos notes : **scolarité et logement gratuits**"], deadline: "28/02/2027" },
        { ref: "B-03", title: "Université *** · Wuhan (Hubei)", details: "Science des données · 6 mois de chinois puis 4 ans en anglais", afterScholarship: ["Scolarité réduite : 10 000 à 13 000 RMB/an, logement compris"], deadline: "30/12/2026" },
      ],
      chart: {
        title: "Ce qu'il vous reste à payer par an après bourse (RMB)",
        bars: [
          { label: "Option 1 · Pékin", min: 9000, max: 9000, text: "9 000 (logement seul)" },
          { label: "Option 2 · Xinyu", min: 0, max: 11000, text: "0 à 11 000" },
          { label: "Option 3 · Wuhan", min: 10000, max: 13000, text: "10 000 à 13 000" },
        ],
      },
      why: "une université à Pékin, la scolarité entièrement gratuite et une filière qui prolonge votre bac scientifique.",
    },
    {
      kind: "dossier",
      title: "Votre dossier : nous faisons le plus gros",
      provide: ["**Passeport** : à demander dès maintenant", "Diplôme et relevés du bac", "Acte de naissance", "Photo 4×4 fond blanc"],
      weDo: ["Lettres de recommandation, grâce à notre réseau d'enseignants", "Lettre de motivation et plan d'études", "Niveau d'anglais exigé par l'université", "Traduction en anglais", "Suivi auprès des 3 universités"],
      meet: "**Rencontrons-nous :** vous êtes à Douala, venez nous rencontrer à notre bureau (quartier Mboppi). Prenez rendez-vous sur WhatsApp.",
    },
    {
      kind: "calendar",
      title: "Le calendrier",
      rows: [
        { when: "Maintenant", what: "**Demander votre passeport**, ouvrir votre dossier et **réserver votre place dans nos quotas**." },
        { when: "Début 2027", what: "Ouverture progressive des candidatures : nous déposons votre dossier dès le premier jour." },
        { when: "Ensuite", what: "Admission, réception de l'Admission Notice et du JW202, puis procédure de visa." },
        { when: "Sept. 2027", what: "Départ, accueil à l'aéroport et installation à l'université." },
      ],
    },
    {
      kind: "tarif",
      title: "Tarif Odysseo · Licence : 2 900 000 FCFA",
      rows: [
        { label: "1. Ouverture du dossier", amount: "200 000", when: "Au lancement du dossier · réserve votre place dans nos quotas" },
        { label: "2. Caution", amount: "1 000 000", when: "Avant le dépôt des candidatures · remboursée sous 30 jours si aucune admission avec bourse après nos 3 candidatures" },
        { label: "3. Avant le visa", amount: "850 000", when: "Après réception de l'Admission Notice et du JW202" },
        { label: "4. Après le visa", amount: "850 000", when: "Seulement une fois votre visa obtenu" },
      ],
      included: ["3 candidatures (frais de candidature pris en charge)", "traduction en anglais", "accompagnement visa", "accueil à l'aéroport"],
      excluded: ["billet d'avion", "frais du visa", "traductions assermentées et légalisations"],
    },
  ],
  availabilityNote: availabilityNote(emittedAt),
  launch: { firstInstallment: "**200 000 FCFA**, qui réserve votre place dans nos quotas", todo: "demander votre passeport. Pour le reste, nous vous guidons pas à pas." },
};
