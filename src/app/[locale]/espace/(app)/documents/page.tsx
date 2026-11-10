import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal/session";
import { getOffer } from "@/lib/matching/catalogue";
import { reportOffers } from "@/lib/admission/server";
import { DocumentsPanel } from "@/components/portal/documents-panel";
import { ChecklistPanel } from "@/components/portal/checklist-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.documents"))("title") };
}

/** Documents : checklist du dossier (PACK-10) puis échanges libres avec l'équipe. */
export default async function PortalDocumentsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const session = await getPortalSession();
  if (!session) redirect(`/${params.locale}/espace/connexion`);
  const t = await getTranslations("portal.documents");
  const report = await prisma.admissionReport.findUnique({ where: { candidateId: session.candidateId }, select: { offers: true } });
  // Prochaine date limite parmi les offres du rapport.
  const today = new Date().toISOString().slice(0, 10);
  const deadline =
    reportOffers(report)
      .map((o) => getOffer(o.ref)?.date_limite)
      .filter((d): d is string => Boolean(d && d >= today))
      .sort()[0] ?? null;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-4 mt-1 text-[15px] text-gris">{t("intro")}</p>
      <ChecklistPanel code={session.candidate.code} deadline={deadline} />
      <DocumentsPanel />
    </div>
  );
}
