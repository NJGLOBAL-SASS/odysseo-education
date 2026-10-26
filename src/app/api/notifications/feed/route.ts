import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optionLabel } from "@/lib/intake-labels";

/**
 * Notifications in-app du dashboard : nouveaux dossiers et nouveaux partenaires.
 * Est "non lu" tout ce qui est plus récent que User.notificationsSeenAt.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationsSeenAt: true, createdAt: true },
  });
  const seenAt = user?.notificationsSeenAt ?? user?.createdAt ?? new Date(0);

  const [candidates, partners, unreadCandidates, unreadPartners] = await Promise.all([
    prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        code: true,
        fullName: true,
        country: true,
        targetLevel: true,
        createdAt: true,
        partner: { select: { fullName: true } },
      },
    }),
    prisma.partner.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, referralCode: true, createdAt: true },
    }),
    prisma.candidate.count({ where: { createdAt: { gt: seenAt } } }),
    prisma.partner.count({ where: { createdAt: { gt: seenAt } } }),
  ]);

  const items = [
    ...candidates.map((c) => ({
      id: `c-${c.id}`,
      kind: "candidate" as const,
      title: `Nouveau dossier · ${c.fullName}`,
      body: [c.country, optionLabel("targetLevel", c.targetLevel), c.partner ? `via ${c.partner.fullName}` : null]
        .filter(Boolean)
        .join(" · "),
      href: `/dashboard/candidatures/${c.id}`,
      createdAt: c.createdAt,
    })),
    ...partners.map((p) => ({
      id: `p-${p.id}`,
      kind: "partner" as const,
      title: `Nouveau partenaire · ${p.fullName}`,
      body: `Code ${p.referralCode}`,
      href: "/dashboard/partenaires",
      createdAt: p.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15)
    .map((i) => ({ ...i, unread: i.createdAt > seenAt }));

  return NextResponse.json({ items, unread: unreadCandidates + unreadPartners, latestCandidate: candidates[0] ?? null });
}

/** Marque toutes les notifications comme lues. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  await prisma.user.update({ where: { id: session.user.id }, data: { notificationsSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
