import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.data.endpoint },
    update: { userId: session.user.id, p256dh: body.data.keys.p256dh, auth: body.data.keys.auth },
    create: {
      userId: session.user.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}
