import { prisma } from "@/lib/prisma";

/** messages : messages de l'espace étudiant non lus par l'équipe (tous dossiers). */
export type DashboardCounts = { candidates: number; partnerRequests: number; newsletter: number; messages: number };

/**
 * Nouveautés d'un membre de l'équipe : dossiers et inscriptions newsletter depuis
 * sa dernière visite de la section, demandes de partenariat en attente de réponse.
 * Alimente la sidebar et le badge de l'icône de l'application (PWA).
 */
export async function getDashboardCounts(userId: string): Promise<DashboardCounts> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { candidatesSeenAt: true, newsletterSeenAt: true, createdAt: true },
  });
  const since = (d?: Date | null) => d ?? user?.createdAt ?? new Date(0);

  const [candidates, partnerRequests, newsletter, messages] = await Promise.all([
    prisma.candidate.count({ where: { createdAt: { gt: since(user?.candidatesSeenAt) } } }),
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
    prisma.newsletterSubscriber.count({ where: { createdAt: { gt: since(user?.newsletterSeenAt) } } }),
    prisma.portalMessage.count({ where: { authorType: { not: "TEAM" }, readByTeamAt: null } }),
  ]);
  return { candidates, partnerRequests, newsletter, messages };
}

export function badgeTotal(c: DashboardCounts) {
  return c.candidates + c.partnerRequests + c.newsletter + (c.messages ?? 0);
}
