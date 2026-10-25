import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  emailOnNewLead: z.boolean().optional(),
  pushOnNewLead: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: body.data,
    create: { userId: session.user.id, ...body.data },
  });
  return NextResponse.json({ prefs });
}
