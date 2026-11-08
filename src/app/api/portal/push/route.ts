import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, requirePortalSession } from "@/lib/portal/guard";

const schema = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });

/** Abonne l'appareil aux notifications de l'espace étudiant (jamais aux alertes de l'équipe). */
export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  const data = { portalAccountId: auth.session.id, userId: null, p256dh: body.data.keys.p256dh, auth: body.data.keys.auth };
  await prisma.pushSubscription.upsert({ where: { endpoint: body.data.endpoint }, update: data, create: { ...data, endpoint: body.data.endpoint } });
  return json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const endpoint = (await req.json().catch(() => null))?.endpoint;
  if (typeof endpoint === "string") await prisma.pushSubscription.deleteMany({ where: { endpoint, portalAccountId: auth.session.id } });
  return json({ ok: true });
}
