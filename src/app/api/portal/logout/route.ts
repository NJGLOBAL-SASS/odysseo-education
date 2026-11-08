import type { NextRequest } from "next/server";

import { json, onPortalHost } from "@/lib/portal/guard";
import { endPortalSession } from "@/lib/portal/session";

export async function POST(req: NextRequest) {
  if (!onPortalHost(req)) return json({ error: "notFound" }, 404);
  endPortalSession();
  return json({ ok: true });
}
