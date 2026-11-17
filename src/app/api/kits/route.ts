import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kitSchema, slugify } from "@/lib/kits/rules";
import { uniqueSlug, verifyFlyer } from "@/lib/kits/server";

const createSchema = kitSchema.extend({ flyer: z.object({ url: z.string().url(), name: z.string().max(200) }).optional() });

/** Nouveau kit (brouillon ou prêt). Un kit « prêt » doit avoir un flyer. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = body.data;
  const flyer = d.flyer ? await verifyFlyer(d.flyer) : null;
  if (flyer && "error" in flyer) return NextResponse.json({ error: flyer.error }, { status: 400 });
  if (d.status === "pret" && !flyer) return NextResponse.json({ error: "flyerRequired" }, { status: 400 });
  const kit = await prisma.kit.create({
    data: {
      slug: await uniqueSlug(slugify(d.title)),
      title: d.title,
      template: d.template,
      qrPosition: d.qrPosition,
      status: d.status,
      createdByName: session.user.name || session.user.email || null,
      ...(flyer ?? {}),
    },
  });
  return NextResponse.json({ kit }, { status: 201 });
}
