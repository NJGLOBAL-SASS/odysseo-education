import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { portalUrl } from "@/lib/portal/host";
import { createPortalToken } from "@/lib/portal/tokens";
import { sendPortalInvitation } from "@/lib/notifications";

const schema = z.object({
  role: z.enum(["STUDENT", "PARENT"]),
  email: z.string().trim().toLowerCase().email().max(160),
  name: z.string().trim().min(2).max(100),
  locale: z.enum(["fr", "en"]).default("fr"),
  sendEmail: z.boolean().default(true),
});

/** Crée l'espace étudiant (ou un accès parent) d'un dossier et envoie le lien d'activation. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const candidate = await prisma.candidate.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
  if (!candidate) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (body.data.role === "STUDENT" && (await prisma.portalAccount.count({ where: { candidateId: candidate.id, role: "STUDENT" } })) > 0) {
    return NextResponse.json({ error: "studentExists" }, { status: 409 });
  }
  if (await prisma.portalAccount.findFirst({ where: { email: { equals: body.data.email, mode: "insensitive" } } })) {
    return NextResponse.json({ error: "emailTaken" }, { status: 409 });
  }

  const account = await prisma.portalAccount.create({
    data: {
      candidateId: candidate.id,
      role: body.data.role,
      email: body.data.email,
      name: body.data.name,
      locale: body.data.locale,
      createdById: session.user.id,
    },
  });
  const token = await createPortalToken(account.id, "invite");
  const link = portalUrl(`/${account.locale}/espace/activer?token=${token}`);
  const emailed = body.data.sendEmail ? await sendPortalInvitation(account, candidate.code, link).catch(() => false) : false;
  return NextResponse.json({ ok: true, link, emailed });
}
