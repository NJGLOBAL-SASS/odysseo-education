import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/notifications";
import {
  RESET_REQUEST_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  createPasswordToken,
  trustedTeamOrigin,
} from "@/lib/password-reset";

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

  const user = await prisma.user.findFirst({
    where: { email: { equals: body.data.email, mode: "insensitive" } },
  });

  if (user) {
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) } },
    });

    if (!recent) {
      const token = await createPasswordToken(user.id, RESET_TOKEN_TTL_MS);
      const link = `${trustedTeamOrigin(req)}/${body.data.locale}/reset-password?token=${token}`;

      await sendPasswordResetEmail(user, link).catch((err) => console.error("[password-reset] email :", err));
    }
  }

  return NextResponse.json({ ok: true });
}
