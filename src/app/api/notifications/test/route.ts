import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTestNotification } from "@/lib/notifications";

const schema = z.object({ channel: z.enum(["EMAIL", "PUSH", "WHATSAPP"]) });

/** Envoie une notification de test sur un canal, puis renvoie la ligne du journal. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Canal invalide." }, { status: 400 });

  const ok = await sendTestNotification(body.data.channel, {
    id: session.user.id,
    email: session.user.email,
  });
  const log = await prisma.notificationLog.findFirst({
    where: { channel: body.data.channel },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok, status: log?.status, error: log?.error });
}
