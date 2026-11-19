import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postponeReminder, reminderSent, remindersDueToday, stopReminders } from "@/lib/report/server";
import { STOP_REASONS } from "@/lib/report/status";
import { waNumber } from "@/lib/report/reminders";

/** Liste « À relancer aujourd'hui » (ODY-15 §7.3), message prêt pour chaque ligne. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const rows = await remindersDueToday();
  return NextResponse.json({ reminders: rows.map((r) => ({ ...r, waNumber: waNumber(r.candidate.whatsapp, r.candidate.country) })) });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sent"), id: z.string(), message: z.string().trim().min(1).max(6000) }),
  z.object({ action: z.literal("postpone"), id: z.string() }),
  z.object({ action: z.literal("stop"), id: z.string(), reason: z.enum(STOP_REASONS), note: z.string().trim().max(300).optional() }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const actor = { id: session.user.id ?? null, name: session.user.name || session.user.email || "Équipe" };
  const d = body.data;
  const reminder = await prisma.reportReminder.findUnique({ where: { id: d.id }, select: { candidateId: true } });
  if (!reminder) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (d.action === "sent") await reminderSent(d.id, d.message, actor);
  else if (d.action === "postpone") await postponeReminder(d.id, actor);
  else await stopReminders(reminder.candidateId, d.reason, d.note || null, actor);
  return NextResponse.json({ ok: true });
}
