import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ section: z.enum(["candidates", "newsletter"]) });

/** Remet à zéro le compteur d'une section quand l'utilisateur l'ouvre. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: body.data.section === "candidates" ? { candidatesSeenAt: new Date() } : { newsletterSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
