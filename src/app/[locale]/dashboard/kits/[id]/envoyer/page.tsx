import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsapp, waLink } from "@/lib/kits/rules";
import { activePartners, partnerKitContent } from "@/lib/kits/server";
import { KitSender } from "@/components/dashboard/kit-sender";

export const dynamic = "force-dynamic";

/** ODY-14 §6.3 : envoi du kit aux partenaires actifs (WhatsApp, copie, annulation, suivi des ouvertures). */
export default async function SendKitPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("dashboard.kits");
  const kit = await prisma.kit.findUnique({
    where: { id: params.id },
    include: { sends: true, views: { select: { partnerId: true, type: true } } },
  });
  if (!kit) notFound();
  const partners = await activePartners();
  const sentAt = new Map(kit.sends.map((s) => [s.partnerId, s.sentAt.toISOString()]));
  const views = new Map<string, Set<string>>();
  for (const v of kit.views) views.set(v.partnerId, (views.get(v.partnerId) ?? new Set()).add(v.type));

  const rows = partners.map((p) => {
    const content = partnerKitContent(kit, p);
    const phone = normalizeWhatsapp(p.phone);
    return {
      id: p.id,
      name: p.fullName,
      code: p.referralCode,
      phone,
      message: content.message,
      wa: phone ? waLink(phone, content.message) : null,
      sentAt: sentAt.get(p.id) ?? null,
      viewed: views.get(p.id)?.has("page_ouverte") ?? false,
      downloaded: views.get(p.id)?.has("image_telechargee") ?? false,
    };
  });

  return (
    <div className="space-y-4">
      <Link href={`/dashboard/kits/${kit.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gris hover:text-noir">
        <ArrowLeft className="h-4 w-4" /> {kit.title}
      </Link>
      <h1 className="text-2xl font-extrabold">{t("sender.title", { title: kit.title })}</h1>
      {kit.status !== "pret" ? <p className="card p-5 text-sm text-gris">{t("sender.notReady")}</p> : <KitSender kitId={kit.id} rows={rows} />}
    </div>
  );
}
