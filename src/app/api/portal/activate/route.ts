import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, onPortalHost } from "@/lib/portal/guard";
import { isAcceptablePassword } from "@/lib/portal/password";
import { allowAttempt, clientIp } from "@/lib/portal/rate-limit";
import { startPortalSession } from "@/lib/portal/session";
import { findValidToken, markTokenUsed } from "@/lib/portal/tokens";

const schema = z.object({ token: z.string().min(10).max(200), password: z.string().max(200), purpose: z.enum(["invite", "reset"]) });

/** Lien d'activation (invite) ou de réinitialisation (reset) : choix du mot de passe, puis connexion. */
export async function POST(req: NextRequest) {
  if (!onPortalHost(req)) return json({ error: "notFound" }, 404);
  if (!(await allowAttempt(`portal-token|${clientIp(req)}`, 20, 15 * 60_000))) return json({ error: "tooMany" }, 429);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!isAcceptablePassword(body.data.password)) return json({ error: "weakPassword" }, 400);

  const row = await findValidToken(body.data.token, body.data.purpose);
  if (!row) return json({ error: "expired" }, 400);

  const account = await prisma.portalAccount.update({
    where: { id: row.accountId },
    data: {
      passwordHash: await bcrypt.hash(body.data.password, 12),
      activatedAt: new Date(),
      // Mot de passe réinitialisé : les autres appareils sont déconnectés.
      sessionVersion: body.data.purpose === "reset" ? { increment: 1 } : undefined,
    },
  });
  await markTokenUsed(row.id);
  await startPortalSession(account);
  return json({ ok: true });
}
