// PACK-13 §6 · Contrôle du catalogue avant tout déploiement (paquet MAJ-OFFRES) :
//   npm run check-offres
// JSON valides, références uniques, aucune référence disparue (comparaison avec le dernier
// commit), dates au format AAAA-MM-JJ, statuts connus, cohérence avec le fichier interne.
// Code de sortie 1 en cas d'erreur : NE RIEN DÉPLOYER, corriger d'abord.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIR = "data/offres";
const MAIN = `${DIR}/offres_2027.json`;
const INTERNAL = `${DIR}/offres_2027_internes.json`;
const STATUSES = ["active", "a_confirmer", "a_verifier", "expiree", "quota_atteint", "non_eligible_afrique"];
const CYCLES = ["langue", "bachelor", "mbbs", "master", "phd"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const warnings = [];
const load = (path, text) => {
  try {
    return JSON.parse(text ?? readFileSync(path, "utf8"));
  } catch (err) {
    errors.push(`${path} : JSON invalide (${err.message})`);
    return null;
  }
};

const cat = load(MAIN);
const internal = load(INTERNAL);
if (cat) {
  if (!cat.meta?.version) errors.push(`${MAIN} : meta.version manquant`);
  const refs = new Map();
  for (const o of cat.offres ?? []) {
    const where = `${MAIN} · ${o.ref ?? "(sans ref)"}`;
    if (!o.ref) errors.push(`${where} : ref manquante`);
    else if (refs.has(o.ref)) errors.push(`${where} : référence en double`);
    refs.set(o.ref, o);
    if (!STATUSES.includes(o.statut)) errors.push(`${where} : statut inconnu « ${o.statut} » (attendus : ${STATUSES.join(", ")})`);
    if (!CYCLES.includes(o.cycle)) errors.push(`${where} : cycle inconnu « ${o.cycle} »`);
    if (o.date_limite != null && !DATE.test(o.date_limite)) errors.push(`${where} : date_limite « ${o.date_limite} » (format AAAA-MM-JJ ou null)`);
    if (/universit[ée]\s+(?!\*\*\*)[A-Z]/.test(`${o.nom_public ?? ""} ${o.lieu_affiche ?? ""}`)) errors.push(`${where} : nom d'université visible (doit rester « Université *** »)`);
  }
  // Aucune référence ne disparaît : une offre fermée change de statut (expiree, quota_atteint).
  try {
    const previous = load(`HEAD:${MAIN}`, execFileSync("git", ["show", `HEAD:${MAIN}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
    for (const o of previous?.offres ?? []) if (!refs.has(o.ref)) errors.push(`${MAIN} : la référence ${o.ref} a disparu (la garder avec statut « expiree » ou « quota_atteint »)`);
    if (previous?.meta?.version === cat.meta?.version && JSON.stringify(previous.offres) !== JSON.stringify(cat.offres)) {
      warnings.push(`meta.version inchangée (${cat.meta.version}) alors que les offres ont changé : pensez à l'incrémenter`);
    }
  } catch {
    warnings.push("Comparaison avec le dernier commit impossible (fichier nouveau ou hors dépôt git).");
  }
  if (internal) {
    const internalRefs = new Set((internal.offres ?? []).map((o) => o.ref));
    for (const ref of refs.keys()) if (!internalRefs.has(ref)) warnings.push(`${INTERNAL} : pas de fiche interne pour ${ref}`);
  }
  const by = (k) => [...refs.values()].reduce((m, o) => ((m[o[k]] = (m[o[k]] ?? 0) + 1), m), {});
  console.log(`Catalogue ${cat.meta?.version} · ${refs.size} offres · statuts ${JSON.stringify(by("statut"))} · cycles ${JSON.stringify(by("cycle"))}`);
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`❌ ${e}`);
  console.error(`\n${errors.length} erreur(s) : ne rien déployer.`);
  process.exit(1);
}
console.log("✅ Catalogue valide.");
