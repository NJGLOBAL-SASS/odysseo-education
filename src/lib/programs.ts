/**
 * Cursus proposés (Langue chinoise, Bachelor, Master, Doctorat) — source unique
 * des pages /cursus et des brochures PDF (FR et EN, mêmes données que les grilles
 * tarifaires officielles 2027). Modifier un tarif ici met à jour les deux.
 *
 * Les textes communs à tous les cursus (arrivée, billet, visa...) sont dans
 * src/i18n/messages/*.json, clé "programs".
 */

export type Locale = "fr" | "en";
type L<T> = Record<Locale, T>;

export type ProgramSlug = "langue-chinoise" | "bachelor" | "master" | "doctorat";

export type PaymentStep = { label: L<string>; when: L<string>; amount: number; refundable?: boolean };
export type Step = { title: L<string>; text: L<string> };

export type Program = {
  slug: ProgramSlug;
  /** Cycle : la langue n'a ni grille de bourses ni option de test d'anglais. */
  kind: "language" | "degree";
  name: L<string>;
  /** Libellé court de l'en-tête de brochure (« Grille tarifaire Bachelor »). */
  short: L<string>;
  tagline: L<string>;
  cardText: L<string>;
  image: string;
  pdf: L<string>;
  provide: L<string[]>;
  provideNote?: L<string>;
  handle: L<string[]>;
  /** Éléments mis en gras dans « Nous prenons en charge » (pick-up, chambre). */
  handleHighlightFrom: number;
  goal: L<string>;
  /** Bourse visée pour un profil « Excellent » (diffère en Bachelor). */
  excellentTarget?: L<string>;
  timeline?: { kind: "languageSession" | "interviews"; text: L<string> };
  example?: "bachelorScholarship";
  journey?: { intro: L<string>; steps: Step[] };
  languageOffers?: true;
  price: number;
  priceText: L<string>;
  englishTestOption: boolean;
  payments: PaymentStep[];
  paymentNote?: L<string>;
  refund: "degree" | "language";
  languageSessionNotIncluded: boolean;
  ctaAnswer: L<string>;
};

const PICKUP = { fr: "Pick-up à l'aéroport", en: "Airport pick-up" };
const ROOM = { fr: "Équipement de base de votre chambre", en: "Basic equipment for your room" };
const OPENING = { fr: "Ouverture du dossier", en: "File opening" };
const LAUNCH = { fr: "Lancement des candidatures", en: "Applications launch" };
const AT_SIGNATURE = { fr: "à la signature · non remboursable", en: "on signature · non-refundable" };
const VALIDATED = { fr: "dossier validé · remboursable", en: "file approved · refundable" };
const AT_ADMISSION = { fr: "à l'Admission Notice + JW202", en: "on Admission Notice + JW202" };

const DEGREE_JOURNEY_INTRO = {
  fr: "Pour un bon dossier, la bourse totale est plus accessible en Master et en PhD qu'en Bachelor. Votre projet de recherche et l'accord d'un directeur de recherche pèsent beaucoup.",
  en: "For a strong application, a full scholarship is easier to obtain in a Master's or PhD than in a Bachelor's. Your research project and a supervisor's agreement carry a lot of weight.",
};
const DEGREE_JOURNEY_FIRST: Step[] = [
  {
    title: { fr: "Admission avec bourse", en: "Admission with a scholarship" },
    text: { fr: "Totale ou partielle, selon votre profil et votre projet", en: "Full or partial, depending on your profile and project" },
  },
  {
    title: { fr: "Allocation mensuelle", en: "Monthly stipend" },
    text: { fr: "Prévue par certaines bourses totales", en: "Included in some full scholarships" },
  },
  {
    title: { fr: "Bourses annuelles", en: "Annual scholarships" },
    text: { fr: "Les bons résultats peuvent être récompensés chaque année", en: "Good results can be rewarded every year" },
  },
];

