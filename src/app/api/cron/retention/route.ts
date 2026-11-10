import { NextRequest, NextResponse } from "next/server";

import { dossiersToPurge, RETENTION_MONTHS } from "@/lib/admission/retention";
import { notifyRetentionList } from "@/lib/notifications";

/**
 * Tâche planifiée mensuelle (vercel.json) : liste les dossiers terminés depuis plus de 12 mois
 * qui ont encore des documents, et l'envoie par e-mail à l'équipe. Rien n'est supprimé ici :
 * la suppression se fait depuis la fiche dossier, par un administrateur.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const list = await dossiersToPurge();
  if (list.length > 0) await notifyRetentionList(list, RETENTION_MONTHS);
  return NextResponse.json({ ok: true, count: list.length });
}
