import { NextRequest, NextResponse } from "next/server";

import { markRead } from "@/lib/report/server";

/**
 * Ouverture du lien privé par l'étudiant → « Lu ». Appelé par le script de la page (les
 * robots d'aperçu de WhatsApp n'exécutent pas de JavaScript : l'aperçu ne compte pas).
 */
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  if (/^[\w-]{32}$/.test(params.token)) await markRead(params.token).catch((err) => console.error("[rapport] lu :", err));
  return NextResponse.json({ ok: true });
}
