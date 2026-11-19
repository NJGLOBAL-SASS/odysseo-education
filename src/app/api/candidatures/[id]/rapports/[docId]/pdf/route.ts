import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pdfResponse } from "@/lib/report/pdf-response";

/** Rapport PDF pour l'équipe (aperçu, téléchargement, partage). */
export async function GET(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const doc = await prisma.reportDocument.findFirst({ where: { id: params.docId, candidateId: params.id } });
  if (!doc?.blobUrl) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return pdfResponse(doc.blobUrl, doc.fileName, req.nextUrl.searchParams.has("download"));
}
