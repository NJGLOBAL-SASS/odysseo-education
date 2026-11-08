import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, onPortalHost } from "@/lib/portal/guard";
import { portalUrl } from "@/lib/portal/host";
import { allowAttempt, clientIp } from "@/lib/portal/rate-limit";
import { createPortalToken } from "@/lib/portal/tokens";
import { sendPortalPasswordReset } from "@/lib/notifications";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(160) });

/** Mot de passe oublié : toujours la même réponse (ne révèle pas si le compte existe). */
export async function POST(req: NextRequest) {
  if (!onPortalHost(req)) return json({ error: "notFound" }, 404);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!(await allowAttempt(`portal-forgot|${clientIp(req)}`, 10, 60 * 60_000))) return json({ error: "tooMany" }, 429);

  const account = await prisma.portalAccount.findFirst({
    where: { email: { equals: body.data.email, mode: "insensitive" }, disabledAt: null },
  });
  if (account && (await allowAttempt(`portal-forgot|${account.id}`, 3, 60 * 60_000))) {
    const token = await createPortalToken(account.id, "reset");
    const link = portalUrl(`/${account.locale === "en" ? "en" : "fr"}/espace/reinitialiser?token=${token}`);
    await sendPortalPasswordReset(account, link).catch((err) => console.error("[portal] e-mail reset :", err));
  }
  return json({ ok: true });
}
