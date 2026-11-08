import { getTranslations, setRequestLocale } from "next-intl/server";

import { DocumentsPanel } from "@/components/portal/documents-panel";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.documents"))("title") };
}

export default async function PortalDocumentsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("portal.documents");
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-4 mt-1 text-[15px] text-gris">{t("intro")}</p>
      <DocumentsPanel />
    </div>
  );
}
