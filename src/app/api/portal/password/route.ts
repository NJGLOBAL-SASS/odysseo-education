import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { isAcceptablePassword } from "@/lib/portal/password";
import { startPortalSession } from "@/lib/portal/session";

const schema = z.object({ current: z.string().max(200).optional(), password: z.string().max(200) });

/** Change le mot de passe (l'actuel est demandé s'il existe) ; les autres appareils sont déconnectés. */
export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!isAcceptablePassword(body.data.password)) return json({ error: "weakPassword" }, 400);

  const account = await prisma.portalAccount.findUniqueOrThrow({ where: { id: auth.session.id } });
  if (account.passwordHash && !(await bcrypt.compare(body.data.current ?? "", account.passwordHash))) {
    return json({ error: "wrongPassword" }, 400);
  }
  const updated = await prisma.portalAccount.update({
    where: { id: account.id },
    data: { passwordHash: await bcrypt.hash(body.data.password, 12), activatedAt: account.activatedAt ?? new Date(), sessionVersion: { increment: 1 } },
  });
  await startPortalSession(updated);
  return json({ ok: true });
}
