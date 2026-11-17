import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlobs } from "@/lib/documents-server";
import { QR_POSITIONS } from "@/lib/kits/rules";
import { verifyFlyer } from "@/lib/kits/server";

const schema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  template: z.string().trim().min(10).max(3000).optional(),
  qrPosition: z.enum(QR_POSITIONS).optional(),
  status: z.enum(["brouillon", "pret", "archive"]).optional(),
  flyer: z.object({ url: z.string().url(), name: z.string().max(200) }).optional(),
});

/**
 * Modification d'un kit. Nouveau flyer : la version change, donc les images déjà générées
 * (adresses ?v=) ne sont plus servies ; l'ancien fichier est supprimé du stockage.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const kit = await prisma.kit.findUnique({ where: { id: params.id } });
  if (!kit) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const { flyer: newFlyer, ...fields } = body.data;
  const flyer = newFlyer ? await verifyFlyer(newFlyer) : null;
  if (flyer && "error" in flyer) return NextResponse.json({ error: flyer.error }, { status: 400 });
  if (fields.status === "pret" && !flyer && !kit.imageUrl) return NextResponse.json({ error: "flyerRequired" }, { status: 400 });
  const updated = await prisma.kit.update({
    where: { id: kit.id },
    data: { ...fields, ...(flyer ? { ...flyer, imageVersion: { increment: 1 } } : {}) },
  });
  if (flyer && kit.imageUrl) await deleteBlobs([kit.imageUrl]);
  return NextResponse.json({ kit: updated });
}
