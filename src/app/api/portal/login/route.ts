import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, onPortalHost } from "@/lib/portal/guard";
import { allowAttempt, clientIp } from "@/lib/portal/rate-limit";
import { startPortalSession } from "@/lib/portal/session";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(160), password: z.string().min(1).max(200) });

/** Connexion e-mail + mot de passe. Réponse identique que l'e-mail existe ou non. */
export async function POST(req: NextRequest) {
  if (!onPortalHost(req)) return json({ error: "notFound" }, 404);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  const { email, password } = body.data;

  const ip = clientIp(req);
  const allowed = (await allowAttempt(`portal-login|${ip}`, 30, 15 * 60_000)) && (await allowAttempt(`portal-login|${ip}|${email}`, 8, 15 * 60_000));
  if (!allowed) return json({ error: "tooMany" }, 429);

  const account = await prisma.portalAccount.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  const ok = account?.passwordHash ? await bcrypt.compare(password, account.passwordHash) : false;
  if (!account || !ok || account.disabledAt) return json({ error: "invalid" }, 401);

  await startPortalSession(account);
  return json({ ok: true });
}
