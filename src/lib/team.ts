import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTeamInvitationEmail } from "@/lib/notifications";
import { INVITE_TOKEN_TTL_MS, createPasswordToken, trustedTeamOrigin } from "@/lib/password-reset";

/** Session d'un administrateur, ou une réponse d'erreur prête à renvoyer. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) } as const;
  }
  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 }),
    } as const;
  }
  return { session } as const;
}

/** Empêche de laisser l'équipe sans aucun administrateur. */
export async function isLastAdmin(userId: string) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  return admins.length === 1 && admins[0]!.id === userId;
}

/** (Ré)envoie l'invitation : nouveau lien d'activation valable 7 jours. */
export async function inviteMember(
  req: NextRequest,
  member: { id: string; email: string; name: string | null },
  invitedBy: string
) {
  const token = await createPasswordToken(member.id, INVITE_TOKEN_TTL_MS);
  const origin = trustedTeamOrigin(req);
  const link = `${origin}/fr/reset-password?token=${token}&invite=1`;
  return sendTeamInvitationEmail(member, invitedBy, link, `${origin}/fr/login`).catch(() => false);
}

/** Vue d'un membre pour le dashboard (jamais de hash ni de secret 2FA). */
export async function listMembers() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      twoFactorEnabled: true,
      passwordHash: true,
      createdAt: true,
      accounts: { select: { provider: true } },
      passwordResetTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        select: { expiresAt: true },
        take: 1,
      },
    },
  });

  return users.map(({ passwordHash, accounts, passwordResetTokens, ...u }) => {
    const hasPassword = Boolean(passwordHash);
    const hasGoogle = accounts.some((a) => a.provider === "google");
    return {
      ...u,
      hasPassword,
      hasGoogle,
      // Invitation en attente : aucun moyen de connexion encore utilisé.
      pending: !hasPassword && !hasGoogle,
      inviteExpiresAt: passwordResetTokens[0]?.expiresAt ?? null,
    };
  });
}

export type TeamMember = Awaited<ReturnType<typeof listMembers>>[number];
