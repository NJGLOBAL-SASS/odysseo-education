import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { portalUrl } from "@/lib/portal/host";
import { createPortalToken } from "@/lib/portal/tokens";
import { sendPortalInvitation } from "@/lib/notifications";

const schema = z.object({ action: z.enum(["resend", "link", "disable", "enable"]) });

/**
 * Actions de l'équipe sur un accès à l'espace étudiant :
 * resend (nouveau lien par e-mail), link (nouveau lien à copier), disable / enable.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const account = await prisma.portalAccount.findUnique({ where: { id: params.id }, include: { candidate: { select: { code: true } } } });
  if (!account) return NextResponse.json({ error: "notFound" }, { status: 404 });

  switch (body.data.action) {
    case "disable":
      await prisma.portalAccount.update({ where: { id: account.id }, data: { disabledAt: new Date(), sessionVersion: { increment: 1 } } });
      await prisma.pushSubscription.deleteMany({ where: { portalAccountId: account.id } });
      return NextResponse.json({ ok: true });
    case "enable":
      await prisma.portalAccount.update({ where: { id: account.id }, data: { disabledAt: null } });
      return NextResponse.json({ ok: true });
    default: {
      if (account.disabledAt) return NextResponse.json({ error: "disabled" }, { status: 400 });
      const purpose = account.passwordHash ? "reset" : "invite";
      const token = await createPortalToken(account.id, purpose);
      const link = portalUrl(`/${account.locale}/espace/${purpose === "invite" ? "activer" : "reinitialiser"}?token=${token}`);
      const emailed = body.data.action === "resend" ? await sendPortalInvitation(account, account.candidate.code, link).catch(() => false) : false;
      return NextResponse.json({ ok: true, link, emailed });
    }
  }
}
