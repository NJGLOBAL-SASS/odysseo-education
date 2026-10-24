import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { StatusUpdater } from "@/components/dashboard/status-updater";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-bord py-2 text-sm last:border-0">
      <span className="text-gris">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function CandidateDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { partner: true },
  });
  if (!candidate) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-gris">{candidate.code}</p>
          <h1 className="text-2xl font-extrabold">{candidate.fullName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost !min-h-[38px] text-sm"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <StatusUpdater
            candidateId={candidate.id}
            currentStatus={candidate.status}
            locale={params.locale}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-2 font-extrabold">Vous</h2>
          <Row label="WhatsApp" value={candidate.whatsapp} />
          <Row label="Né(e) le" value={new Intl.DateTimeFormat(params.locale).format(candidate.dateOfBirth)} />
          <Row label="Âge" value={candidate.age} />
          <Row label="Pays / Ville" value={`${candidate.country}, ${candidate.city}`} />
          <Row label="Géré par" value={candidate.managedBy} />
          <Row label="Tuteur" value={candidate.guardianName} />
          <Row label="Lien" value={candidate.guardianLink} />
          <Row label="WhatsApp tuteur" value={candidate.guardianWhatsapp} />
        </div>

        <div className="card p-5">
          <h2 className="mb-2 font-extrabold">Parcours</h2>
          <Row label="Situation" value={candidate.currentSituation} />
          <Row label="Diplôme" value={candidate.highestDegree} />
          <Row label="Année" value={candidate.degreeYear} />
          <Row label="Moyenne" value={candidate.degreeAverage} />
        </div>

        <div className="card p-5">
          <h2 className="mb-2 font-extrabold">Projet</h2>
          <Row label="Niveau visé" value={candidate.targetLevel} />
          <Row label="Domaine" value={candidate.fieldOfStudy} />
          <Row label="Passeport" value={candidate.passportStatus} />
          <Row label="Anglais" value={candidate.englishLevel} />
          <Row label="Financement" value={candidate.fundingPlan} />
          <Row label="Rentrée" value={candidate.targetIntake} />
        </div>

        <div className="card p-5">
          <h2 className="mb-2 font-extrabold">Source</h2>
          <Row label="Partenaire attribué" value={candidate.partner?.fullName} />
          <Row label="Code déclaré" value={candidate.referredByPartnerDeclared} />
          <Row label="Paramètre ?ref=" value={candidate.srcParam} />
          <Row label="Découvert via" value={candidate.discoverySource} />
          <Row label="Langue du formulaire" value={candidate.locale} />
          <Row
            label="Reçu le"
            value={new Intl.DateTimeFormat(params.locale, { dateStyle: "medium", timeStyle: "short" }).format(
              candidate.createdAt
            )}
          />
        </div>
      </div>
    </div>
  );
}
