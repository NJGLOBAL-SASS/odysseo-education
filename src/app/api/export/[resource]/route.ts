import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildExport } from "@/lib/export";
import { candidateColumns, partnerColumns, newsletterColumns } from "@/lib/export/columns";
import type { ExportFormat } from "@/lib/export/types";

// pdfkit / exceljs ont besoin de l'environnement Node (Buffer, fs) : pas de edge runtime ici.
export const runtime = "nodejs";

const TITLES: Record<string, string> = {
  candidatures: "Candidatures",
  partenaires: "Partenaires",
  newsletter: "Newsletter",
};

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const format = (new URL(req.url).searchParams.get("format") || "csv") as ExportFormat;
  if (!["csv", "xlsx", "pdf"].includes(format)) {
    return NextResponse.json({ error: "Format invalide." }, { status: 400 });
  }

  const title = TITLES[params.resource];
  if (!title) {
    return NextResponse.json({ error: "Ressource inconnue." }, { status: 404 });
  }

  let result;

  if (params.resource === "candidatures") {
    const rows = await prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      include: { partner: { select: { referralCode: true } } },
    });
    result = await buildExport({ format, title, columns: candidateColumns, rows });
  } else if (params.resource === "partenaires") {
    const rows = await prisma.partner.findMany({
      orderBy: { pointsBalance: "desc" },
      include: { _count: { select: { candidates: true } } },
    });
    result = await buildExport({ format, title, columns: partnerColumns, rows });
  } else {
    const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
    result = await buildExport({ format, title, columns: newsletterColumns, rows });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
