import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { bulkMarkSent } from "@/lib/report/server";
import { CASES } from "@/lib/report/status";

/**
 * Rattrapage (ODY-15 §5.1) : « Marquer rapport envoyé » sur les candidatures déjà traitées
 * hors plateforme. Elles entrent dans le calendrier de relances à partir de la date indiquée.
 */
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string()).min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cas: z.enum(CASES),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  // Envoi daté de midi (heure de Douala) du jour indiqué ; jamais dans le futur.
  const sentAt = new Date(Math.min(Date.parse(`${body.data.date}T11:00:00Z`), Date.now()));
  const actor = { id: session.user.id ?? null, name: session.user.name || session.user.email || "Équipe" };
  const result = await bulkMarkSent(body.data.ids, { sentAt, cas: body.data.cas }, actor);
  return NextResponse.json({ ok: true, ...result });
}
