import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { awardPoints } from "@/lib/points";

const schema = z.object({
  points: z.coerce.number().int(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await awardPoints(params.id, body.data.points, "MANUAL_ADJUSTMENT", undefined, body.data.note);

  return NextResponse.json({ ok: true });
}
