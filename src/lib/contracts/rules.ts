/**
 * Contrat partenaire (PACK-11) : règles pures, testées (montants, masquage, nom, modèle).
 */

export type Palier = { id: string; libelle: string; dossiers_min: number; dossiers_max: number | null; taux: number };
export type ContractConfig = {
  contrat_version: string;
  devise: string;
  prix_date: string;
  prix_services: Record<"langue" | "bachelor" | "master" | "phd", number>;
  paliers: Palier[];
  prime_ouverture: number;
  delai_paiement_jours: number;
  attribution_mois: number;
  duree_mois: number;
  preavis_jours: number;
  tribunal_ville: string;
  fuseau: string;
  fuseau_libelle: string;
  lien_contrat_validite_jours: number;
  otp: { canal_par_defaut: string; longueur: number; validite_minutes: number; tentatives_max: number; renvois_max_par_heure: number };
  signataire_odysseo: { nom: string; fonction: string; signature_image: string; cachet_image: string };
  operateurs_paiement: string[];
  pays: string[];
  pieces_identite: string[];
};

/** Statuts de contrat qui attribuent des étudiants (« non_requis » : partenaires inscrits avant le contrat en ligne). */
export const ATTRIBUTING_CONTRACT_STATUSES = ["non_requis", "actif"];

export const SERVICE_LABELS: Record<keyof ContractConfig["prix_services"], string> = {
  langue: "Langue chinoise",
  bachelor: "Bachelor",
  master: "Master",
  phd: "Doctorat (PhD)",
};

/** Commission par étudiant, arrondie au millier (FCFA). */
export function commission(price: number, rate: number) {
  return Math.round((price * rate) / 1000) * 1000;
}

/** Tableau « service × palier » du contrat. */
export function commissionTable(cfg: Pick<ContractConfig, "prix_services" | "paliers">) {
  return {
    paliers: cfg.paliers.map((p) => ({
      label: `${p.libelle} (${p.dossiers_max ? `${p.dossiers_min} à ${p.dossiers_max}` : `${p.dossiers_min} et plus`} étudiants · ${Math.round(p.taux * 100)} %)`,
    })),
    rows: (Object.keys(cfg.prix_services) as (keyof ContractConfig["prix_services"])[]).map((k) => ({
      service: SERVICE_LABELS[k],
      amounts: cfg.paliers.map((p) => commission(cfg.prix_services[k], p.taux)),
    })),
  };
}

export const fcfa = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ");

/** « jean.dupont@gmail.com » → « j***@gmail.com ». */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain ?? ""}`;
}

/** « +237699124512 » → « +237 6** ** 45 12 » (indicatif, premier chiffre et 4 derniers chiffres visibles). */
export function maskPhone(phone: string, dialLength = 3) {
  const digits = phone.replace(/\D/g, "");
  const dial = digits.slice(0, dialLength);
  const rest = digits.slice(dialLength);
  if (rest.length < 6) return `+${dial} ${"*".repeat(rest.length)}`;
  return `+${dial} ${rest[0]}** ** ${rest.slice(-4, -2)} ${rest.slice(-2)}`;
}

/** Comparaison de noms sans majuscules, accents, ponctuation ni ordre des mots. */
export function sameName(a: string, b: string) {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");
  return norm(a) !== "" && norm(a) === norm(b);
}

/** Remplit les champs {{...}} (texte) ; les blocs spéciaux restent sous forme de marqueur. */
export function fillTemplate(md: string, fields: Record<string, string>, keep: string[] = ["tableau_commissions", "bloc_signatures"]) {
  const withoutComments = md.replace(/<!--[\s\S]*?-->/g, "");
  return withoutComments.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, key: string) => (keep.includes(key) ? all : fields[key] ?? all));
}

export type Inline = { text: string; bold: boolean }[];
export type Block =
  | { type: "h1" | "h2" | "p"; inline: Inline }
  | { type: "ul" | "ol"; items: Inline[] }
  | { type: "commissions" }
  | { type: "signatures" };

function inline(text: string): Inline {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => (part.startsWith("**") && part.endsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }));
}

/** Markdown simple du modèle (titres, paragraphes, listes, gras) → blocs, rendus en HTML et en PDF. */
export function parseContract(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split(/\r?\n/);
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: Inline[] } | null = null;
  const flush = () => {
    if (para.length) blocks.push({ type: "p", inline: inline(para.join(" ")) });
    para = [];
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line === "{{tableau_commissions}}" || line === "{{bloc_signatures}}") {
      flush();
      blocks.push({ type: line.includes("commissions") ? "commissions" : "signatures" });
      continue;
    }
    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: heading[1].length === 1 ? "h1" : "h2", inline: inline(heading[2]) });
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      if (para.length) {
        blocks.push({ type: "p", inline: inline(para.join(" ")) });
        para = [];
      }
      const type = ul ? "ul" : "ol";
      if (!list || list.type !== type) {
        if (list) blocks.push(list);
        list = { type, items: [] };
      }
      list.items.push(inline((ul ?? ol)![1]));
      continue;
    }
    if (list) {
      blocks.push(list);
      list = null;
    }
    para.push(line);
  }
  flush();
  return blocks;
}
