import Image from "next/image";
import { Download, MessageCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { linkActive } from "@/lib/report/server";
import { ODYSSEO_WHATSAPP } from "@/lib/report/constants";
import { PdfPages } from "@/components/report/pdf-pages";
import { MarkRead } from "./mark-read";

export const dynamic = "force-dynamic";

const TEXT = {
  fr: {
    title: "Votre rapport d'admissibilité",
    file: "Dossier",
    valid: (d: string) => `Offre valable jusqu'au ${d}, sous réserve de places disponibles.`,
    download: "Télécharger le PDF",
    oui: "Répondre OUI sur WhatsApp",
    ouiText: (code: string) => `OUI, je souhaite ouvrir mon dossier (${code})`,
    question: "Une question ? Écrivez-nous sur WhatsApp, nous vous répondons rapidement.",
    loading: "Chargement du rapport…",
    error: "L'aperçu n'est pas disponible sur ce téléphone : utilisez « Télécharger le PDF ».",
    expiredTitle: "Ce lien n'est plus valable",
    expiredText: "Écrivez-nous sur WhatsApp : nous vous renvoyons votre rapport à jour.",
    contact: "Écrire à Odysseo sur WhatsApp",
    noPdf: "Votre rapport vous a été envoyé directement sur WhatsApp.",
  },
  en: {
    title: "Your eligibility report",
    file: "File",
    valid: (d: string) => `Offer valid until ${d}, subject to available places.`,
    download: "Download the PDF",
    oui: "Reply YES on WhatsApp",
    ouiText: (code: string) => `YES, I would like to open my file (${code})`,
    question: "Any question? Write to us on WhatsApp, we reply quickly.",
    loading: "Loading the report…",
    error: "The preview is not available on this phone: use “Download the PDF”.",
    expiredTitle: "This link is no longer valid",
    expiredText: "Write to us on WhatsApp: we will send you your updated report.",
    contact: "Write to Odysseo on WhatsApp",
    noPdf: "Your report was sent to you directly on WhatsApp.",
  },
};

const wa = (text: string) => `https://wa.me/${ODYSSEO_WHATSAPP}?text=${encodeURIComponent(text)}`;

export default async function ReportLinkPage({ params }: { params: { token: string } }) {
  const doc = /^[\w-]{32}$/.test(params.token)
    ? await prisma.reportDocument.findUnique({ where: { token: params.token }, include: { candidate: { select: { code: true, locale: true } } } })
    : null;
  const t = TEXT[doc?.candidate.locale === "en" ? "en" : "fr"];
  const active = Boolean(doc && doc.sentAt && linkActive(doc));

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Image src="/images/logo/logo-full-black-tight.png" alt="Odysseo Education" width={150} height={40} priority className="h-8 w-auto" />
        {doc && active && <span className="font-mono text-xs text-gris">{t.file} {doc.candidate.code}</span>}
      </header>

      {!doc || !active ? (
        <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-extrabold">{t.expiredTitle}</h1>
          <p className="mt-2 text-sm text-gris">{t.expiredText}</p>
          <a href={wa(doc ? doc.candidate.code : "Bonjour Odysseo")} className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#1FAF55] px-5 font-bold text-white">
            <MessageCircle className="h-5 w-5" /> {t.contact}
          </a>
        </section>
      ) : (
        <>
          <MarkRead token={params.token} />
          <h1 className="text-2xl font-extrabold leading-tight">{t.title}</h1>
          {doc.validUntil && (
            <p className="mt-1 text-sm text-gris">
              {t.valid(new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Douala" }).format(doc.validUntil))}
            </p>
          )}
          {doc.blobUrl ? (
            <>
              <a
                href={`/api/rapport/${params.token}/pdf?download`}
                className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-noir bg-white font-bold"
              >
                <Download className="h-5 w-5" /> {t.download}
              </a>
              <PdfPages src={`/api/rapport/${params.token}/pdf`} loadingLabel={t.loading} errorLabel={t.error} className="mt-4" />
            </>
          ) : (
            <p className="mt-4 rounded-2xl bg-white p-5 text-sm">{t.noPdf}</p>
          )}
          <p className="mt-4 text-center text-sm text-gris">{t.question}</p>
          <div className="fixed inset-x-0 bottom-0 border-t border-bord bg-white/95 p-3 backdrop-blur">
            <a
              href={wa(t.ouiText(doc.candidate.code))}
              className="mx-auto flex min-h-[52px] max-w-[720px] items-center justify-center gap-2 rounded-xl bg-[#1FAF55] font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" /> {t.oui}
            </a>
          </div>
        </>
      )}
    </main>
  );
}
