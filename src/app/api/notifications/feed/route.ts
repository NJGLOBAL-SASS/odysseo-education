import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Notifications in-app du dashboard : nouveaux dossiers, demandes de partenariat,
 * nouveaux partenaires et inscriptions newsletter. Données brutes : le texte est
 * composé côté client, dans la langue du dashboard.
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
  const after = { createdAt: { gt: seenAt } };

  const [candidates, applications, partners, subscribers, ...unread] = await Promise.all([
    prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        fullName: true,
        country: true,
        targetLevel: true,
        createdAt: true,
        partner: { select: { fullName: true } },
      },
    }),
    prisma.partnerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, fullName: true, country: true, status: true, createdAt: true },
    }),
    prisma.partner.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, referralCode: true, createdAt: true },
    }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, createdAt: true },
    }),
    prisma.candidate.count({ where: after }),
    prisma.partnerApplication.count({ where: after }),
    prisma.partner.count({ where: after }),
    prisma.newsletterSubscriber.count({ where: after }),
  ]);

  const items = [
    ...candidates.map((c) => ({
      id: `c-${c.id}`,
      kind: "candidate" as const,
      name: c.fullName,
      meta: { country: c.country, level: c.targetLevel, via: c.partner?.fullName ?? null },
      href: `/dashboard/candidatures/${c.id}`,
      createdAt: c.createdAt,
    })),
    ...applications.map((a) => ({
      id: `a-${a.id}`,
      kind: "application" as const,
      name: a.fullName,
      meta: { country: a.country, status: a.status },
      href: "/dashboard/partenaires?onglet=demandes",
      createdAt: a.createdAt,
    })),
    ...partners.map((p) => ({
      id: `p-${p.id}`,
      kind: "partner" as const,
      name: p.fullName,
      meta: { code: p.referralCode },
      href: "/dashboard/partenaires",
      createdAt: p.createdAt,
    })),
    ...subscribers.map((n) => ({
      id: `n-${n.id}`,
      kind: "newsletter" as const,
      name: n.email,
      meta: {},
      href: "/dashboard/newsletter",
      createdAt: n.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map((i) => ({ ...i, unread: i.createdAt > seenAt }));

  return NextResponse.json({ items, unread: unread.reduce((s, n) => s + n, 0) });
}

/** Marque toutes les notifications comme lues. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  await prisma.user.update({ where: { id: session.user.id }, data: { notificationsSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
