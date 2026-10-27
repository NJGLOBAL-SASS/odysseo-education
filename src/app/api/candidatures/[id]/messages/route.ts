import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { htmlToText, sanitizeEmailHtml } from "@/lib/html-sanitize";
import { sendCandidateEmail } from "@/lib/notifications";

/** Vercel limite le corps d'une requête à ~4,5 Mo : marge pour l'encodage base64 (+33 %). */
const MAX_ATTACHMENTS_BYTES = 3 * 1024 * 1024;
const BLOCKED_EXT = /\.(exe|bat|cmd|com|scr|js|vbs|msi|sh|jar|apk|ps1)$/i;

const schema = z.object({
  subject: z.string().trim().min(2).max(200),
  html: z.string().max(200_000),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(150),
        type: z.string().max(120).default("application/octet-stream"),
        content: z.string().regex(/^[A-Za-z0-9+/=]+$/), // base64
      })
    )
    .max(8)
    .default([]),
});

/** Email rédigé dans le dashboard, envoyé au candidat et archivé sur sa fiche. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const candidate = await prisma.candidate.findUnique({ where: { id: params.id } });
  if (!candidate) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!candidate.email) return NextResponse.json({ error: "noEmail" }, { status: 400 });

  const html = sanitizeEmailHtml(body.data.html);
  if (htmlToText(html).length < 2) return NextResponse.json({ error: "emptyMessage" }, { status: 400 });

  const attachments = body.data.attachments;
  if (attachments.some((a) => BLOCKED_EXT.test(a.name))) {
    return NextResponse.json({ error: "blockedFile" }, { status: 400 });
  }
  const totalBytes = attachments.reduce((sum, a) => sum + Math.floor((a.content.length * 3) / 4), 0);
  if (totalBytes > MAX_ATTACHMENTS_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });

  const message = await prisma.candidateMessage.create({
    data: {
      candidateId: candidate.id,
      subject: body.data.subject,
      html,
      attachments: attachments.map((a) => ({
        name: a.name,
        type: a.type,
        size: Math.floor((a.content.length * 3) / 4),
      })),
      sentById: session.user.id,
    },
  });

  const result = await sendCandidateEmail(
    candidate,
    { subject: body.data.subject, html, attachments: attachments.map((a) => ({ name: a.name, content: a.content })) },
    { email: session.user.email, name: session.user.name ?? null }
  );

  await prisma.candidateMessage.update({
    where: { id: message.id },
    data: result.ok ? { status: "SENT" } : { status: "FAILED", error: result.error ?? "Email non envoyé (Brevo)" },
  });

  return NextResponse.json({ ok: result.ok, error: result.ok ? undefined : "sendFailed" }, { status: result.ok ? 200 : 502 });
}
