import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/contracts/service";

/** Contrat signé, depuis l'écran final : jeton valable 24 h. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const contract = token.length >= 20 ? await prisma.partnerContract.findUnique({ where: { finalTokenHash: sha256(token) } }) : null;
  if (!contract?.pdf || !contract.finalTokenExpiry || contract.finalTokenExpiry < new Date()) return NextResponse.json({ error: "expired" }, { status: 410 });
  return new Response(new Uint8Array(contract.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Contrat_${contract.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