const DEGREE_CTA = {
  fr: "nous vous répondons avec vos universités possibles et la bourse visée.",
  en: "we reply with your possible universities and the scholarship to aim for.",
};

export const PROGRAMS: Program[] = [
  {
    slug: "langue-chinoise",
    kind: "language",
    name: { fr: "Langue chinoise", en: "Chinese language" },
    short: { fr: "Langue chinoise", en: "Chinese language" },
    tagline: {
      fr: "Vous apportez votre motivation, nous construisons votre dossier.",
      en: "You bring your motivation, we build your application.",
    },
    cardText: {
      fr: "Un semestre ou une année de chinois en université, avec préparation au HSK, à frais réduits ou avec allocation.",
      en: "A semester or a year of Chinese at a university, with HSK preparation, at reduced fees or with a stipend.",
    },
    image: "/images/services/service-01-orientation-evaluation.jpg",
    pdf: {
      fr: "/brochures/Odysseo_Education_Tarifs_Langue_2027.pdf",
      en: "/brochures/Odysseo_Education_Fees_Language_2027_EN.pdf",
    },
    provide: {
      fr: ["Passeport valide au moins 6 mois", "Photo 4 × 4 fond blanc, format passeport", "Diplôme", "Relevés de notes", "Casier judiciaire"],
      en: ["Passport valid for at least 6 months", "4 × 4 photo on a white background, passport format", "Diploma", "Transcripts", "Police clearance certificate"],
    },
    provideNote: { fr: "… et nous nous occupons du reste.", en: "… and we take care of the rest." },
    handle: {
      fr: ["Analyse du profil et choix des universités", "Traduction en anglais", "Lettre de motivation et plan d'études", "3 candidatures et leurs frais", "Préparation du visa", PICKUP.fr, ROOM.fr],
      en: ["Profile analysis and choice of universities", "Translation into English", "Motivation letter and study plan", "3 applications and their fees", "Visa preparation", PICKUP.en, ROOM.en],
    },
    handleHighlightFrom: 5,
    goal: {
      fr: "<b>Notre objectif : une admission dans un programme de langue à frais réduits</b>, avec une allocation lorsque l'université en propose. L'analyse de votre profil est <b>gratuite</b>, avant tout engagement.",
      en: "<b>Our goal: admission to a language program at reduced fees</b>, with a stipend when the university offers one. Your profile analysis is <b>free</b>, before any commitment.",
    },
    languageOffers: true,
    price: 1_500_000,
    priceText: {
      fr: "Tout l'accompagnement décrit plus haut : choix des universités, dossier complet, 3 candidatures, visa, pick-up à l'aéroport et équipement de votre chambre en Chine.",
      en: "All the support described above: choice of universities, complete application file, 3 applications, visa, airport pick-up and equipment for your room in China.",
    },
    englishTestOption: false,
    payments: [
      { label: OPENING, when: AT_SIGNATURE, amount: 150_000 },
      { label: LAUNCH, when: VALIDATED, amount: 450_000, refundable: true },
      { label: { fr: "Admission", en: "Admission" }, when: AT_ADMISSION, amount: 600_000 },
      { label: { fr: "Solde", en: "Balance" }, when: { fr: "après l'obtention du visa", en: "after the visa is granted" }, amount: 300_000 },
    ],
    paymentNote: {
      fr: "Le solde se règle après l'obtention de votre visa. Il couvre notamment votre accueil à l'aéroport et l'équipement de votre chambre.",
      en: "The balance is paid once your visa is granted. It covers, among other things, your airport welcome and your room equipment.",
    },
    refund: "language",
    languageSessionNotIncluded: false,
    ctaAnswer: { fr: "nous vous répondons avec les universités possibles.", en: "we reply with the possible universities." },
  },
  {
    slug: "bachelor",
    kind: "degree",
    name: { fr: "Bachelor (Licence)", en: "Bachelor's degree" },
    short: { fr: "Bachelor", en: "Bachelor" },
    tagline: {
      fr: "Vous apportez votre parcours, nous construisons votre dossier.",
      en: "You bring your background, we build your application.",
    },
    cardText: {
      fr: "Une licence en Chine après le bac, avec bourse partielle ou totale et, selon l'université, une session de langue en mars.",
      en: "A bachelor's degree in China after high school, with a partial or full scholarship and, depending on the university, a language session in March.",
    },
    image: "/images/services/service-02-recherche-bourses.jpg",
    pdf: {
      fr: "/brochures/Odysseo_Education_Tarifs_Bachelor_2027.pdf",
      en: "/brochures/Odysseo_Education_Fees_Bachelor_2027_EN.pdf",
    },
    provide: {
      fr: ["Passeport valide au moins 6 mois", "Diplôme et relevés de notes du baccalauréat", "Casier judiciaire", "Photo fond blanc", "Certificat d'anglais (si vous en avez un)"],
      en: ["Passport valid for at least 6 months", "High-school diploma and transcripts", "Police clearance certificate", "Photo on a white background", "English certificate (if you have one)"],
    },
    handle: {
      fr: ["Analyse du profil et stratégie", "Traduction en anglais", "CV, lettres de motivation, plan d'études", "3 candidatures et leurs frais", "Préparation du visa", PICKUP.fr, ROOM.fr],
      en: ["Profile analysis and strategy", "Translation into English", "CV, motivation letters, study plan", "3 applications and their fees", "Visa preparation", PICKUP.en, ROOM.en],
    },
    handleHighlightFrom: 5,
    goal: {
      fr: "<b>Notre objectif : une admission avec bourse</b>, totale ou partielle selon votre profil. L'analyse de votre profil est <b>gratuite</b>, avant tout engagement.",
      en: "<b>Our goal: admission with a scholarship</b>, full or partial depending on your profile. Your profile analysis is <b>free</b>, before any commitment.",
    },
    excellentTarget: { fr: "Totale (moyenne au bac très élevée)", en: "Full (very high high-school average)" },
    timeline: {
      kind: "languageSession",
      text: {
        fr: "Dans certaines universités, surtout en Bachelor, la rentrée de mars commence par une session de langue chinoise. Vous apprenez le chinois de mars à septembre, puis vous commencez votre filière en septembre.",
        en: "At some universities, especially for Bachelor's degrees, the March intake starts with a Chinese language session. You learn Chinese from March to September, then start your degree in September.",
      },
    },
    example: "bachelorScholarship",
    price: 2_900_000,
    priceText: {
      fr: "Tout l'accompagnement décrit plus haut : stratégie, traduction, dossier complet, 3 candidatures, visa, briefing, pick-up à l'aéroport et équipement de votre chambre en Chine.",
      en: "All the support described above: strategy, translation, complete application file, 3 applications, visa, briefing, airport pick-up and equipment for your room in China.",
    },
    englishTestOption: true,
    payments: [
      { label: OPENING, when: AT_SIGNATURE, amount: 200_000 },
      { label: LAUNCH, when: VALIDATED, amount: 1_000_000, refundable: true },
      { label: { fr: "Solde", en: "Balance" }, when: AT_ADMISSION, amount: 1_700_000 },
    ],
    refund: "degree",
    languageSessionNotIncluded: true,
    ctaAnswer: DEGREE_CTA,
  },
  {
    slug: "master",
    kind: "degree",
    name: { fr: "Master", en: "Master's degree" },
    short: { fr: "Master", en: "Master" },
    tagline: {
      fr: "Vous apportez votre parcours, nous construisons votre dossier.",
      en: "You bring your background, we build your application.",
    },
    cardText: {
      fr: "Un master après la licence : projet de recherche, contact avec les directeurs de recherche et bourse totale plus accessible.",
      en: "A master's after your bachelor's: research project, contact with supervisors and a full scholarship that is easier to obtain.",
    },
    image: "/images/services/service-04-gestion-candidatures.jpg",
    pdf: {
      fr: "/brochures/Odysseo_Education_Tarifs_Master_2027.pdf",
      en: "/brochures/Odysseo_Education_Fees_Master_2027_EN.pdf",
    },
    provide: {
      fr: ["Passeport valide au moins 6 mois", "Diplôme et relevés de notes (Licence)", "Casier judiciaire", "Photo fond blanc", "Certificat d'anglais (si vous en avez un)", "2 enseignants pour vos recommandations"],
      en: ["Passport valid for at least 6 months", "Bachelor's diploma and transcripts", "Police clearance certificate", "Photo on a white background", "English certificate (if you have one)", "2 teachers for your recommendations"],
    },
    handle: {
      fr: ["Analyse du profil et stratégie", "Traduction en anglais", "CV, lettres de motivation, plan d'études", "Projet de recherche", "Aide aux lettres de recommandation", "Contact avec des superviseurs", "3 candidatures et leurs frais", "Préparation du visa", PICKUP.fr, ROOM.fr],
      en: ["Profile analysis and strategy", "Translation into English", "CV, motivation letters, study plan", "Research project", "Help with recommendation letters", "Contact with supervisors", "3 applications and their fees", "Visa preparation", PICKUP.en, ROOM.en],
    },
    handleHighlightFrom: 8,
    goal: {
      fr: "<b>Notre objectif : une admission avec bourse</b>, totale ou partielle selon votre profil. L'analyse de votre profil est <b>gratuite</b>, avant tout engagement.",
      en: "<b>Our goal: admission with a scholarship</b>, full or partial depending on your profile. Your profile analysis is <b>free</b>, before any commitment.",
    },
    timeline: {
      kind: "languageSession",
      text: {
        fr: "Dans certaines universités, surtout en Bachelor mais aussi en Master, la rentrée de mars commence par une session de langue chinoise. Vous apprenez le chinois de mars à septembre, puis vous commencez votre filière en septembre.",
        en: "At some universities, especially for Bachelor's but also for Master's degrees, the March intake starts with a Chinese language session. You learn Chinese from March to September, then start your degree in September.",
      },
    },
    journey: {
      intro: DEGREE_JOURNEY_INTRO,
      steps: [
        ...DEGREE_JOURNEY_FIRST,
        {
          title: { fr: "Tremplin vers le PhD", en: "Springboard to a PhD" },
          text: { fr: "Un bon Master ouvre la voie à une bourse de doctorat", en: "A good Master's paves the way to a doctoral scholarship" },
        },
      ],
    },
    price: 3_400_000,
    priceText: {
      fr: "Tout l'accompagnement décrit plus haut, y compris le projet de recherche, les recommandations, le contact avec les superviseurs, la préparation aux entretiens, le pick-up et l'équipement de votre chambre.",
      en: "All the support described above, including the research project, recommendations, contact with supervisors, interview preparation, pick-up and equipment for your room.",
    },
    englishTestOption: true,
    payments: [
      { label: OPENING, when: AT_SIGNATURE, amount: 250_000 },
      { label: LAUNCH, when: VALIDATED, amount: 1_000_000, refundable: true },
      { label: { fr: "Solde", en: "Balance" }, when: AT_ADMISSION, amount: 2_150_000 },
    ],
    refund: "degree",
    languageSessionNotIncluded: true,
    ctaAnswer: DEGREE_CTA,
  },
  {
    slug: "doctorat",
    kind: "degree",
    name: { fr: "Doctorat (PhD)", en: "Doctorate (PhD)" },
    short: { fr: "PhD", en: "PhD" },
    tagline: {
      fr: "Vous apportez votre parcours, nous construisons votre dossier.",
      en: "You bring your background, we build your application.",
    },
    cardText: {
      fr: "Un doctorat avec un directeur de recherche : projet solide, préparation aux entretiens et bourse totale accessible.",
      en: "A doctorate with a research supervisor: a solid project, interview preparation and an accessible full scholarship.",
    },
    image: "/images/services/service-05-dossier-optimisation.jpg",
    pdf: {
      fr: "/brochures/Odysseo_Education_Tarifs_PhD_2027.pdf",
      en: "/brochures/Odysseo_Education_Fees_PhD_2027_EN.pdf",
    },
    provide: {
      fr: ["Passeport valide au moins 6 mois", "Diplômes et relevés de notes (Licence et Master)", "Casier judiciaire", "Photo fond blanc", "Certificat d'anglais (si vous en avez un)", "2 enseignants pour vos recommandations", "Mémoire et travaux de recherche"],
      en: ["Passport valid for at least 6 months", "Bachelor's and Master's diplomas and transcripts", "Police clearance certificate", "Photo on a white background", "English certificate (if you have one)", "2 teachers for your recommendations", "Thesis and research work"],
    },
    handle: {
      fr: ["Analyse du profil et stratégie", "Traduction en anglais", "CV, lettres de motivation, plan d'études", "Projet de recherche", "Aide aux lettres de recommandation", "Contact avec des superviseurs", "3 candidatures et leurs frais", "Préparation du visa", PICKUP.fr, ROOM.fr],
      en: ["Profile analysis and strategy", "Translation into English", "CV, motivation letters, study plan", "Research project", "Help with recommendation letters", "Contact with supervisors", "3 applications and their fees", "Visa preparation", PICKUP.en, ROOM.en],
    },
    handleHighlightFrom: 8,
    goal: {
      fr: "<b>Notre objectif : une admission avec bourse</b>, totale ou partielle selon votre profil. L'analyse de votre profil est <b>gratuite</b>, avant tout engagement.",
      en: "<b>Our goal: admission with a scholarship</b>, full or partial depending on your profile. Your profile analysis is <b>free</b>, before any commitment.",
    },
    timeline: {
      kind: "interviews",
      text: {
        fr: "En doctorat, de nombreuses universités organisent un entretien avec le futur directeur de recherche. Ce délai s'ajoute à l'étude du dossier : c'est pourquoi il faut commencer tôt.",
        en: "For a doctorate, many universities hold an interview with the future research supervisor. This adds to the time needed to review your file: that is why you need to start early.",
      },
    },
    journey: {
      intro: DEGREE_JOURNEY_INTRO,
      steps: [
        ...DEGREE_JOURNEY_FIRST,
        {
          title: { fr: "Soutien de votre laboratoire", en: "Support from your lab" },
          text: { fr: "Certains superviseurs complètent selon vos travaux", en: "Some supervisors add funding based on your work" },
        },
      ],
    },
    price: 3_700_000,
    priceText: {
      fr: "Tout l'accompagnement décrit plus haut, y compris le projet de recherche, les recommandations, le contact avec les superviseurs, la préparation aux entretiens, le pick-up et l'équipement de votre chambre.",
      en: "All the support described above, including the research project, recommendations, contact with supervisors, interview preparation, pick-up and equipment for your room.",
    },
    englishTestOption: true,
    payments: [
      { label: OPENING, when: AT_SIGNATURE, amount: 300_000 },
      { label: LAUNCH, when: VALIDATED, amount: 1_250_000, refundable: true },
      { label: { fr: "Solde", en: "Balance" }, when: AT_ADMISSION, amount: 2_150_000 },
    ],
    refund: "degree",
    languageSessionNotIncluded: false,
    ctaAnswer: DEGREE_CTA,
  },
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug) ?? null;
}

/** 2 900 000 → "2 900 000" (espace fine insécable, comme sur les brochures). */
export function formatFcfa(amount: number) {
  return amount.toLocaleString("fr-FR").replace(/[  ]/g, " ");
}

export const ENGLISH_TEST_OPTION_PRICE = 80_000;
