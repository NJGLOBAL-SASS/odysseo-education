import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Send } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/referral";
import type { QrPosition } from "@/lib/kits/rules";
import { KitEditor } from "@/components/dashboard/kit-editor";

export const dynamic = "force-dynamic";

export default async function EditKitPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("dashboard.kits");
  const kit = await prisma.kit.findUnique({ where: { id: params.id } });
  if (!kit) notFound();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/kits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gris hover:text-noir">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>
        {kit.status === "pret" && (
          <Link href={`/dashboard/kits/${kit.id}/envoyer`} className="btn-sm-dark">
            <Send className="h-4 w-4" /> {t("send")}
          </Link>
        )}
      </div>
      <h1 className="text-2xl font-extrabold">{t("editor.editTitle")}</h1>
      <KitEditor
        siteUrl={publicSiteUrl()}
        kit={{
          id: kit.id,
          slug: kit.slug,
          title: kit.title,
          template: kit.template,
          qrPosition: kit.qrPosition as QrPosition,
          status: kit.status,
          hasImage: Boolean(kit.imageUrl),
          imageVersion: kit.imageVersion,
        }}
      />
    </div>
  );
}
