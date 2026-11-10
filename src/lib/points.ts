import { ATTRIBUTING_CONTRACT_STATUSES } from "@/lib/contracts/rules";
import type { CandidatePipelineStatus, PointsReason, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { STATUS_LABELS_FR } from "@/components/dashboard/status-badge";

/**
 * Barème du programme partenaires. Modifiable sans toucher au reste du code.
 * Voir DOCUMENTATION.md § "Programme partenaires" pour le raisonnement.
 */
export const POINTS_RULES = {
  NEW_LEAD: 1,
  QUALIFIED_LEAD: 5,
  ENROLLED: 20,
} as const;

/**
 * Palier atteint par un dossier selon son statut : 0 = aucun bonus,
 * 1 = bonus « qualifié », 2 = bonus « qualifié » + « admis ».
 * `null` = statut neutre : le dossier garde les points déjà acquis (clôture).
 * Un dossier qui redescend de palier retire les bonus correspondants.
 */
export const STATUS_POINTS_TIER: Record<CandidatePipelineStatus, 0 | 1 | 2 | null> = {
  NOUVEAU: 0,
  QUALIFIE: 1,
  DOSSIER_EN_COURS: 1,
  BOURSE_SOUMISE: 1,
  ADMIS: 2,
  VISA_EN_COURS: 2,
  CLOTURE: null,
  REFUSE: 0,
};

type Tx = Prisma.TransactionClient;

/** Ajoute (points > 0) ou retire (points < 0) des points, en gardant le solde après opération. */
async function writeEntry(
  tx: Tx,
  entry: {
    partnerId: string;
    points: number;
    reason: PointsReason;
    candidateId?: string;
    note?: string;
    createdById?: string;
  }
) {
  const partner = await tx.partner.update({
    where: { id: entry.partnerId },
    data: { pointsBalance: { increment: entry.points } },
    select: { pointsBalance: true },
  });
  return tx.pointsLedgerEntry.create({ data: { ...entry, balanceAfter: partner.pointsBalance } });
}

export async function awardPoints(
  partnerId: string,
  points: number,
  reason: PointsReason,
  candidateId?: string,
  note?: string,
  createdById?: string
) {
  return prisma.$transaction((tx) => writeEntry(tx, { partnerId, points, reason, candidateId, note, createdById }));
}

/**
 * Ajustement manuel (ajout ou retrait). Un retrait ne peut pas rendre le solde négatif.
 * Renvoie null si le partenaire n'existe pas, "insufficient" si le solde ne suffit pas.
 */
export async function adjustPoints(partnerId: string, points: number, note: string, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const partner = await tx.partner.findUnique({ where: { id: partnerId }, select: { pointsBalance: true } });
    if (!partner) return null;
    if (partner.pointsBalance + points < 0) return "insufficient" as const;
    return writeEntry(tx, { partnerId, points, reason: "MANUAL_ADJUSTMENT", note, createdById });
  });
}

/**
 * Aligne les bonus d'un dossier sur son nouveau statut : montée de palier = ajout,
 * descente = retrait. On compare aux points réellement inscrits au journal pour ce
 * dossier, donc un aller-retour QUALIFIÉ → NOUVEAU → QUALIFIÉ ne crédite qu'une fois.
 */
export async function syncCandidatePoints(
  candidate: { id: string; partnerId: string | null },
  from: CandidatePipelineStatus,
  to: CandidatePipelineStatus,
  createdById?: string
) {
  const partnerId = candidate.partnerId;
  const tier = STATUS_POINTS_TIER[to];
  if (!partnerId || tier === null || from === to) return [];

  const targets: [PointsReason, number][] = [
    ["QUALIFIED_LEAD", tier >= 1 ? POINTS_RULES.QUALIFIED_LEAD : 0],
    ["ENROLLED", tier >= 2 ? POINTS_RULES.ENROLLED : 0],
  ];
  const note = `${STATUS_LABELS_FR[from]} → ${STATUS_LABELS_FR[to]}`;

  return prisma.$transaction(async (tx) => {
    const sums = await tx.pointsLedgerEntry.groupBy({
      by: ["reason"],
      where: { candidateId: candidate.id, partnerId, reason: { in: ["QUALIFIED_LEAD", "ENROLLED"] } },
      _sum: { points: true },
    });
    const current = new Map(sums.map((s) => [s.reason, s._sum.points ?? 0]));

    const written = [];
    for (const [reason, target] of targets) {
      const delta = target - (current.get(reason) ?? 0);
      if (delta !== 0) {
        written.push(await writeEntry(tx, { partnerId, points: delta, reason, candidateId: candidate.id, note, createdById }));
      }
    }
    return written;
  });
}

/**
 * Retrouve un partenaire qui peut recevoir des étudiants : actif ET contrat signé
 * (ou inscrit avant le contrat en ligne). PACK-11 : un contrat non signé n'attribue rien.
 */
export async function findPartnerByCode(code: string | null | undefined) {
  if (!code) return null;
  return prisma.partner.findFirst({
    where: { referralCode: code.trim().toUpperCase(), status: "ACTIVE", contractStatus: { in: ATTRIBUTING_CONTRACT_STATUSES } },
  });
}

/** Espace partenaire : le partenaire quel que soit l'état de son contrat. */
export async function findPartnerForSpace(code: string | null | undefined) {
  if (!code) return null;
  return prisma.partner.findFirst({ where: { referralCode: code.trim().toUpperCase(), status: "ACTIVE" } });
}

/** Code d'un partenaire existant mais qui ne peut pas attribuer : journalisé pour l'équipe, rien d'autre. */
export async function logBlockedAttribution(code: string | null | undefined, userAgent?: string | null) {
  if (!code) return;
  const partner = await prisma.partner.findFirst({ where: { referralCode: code.trim().toUpperCase() }, select: { id: true, status: true, contractStatus: true } });
  if (!partner || (partner.status === "ACTIVE" && ATTRIBUTING_CONTRACT_STATUSES.includes(partner.contractStatus))) return;
  await prisma.referralEvent.create({ data: { partnerId: partner.id, type: "ATTRIBUTION_BLOCKED", userAgent: userAgent || undefined } }).catch(() => undefined);
}
