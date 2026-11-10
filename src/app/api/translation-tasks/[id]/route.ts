import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Tâche de traduction cochée « Fait » (ou décochée). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const done = ((await req.json().catch(() => null)) as { done?: boolean } | null)?.done;
  if (typeof done !== "boolean") return NextResponse.json({ error: "invalid" }, { status: 400 });
  await prisma.translationTask.update({
    where: { id: params.id },
    data: done ? { doneAt: new Date(), doneByName: session.user.name || session.user.email } : { doneAt: null, doneByName: null },
  });
  return NextResponse.json({ ok: true });
}
