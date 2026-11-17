import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ partnerId: z.string().min(1), action: z.enum(["send", "unsend"]) });

/** « Envoyer » (WhatsApp ouvert) crée l'envoi ; « Annuler l'envoi » le retire en cas d'erreur. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { partnerId, action } = body.data;
  if (action === "unsend") {
    await prisma.kitSend.deleteMany({ where: { kitId: params.id, partnerId } });
    return NextResponse.json({ ok: true });
  }
  const send = await prisma.kitSend.upsert({
    where: { kitId_partnerId: { kitId: params.id, partnerId } },
    create: { kitId: params.id, partnerId, sentByName: session.user.name || session.user.email || null },
    update: {},
  });
  return NextResponse.json({ send });
}
