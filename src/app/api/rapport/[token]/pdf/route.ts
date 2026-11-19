import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { linkActive } from "@/lib/report/server";
import { pdfResponse } from "@/lib/report/pdf-response";

/** PDF du lien privé /rapport/{token} : servi uniquement avec le jeton, jamais d'URL publique (ODY-15 §6). */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  if (!/^[\w-]{32}$/.test(params.token)) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const doc = await prisma.reportDocument.findUnique({ where: { token: params.token } });
  if (!doc?.blobUrl || !linkActive(doc)) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return pdfResponse(doc.blobUrl, doc.fileName, req.nextUrl.searchParams.has("download"));
}
