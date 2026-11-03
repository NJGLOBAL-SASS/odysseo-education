import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustPoints } from "@/lib/points";

/** Historique des points d'un partenaire (ajouts et retraits), du plus récent au plus ancien. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    select: {
      pointsBalance: true,
      pointsLedger: {
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          candidate: { select: { id: true, code: true, fullName: true } },
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!partner) return NextResponse.json({ error: "notFound" }, { status: 404 });

  return NextResponse.json({ balance: partner.pointsBalance, entries: partner.pointsLedger });
}

const schema = z.object({
  // positif = ajout, négatif = retrait
  points: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0 && Math.abs(n) <= 10_000),
  note: z.string().trim().min(3).max(300),
});

/** Ajustement manuel : le motif est obligatoire et l'auteur est enregistré. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const result = await adjustPoints(params.id, body.data.points, body.data.note, session.user.id);
  if (result === null) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (result === "insufficient") return NextResponse.json({ error: "insufficient" }, { status: 409 });

  return NextResponse.json({ ok: true, balance: result.balanceAfter });
}
