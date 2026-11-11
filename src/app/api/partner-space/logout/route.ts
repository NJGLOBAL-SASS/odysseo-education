import { NextResponse } from "next/server";

import { endPartnerSession } from "@/lib/partner-space/session";

export async function POST() {
  endPartnerSession();
  return NextResponse.json({ ok: true });
}
