import { prisma } from "@/lib/prisma";

/**
 * Barème du programme partenaires. Modifiable sans toucher au reste du code.
 * Voir DOCUMENTATION.md § "Programme partenaires" pour le raisonnement.
 */
export const POINTS_RULES = {
  NEW_LEAD: 1,
  QUALIFIED_LEAD: 5,
  ENROLLED: 20,
} as const;

export async function awardPoints(
  partnerId: string,
  points: number,
  reason: "NEW_LEAD" | "QUALIFIED_LEAD" | "ENROLLED" | "MANUAL_ADJUSTMENT",
  candidateId?: string,
  note?: string
) {
  await prisma.$transaction([
    prisma.pointsLedgerEntry.create({
      data: { partnerId, points, reason, candidateId, note },
    }),
    prisma.partner.update({
      where: { id: partnerId },
      data: { pointsBalance: { increment: points } },
    }),
  ]);
}

/** Retrouve un partenaire actif à partir d'un code de parrainage saisi ou transmis en URL. */
export async function findPartnerByCode(code: string | null | undefined) {
  if (!code) return null;
  return prisma.partner.findFirst({
    where: { referralCode: code.trim().toUpperCase(), status: "ACTIVE" },
  });
}
