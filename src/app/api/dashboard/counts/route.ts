import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Compteurs de la sidebar : nouveautés depuis la dernière visite de chaque section. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { candidatesSeenAt: true, newsletterSeenAt: true, createdAt: true },
  });
  const since = (d?: Date | null) => d ?? user?.createdAt ?? new Date(0);

  const [candidates, partnerRequests, newsletter] = await Promise.all([
    prisma.candidate.count({ where: { createdAt: { gt: since(user?.candidatesSeenAt) } } }),
    // Demandes de partenariat : tout ce qui attend une réponse de l'équipe.
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
    prisma.newsletterSubscriber.count({ where: { createdAt: { gt: since(user?.newsletterSeenAt) } } }),
  ]);

  return NextResponse.json({ candidates, partnerRequests, newsletter });
}
