import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activityInclude } from "@/lib/documents-server";

const PAGE_SIZE = 50;

/**
 * Journal des documents. ?candidateId= : un dossier candidat ; ?scope=internal :
 * l'espace Données ; ?scope=all : tout. ?before=<date ISO> pour la page suivante.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const candidateId = params.get("candidateId");
  const scope = params.get("scope");
  const before = params.get("before");

  const where: Prisma.DocumentActivityWhereInput = {};
  if (candidateId) where.candidateId = candidateId;
  else if (scope !== "all") where.candidateId = null;
  if (before && !Number.isNaN(Date.parse(before))) where.createdAt = { lt: new Date(before) };

  const entries = await prisma.documentActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    include: activityInclude,
  });

  return NextResponse.json({
    entries: entries.slice(0, PAGE_SIZE),
    hasMore: entries.length > PAGE_SIZE,
  });
}
