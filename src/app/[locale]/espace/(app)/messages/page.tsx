import { getTranslations, setRequestLocale } from "next-intl/server";

import { ChatThread } from "@/components/portal/chat-thread";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.messages"))("title") };
}

export default async function PortalMessagesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("portal.messages");
  return (
    <div className="flex h-[calc(100dvh-64px-4px-48px-72px)] min-h-[420px] flex-col sm:h-[calc(100dvh-180px)]">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-3 mt-1 text-[14px] text-gris">{t("hint")}</p>
      <ChatThread
        url="/api/portal/messages"
        side="candidate"
        className="card min-h-0 flex-1 p-3"
        labels={{ empty: t("empty"), placeholder: t("placeholder"), send: t("send"), failed: t("failed"), you: t("you") }}
      />
    </div>
  );
}
