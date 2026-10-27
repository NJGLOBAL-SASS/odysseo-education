import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDashboardCounts } from "@/lib/dashboard-counts";

/** Compteurs de la sidebar : nouveautés depuis la dernière visite de chaque section. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  return NextResponse.json(await getDashboardCounts(session.user.id));
}
