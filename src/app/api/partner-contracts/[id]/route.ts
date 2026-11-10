import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Équipe : télécharger un contrat signé. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const contract = await prisma.partnerContract.findUnique({ where: { id: params.id } });
  if (!contract?.pdf) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return new Response(new Uint8Array(contract.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Contrat_${contract.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
