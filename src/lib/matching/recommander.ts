/**
 * Moteur « Vos 3 offres » (PACK-02) : port TypeScript À L'IDENTIQUE de
 * _ameliorations/PACK-02/matching_reference.py, qui fait foi.
 *
 * Ne pas modifier les exclusions, les pondérations
 * (pertinence × 10 + valeur × 3 + allocation_min / 1000), l'ordre de tri
 * (total décroissant puis référence) ni la sélection
 * ambitieuse → cible → sécurité sans mettre à jour le script Python et
 * fixtures_profils.json en même temps.
 *
 * Module pur (aucune donnée importée) : le catalogue est passé en paramètre.
 */
import type { MatchingProfile, Offer, Recommendation, Role } from "./types";

/** Codes du champ « Domaine d'études souhaité » (PACK-01) → familles de filières. */
export const DOMAINE_VERS_FAMILLES: Record<string, string[]> = {
  medecine: ["medecine-sante", "pharmacie"],
  ingenierie: [
    "genie-mecanique-electrique-energie-automatique",
    "aeronautique-genie-civil-architecture-transports",
    "materiaux-chimie-nanotechnologies",
    "petrole-geologie-mines-securite",
  ],
  informatique: ["informatique-ia-electronique-telecoms"],
  commerce: ["economie-gestion-finance-commerce"],
  "relations-droit": ["droit-administration-sciences-sociales"],
  "langue-chinoise": ["education-langues-lettres-communication"],
  sciences: [
    "biologie-biotechnologies",
    "mathematiques-physique",
    "materiaux-chimie-nanotechnologies",
    "environnement-ecologie-meteo",
  ],
  "agriculture-environnement": ["agronomie-veterinaire-agroalimentaire", "environnement-ecologie-meteo"],
  "architecture-design": ["aeronautique-genie-civil-architecture-transports"],
  "education-sport": ["education-langues-lettres-communication", "sport"],
  "ne-sait-pas": [],
  autre: [],
};

const SCORE_VAL = { or: 3, argent: 2, bronze: 1 } as const;

const STOP = new Set([
  "and", "of", "the", "et", "de", "en", "la", "le", "des", "du",
  "science", "sciences", "engineering", "technology", "studies",
]);

/** Équivalent de norm() : minuscules, sans accents, ponctuation → espaces, découpage. */
export function norm(s: string): string[] {
  const ascii = s
    .toLowerCase()
    .normalize("NFKD")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\x7f]/g, "");
  return ascii.replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(Boolean);
}

/** Tous les mots significatifs de la filière saisie commencent un mot du nom (6 premières lettres). */
export function filiereMatch(filiereLibre: string, nom: string): boolean {
  const t = norm(filiereLibre).filter((w) => !STOP.has(w) && w.length > 2);
  if (t.length === 0) return false;
  const n = new Set(norm(nom));
  return t.every((w) => [...n].some((w2) => w2.startsWith(w.slice(0, 6))));
}

/** Raisons d'exclusion d'une offre pour un profil (liste vide = offre possible). */
export function exclusions(o: Offer, p: MatchingProfile): string[] {
  const c = o.criteres;
  const why: string[] = [];
  const age = p.age;
  if (age != null) {
    if (c.age_max !== undefined && age > c.age_max) why.push("age");
    if (c.age_min !== undefined && age < c.age_min) why.push("age");
  }
  const m = p.moyenne_pct;
  if (m != null && c.moyenne_min_pct !== undefined && m < c.moyenne_min_pct) why.push("moyenne");
  if (p.nationalite != null && (c.nationalites_exclues ?? []).includes(p.nationalite)) why.push("nationalite");
  if (c.diplomes_originaux && p.diplomes_originaux === false) why.push("diplomes_originaux");
  if (c.eligibilite_omm_requise && !p.eligible_omm) why.push("omm");
  const hsk = p.hsk ?? 0;
  if (c.hsk_min !== undefined && hsk < c.hsk_min) why.push("hsk");
  const rb = p.releve_bancaire_usd_max;
  if (rb != null && c.releve_bancaire_usd !== undefined && rb < c.releve_bancaire_usd) why.push("releve_bancaire");
  const a = p.anglais ?? { type: "aucun" as const };
  const key = ({ ielts: "ielts_min", toefl: "toefl_min", duolingo: "duolingo_min" } as const)[
    a.type as "ielts" | "toefl" | "duolingo"
  ];
  if (key && c[key] !== undefined && ("score" in a ? a.score : 0) < c[key]!) why.push("anglais");
  if (
    (a.type === "aucun" || a.type === "etudes_en_anglais") &&
    c.ielts_min !== undefined &&
    (c.certificat_anglais_obligatoire ?? true)
  ) {
    why.push("certificat_anglais");
  }
  return why;
}

interface Candidate {
  o: Offer;
  total: number;
  corresp: string[];
}

export function recommander(offres: Offer[], p: MatchingProfile, n = 3): Recommendation[] {
  const fams = new Set<string>();
  for (const d of p.domaines ?? []) for (const f of DOMAINE_VERS_FAMILLES[d] ?? []) fams.add(f);
  const lib = (p.filiere_libre ?? "").trim();
  const hsk = p.hsk ?? 0;

  const cands: Candidate[] = [];
  for (const o of offres) {
    if (o.cycle !== p.cycle || !o.publiable) continue;
    if (exclusions(o, p).length > 0) continue;
    const majors = o.filieres.filter((m) => m.langue === "anglais" || hsk >= 4);
    const exact = majors.filter((m) => lib && filiereMatch(lib, m.nom)).map((m) => m.nom);
    const fam = majors.filter((m) => fams.has(m.famille)).map((m) => m.nom);
    let pert: number;
    let corresp: string[];
    if (exact.length) [pert, corresp] = [3, exact];
    else if (fam.length) [pert, corresp] = [2, fam];
    else if (fams.size === 0 && !lib) [pert, corresp] = [1, majors.map((m) => m.nom)];
    else continue;
    let val = SCORE_VAL[o.score] + (o.potentiel_or ? 0.5 : 0);
    if (p.financement === "bourse_uniquement" && !o.scolarite_offerte_garantie) val -= 1;
    const total = Math.round((pert * 10 + val * 3 + o.allocation_min_rmb_mois / 1000) * 1000) / 1000;
    cands.push({ o, total, corresp });
  }

  // Total décroissant, puis référence (comparaison par code de caractère, comme Python).
  cands.sort((a, b) => b.total - a.total || (a.o.ref < b.o.ref ? -1 : a.o.ref > b.o.ref ? 1 : 0));

  const choix: [Role, Candidate][] = [];
  if (cands.length) choix.push(["ambitieuse", cands[0]]);
  const rest = () => cands.filter((c) => !choix.some(([, x]) => x === c));
  const villes = () => new Set(choix.map(([, x]) => x.o.ville));

  let reste = rest();
  const cible =
    reste.find((c) => !villes().has(c.o.ville) && (c.o.score === "or" || c.o.score === "argent")) ??
    reste.find((c) => !villes().has(c.o.ville)) ??
    reste[0];
  if (cible) choix.push(["cible", cible]);

  reste = rest();
  const secu =
    reste.find((c) => !villes().has(c.o.ville) && Object.keys(c.o.criteres).length === 0) ??
    reste.find((c) => !villes().has(c.o.ville)) ??
    reste[0];
  if (secu) choix.push(["securite", secu]);

  return choix.slice(0, n).map(([role, c]) => ({
    ref: c.o.ref,
    role,
    ville: c.o.ville,
    total: c.total,
    filieres_correspondantes: c.corresp.slice(0, 3),
  }));
}
