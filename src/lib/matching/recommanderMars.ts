/**
 * Moteur Langue / Licence / Médecine (PACK-12) : port TypeScript À L'IDENTIQUE de
 * PACK-12/matching_mars_reference.py, qui fait foi (tests : PACK-12/fixtures_mars.json).
 *
 * Ne pas modifier les exclusions, le score
 * (pertinence × 10 + valeur × 3 + allocation_min / 1000 − coût_annuel / 10 000, +2 si
 * bourse uniquement et coût nul), le tri (total décroissant puis référence) ni la
 * sélection ambitieuse → cible → sécurité (+ alternative) sans mettre à jour le script
 * Python et fixtures_mars.json en même temps.
 *
 * Module pur : le catalogue et la date du jour sont passés en paramètres.
 */
import type { Offer } from "./types";

export type MarsCycle = "langue" | "licence";
export type MarsRole = "ambitieuse" | "cible" | "securite" | "alternative";
export type MarsFunding = "bourse_uniquement" | "partiel" | "total" | null;

export interface MarsProfile {
  cycle_vise: MarsCycle;
  age: number;
  /** Slugs de familles (vide = pas de préférence). */
  familles: string[];
  hsk: number | null;
  a_le_bac: boolean;
  funding: MarsFunding;
}

export interface MarsResult {
  recommandations: { ref: string; role: MarsRole }[];
  /** Profil Langue éligible à une licence : référence du Bachelor proposé en plus. */
  proposer_bachelor: string | null;
  /** Licence impossible (âge, HSK…) : offres de langue proposées à la place. */
  repli_langue: boolean;
}

const VALEUR = { or: 3, argent: 2, bronze: 1 } as const;
const FAM_MED = "medecine-sante";

/** Date « AAAA-MM-JJ » (UTC). */
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Raisons d'exclusion (liste vide = offre possible). Mêmes règles que _eligible(). */
export function exclusionsMars(o: Offer, p: Pick<MarsProfile, "age" | "hsk">, today: string): string[] {
  const c = o.criteres ?? {};
  const why: string[] = [];
  if (!o.publiable) why.push("publiable");
  if (o.date_limite && o.date_limite < today) why.push("date_limite");
  if (p.age < (c.age_min ?? 0) || p.age > (c.age_max ?? 99)) why.push("age");
  if (c.hsk_min && (p.hsk || 0) < c.hsk_min) why.push("hsk");
  if (c.reserve_asie) why.push("reserve_asie");
  return why;
}

/** round(x, 4) de Python (arrondi à 4 décimales). */
const round4 = (x: number) => Math.round(x * 10_000) / 10_000;

function total(o: Offer, pert: number, p: MarsProfile) {
  const cout = o.cout_annuel_rmb ?? 0;
  let t = pert * 10 + VALEUR[o.score] * 3 + o.allocation_min_rmb_mois / 1000 - cout / 10_000;
  if (p.funding === "bourse_uniquement" && cout === 0) t += 2;
  return round4(t);
}

/** Comparaison de références par code de caractère, comme Python. */
const cmpRef = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

type Scored = { o: Offer; pert: number; total: number };

export function recommanderMars(p: MarsProfile, offres: Offer[], today: Date | string = new Date()): MarsResult {
  const day = typeof today === "string" ? today : isoDay(today);

  let pool: Offer[];
  if (p.cycle_vise === "langue") {
    pool = offres.filter((o) => o.cycle === "langue");
  } else {
    const cycles = new Set<string>(["bachelor", ...(p.familles.includes(FAM_MED) ? ["mbbs"] : [])]);
    pool = offres.filter((o) => cycles.has(o.cycle));
  }
  pool = pool.filter((o) => exclusionsMars(o, p, day).length === 0);

  const fams = new Set(p.familles);
  let scored: Scored[] = pool.map((o) => {
    const pert = o.cycle === "langue" || p.familles.length === 0 ? 1 : o.familles.some((f) => fams.has(f)) ? 1 : 0;
    return { o, pert, total: total(o, pert, p) };
  });
  // Licence : si au moins une offre correspond aux domaines, on ne garde que celles-là.
  if (p.cycle_vise === "licence" && scored.some((s) => s.pert)) scored = scored.filter((s) => s.pert);
  scored.sort((a, b) => b.total - a.total || cmpRef(a.o.ref, b.o.ref));

  const choix: [Offer, MarsRole][] = [];
  if (scored.length) {
    choix.push([scored[0].o, "ambitieuse"]);
    const apres = scored.slice(1);
    const autreVille = apres.filter((s) => s.o.ville !== scored[0].o.ville);
    const reste = autreVille.length ? autreVille : apres;
    if (reste.length) {
      choix.push([reste[0].o, "cible"]);
      const villes = new Set(choix.map(([o]) => o.ville));
      const pris = new Set(choix.map(([o]) => o.ref));
      const libres = scored.filter((s) => !pris.has(s.o.ref));
      const libresAutreVille = libres.filter((s) => !villes.has(s.o.ville));
      const r2 = libresAutreVille.length ? libresAutreVille : libres;
      if (r2.length) {
        // Sécurité = la moins chère des restantes (puis meilleur total, puis référence).
        r2.sort((a, b) => (a.o.cout_annuel_rmb ?? 0) - (b.o.cout_annuel_rmb ?? 0) || b.total - a.total || cmpRef(a.o.ref, b.o.ref));
        choix.push([r2[0].o, "securite"]);
      }
    }
  }

  const res: MarsResult = {
    recommandations: choix.map(([o, role]) => ({ ref: o.ref, role })),
    proposer_bachelor: null,
    repli_langue: false,
  };

  // 4e offre facultative (« alternative ») : la meilleure restante, quelle que soit la ville.
  if (p.cycle_vise === "licence" && choix.length === 3) {
    const pris = new Set(choix.map(([o]) => o.ref));
    const reste4 = scored.filter((s) => !pris.has(s.o.ref));
    if (reste4.length) res.recommandations.push({ ref: reste4[0].o.ref, role: "alternative" });
  }
  // Licence sans aucune offre possible (âge, HSK…) : on propose la langue, le conseiller reprend la main.
  if (p.cycle_vise === "licence" && choix.length === 0) {
    const r = recommanderMars({ ...p, cycle_vise: "langue", a_le_bac: false }, offres, day);
    res.recommandations = r.recommandations;
    res.repli_langue = r.recommandations.length > 0;
  }
  // Règle anti-« malin » : un profil Langue éligible à une licence se voit proposer le Bachelor.
  if (p.cycle_vise === "langue" && p.a_le_bac) {
    const rLic = recommanderMars({ ...p, cycle_vise: "licence" }, offres, day);
    const alt = rLic.repli_langue ? [] : rLic.recommandations;
    if (alt.length) {
      res.proposer_bachelor = alt[0].ref;
      res.recommandations.push({ ref: alt[0].ref, role: "alternative" });
    }
  }
  return res;
}
