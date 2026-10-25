import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, teamUrl } from "@/lib/notifications";
import {
  RESET_REQUEST_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
} from "@/lib/password-reset";

/**
 * Domaine du lien envoyé. On ne fait jamais confiance à l'en-tête Host tel quel
 * (sinon un attaquant pourrait faire envoyer à une victime un lien vers son
 * propre domaine) : seuls le sous-domaine équipe et NEXTAUTH_URL sont acceptés.
 */
function resetBaseUrl(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const allowed = new Map<string, string>();
  if (process.env.TEAM_HOSTNAME) allowed.set(process.env.TEAM_HOSTNAME.toLowerCase(), `https://${process.env.TEAM_HOSTNAME}`);
  if (process.env.NEXTAUTH_URL) {
    const u = new URL(process.env.NEXTAUTH_URL);
    allowed.set(u.host.toLowerCase(), u.origin);
  }
  if (process.env.NODE_ENV !== "production" && /^(team\.)?localhost(:\d+)?$/.test(host)) {
    allowed.set(host, `http://${host}`);
  }
  return allowed.get(host) ?? teamUrl("").replace(/\/$/, "");
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  locale: z.enum(["fr", "en"]).default("fr"),
});

/**
 * Demande de réinitialisation. Répond toujours la même chose, que le compte
 * existe ou non, pour ne pas révéler quelles adresses ont un accès équipe.
 */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });

  if (user) {
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) } },
    });

    if (!recent) {
      const token = generateResetToken();
      await prisma.$transaction([
        // Un seul lien valide à la fois : les précédents sont invalidés.
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashResetToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        }),
      ]);

      const link = `${resetBaseUrl(req)}/${body.data.locale}/reset-password?token=${token}`;

      await sendPasswordResetEmail(user, link).catch((err) => console.error("[password-reset] email :", err));
    }
  }

  return NextResponse.json({ ok: true });
}
