import { NextRequest, NextResponse } from "next/server";

import { findPartnerByCode } from "@/lib/points";
import { shortPartnerName } from "@/lib/referral";

/**
 * Public : vérifie un code de parrainage reçu via le lien, pour que le
 * formulaire affiche "Recommandé par Audrey K." et pré-remplisse le champ.
 * Ne renvoie jamais l'email / le téléphone du partenaire.
 */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const partner = await findPartnerByCode(decodeURIComponent(params.code));
  if (!partner) return NextResponse.json({ valid: false });

  return NextResponse.json({
    valid: true,
    code: partner.referralCode,
    partnerName: shortPartnerName(partner.fullName),
  });
}
