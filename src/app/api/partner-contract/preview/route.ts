import { NextRequest, NextResponse } from "next/server";

import { buildContractPdf, contractFromToken } from "@/lib/contracts/service";

/** Aperçu PDF du contrat rempli, non signé (filigrane « APERÇU », sans la signature du fondateur). */
export async function GET(req: NextRequest) {
  const state = await contractFromToken(req.nextUrl.searchParams.get("token") ?? "");
  if (!state.ok) return NextResponse.json({ error: state.reason }, { status: 410 });
  const { pdf } = await buildContractPdf(state.contract);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Apercu_${state.contract.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
