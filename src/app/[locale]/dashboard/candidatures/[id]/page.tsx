import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Link2, PenLine, Globe, Mail, Smartphone, BellRing } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { optionLabel } from "@/lib/intake-labels";
import { StatusUpdater } from "@/components/dashboard/status-updater";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { InternalNotes } from "@/components/dashboard/internal-notes";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-bord py-2.5 text-sm last:border-0">
      <dt className="text-gris">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="section-title mb-2">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

const CHANNEL_ICONS = { EMAIL: Mail, WHATSAPP: Smartphone, PUSH: BellRing };
const LOG_STATUS = {
  SENT: "bg-[#E1F6EA] text-ok",
  SKIPPED: "bg-fond text-gris",
  FAILED: "bg-erreur-fond text-erreur",
  PENDING: "bg-[#FFF3D6] text-[#8A6200]",
};
const LOG_LABEL = { SENT: "Envoyé", SKIPPED: "Non envoyé", FAILED: "Échec", PENDING: "En attente" };
const POINTS_REASON: Record<string, string> = {
  NEW_LEAD: "Nouveau dossier",
  QUALIFIED_LEAD: "Dossier qualifié",
  ENROLLED: "Étudiant admis",
  MANUAL_ADJUSTMENT: "Ajustement manuel",
};

export default async function CandidateDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      partner: true,
      notificationLogs: { orderBy: { createdAt: "desc" } },
      pointsLedgerEntries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!candidate) notFound();

  const L = params.locale;
  const dateTime = new Intl.DateTimeFormat(L, { dateStyle: "medium", timeStyle: "short" });
  const viaLink =
    Boolean(candidate.partner) && candidate.srcParam?.toUpperCase() === candidate.partner?.referralCode;

  return (
    <div>
      <Link
        href="/dashboard/candidatures"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gris hover:text-noir"
      >
        <ArrowLeft className="h-4 w-4" /> Candidatures
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-eyebrow font-mono !normal-case !tracking-normal">{candidate.code}</p>
          <h1 className="page-title">{candidate.fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gris">
            <StatusBadge status={candidate.status} locale={L} />
            <span>
              {candidate.country}, {candidate.city} · reçu le {dateTime.format(candidate.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sm bg-[#1FAF55] text-white hover:bg-[#1A9A4A]"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          {candidate.email && (
            <a
              href={`mailto:${candidate.email}?subject=${encodeURIComponent(`Votre dossier Odysseo ${candidate.code}`)}`}
              className="btn-sm-ghost"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          )}
          <StatusUpdater candidateId={candidate.id} currentStatus={candidate.status} locale={L} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 md:grid-cols-2 lg:col-span-2">
          <Section title="Vous">
            <Row label="WhatsApp" value={candidate.whatsapp} />
            <Row label="Email" value={candidate.email ?? "Non renseigné (dossier antérieur)"} />
            <Row label="Date de naissance" value={new Intl.DateTimeFormat(L).format(candidate.dateOfBirth)} />
            <Row label="Âge" value={candidate.age != null ? `${candidate.age} ans` : null} />
            <Row label="Pays" value={candidate.country} />
            <Row label="Ville" value={candidate.city} />
            <Row label="Qui gère et finance le projet" value={optionLabel("managedBy", candidate.managedBy, L)} />
            <Row label="Parent / tuteur" value={candidate.guardianName} />
            <Row label="Lien avec le candidat" value={optionLabel("guardianLink", candidate.guardianLink, L)} />
            <Row label="WhatsApp du parent / tuteur" value={candidate.guardianWhatsapp} />
          </Section>

          <Section title="Parcours">
            <Row label="Situation actuelle" value={optionLabel("currentSituation", candidate.currentSituation, L)} />
            <Row label="Plus haut diplôme" value={candidate.highestDegree} />
            <Row label="Année d'obtention" value={candidate.degreeYear} />
            <Row label="Moyenne" value={candidate.degreeAverage} />
          </Section>

          <Section title="Projet">
            <Row label="Niveau visé" value={optionLabel("targetLevel", candidate.targetLevel, L)} />
            <Row label="Domaine d'études" value={candidate.fieldOfStudy} />
            <Row label="Passeport" value={optionLabel("passportStatus", candidate.passportStatus, L)} />
            <Row label="Parle anglais" value={optionLabel("englishLevel", candidate.englishLevel, L)} />
            <Row label="Financement" value={optionLabel("fundingPlan", candidate.fundingPlan, L)} />
            <Row label="Rentrée visée" value={optionLabel("targetIntake", candidate.targetIntake, L)} />
          </Section>

          <Section title="Provenance">
            {candidate.partner ? (
              <div className="mb-2 flex items-start gap-3 rounded-[10px] bg-fond p-3">
                {viaLink ? (
                  <Link2 className="mt-0.5 h-4 w-4 text-rouge" />
                ) : (
                  <PenLine className="mt-0.5 h-4 w-4 text-gris" />
                )}
                <div className="text-sm">
                  <p className="font-semibold">{candidate.partner.fullName}</p>
                  <p className="text-xs text-gris">
                    <span className="font-mono">{candidate.partner.referralCode}</span> ·{" "}
                    {viaLink ? "attribué via son lien de parrainage" : "code saisi par le candidat"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-2 flex items-center gap-3 rounded-[10px] bg-fond p-3 text-sm">
                <Globe className="h-4 w-4 text-gris" /> Arrivée directe (aucun partenaire)
              </div>
            )}
            <Row
              label="Code tapé par le candidat"
              value={!viaLink ? candidate.referredByPartnerDeclared : null}
            />
            <Row label="Nous a connus via" value={optionLabel("discoverySource", candidate.discoverySource, L)} />
            <Row label="Langue du formulaire" value={candidate.locale === "en" ? "Anglais" : "Français"} />
            <Row
              label="Durée de remplissage"
              value={
                candidate.submissionDurationSec
                  ? `${Math.floor(candidate.submissionDurationSec / 60)} min ${candidate.submissionDurationSec % 60} s`
                  : null
              }
            />
          </Section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title mb-1">Notes internes</h2>
            <p className="mb-3 text-xs text-gris">Visibles uniquement par l&apos;équipe.</p>
            <InternalNotes candidateId={candidate.id} initial={candidate.internalNotes ?? ""} />
          </section>

          {candidate.pointsLedgerEntries.length > 0 && (
            <section className="card p-5">
              <h2 className="section-title mb-3">Points partenaire générés</h2>
              <ul className="space-y-2 text-sm">
                {candidate.pointsLedgerEntries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3">
                    <span>
                      {POINTS_REASON[e.reason] ?? e.reason}
                      <span className="block text-xs text-gris">{dateTime.format(e.createdAt)}</span>
                    </span>
                    <span className="font-bold tabular-nums text-ok">+{e.points}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <h2 className="section-title mb-3">Alertes envoyées à l&apos;équipe</h2>
            {candidate.notificationLogs.length === 0 ? (
              <p className="text-sm text-gris">Aucune alerte journalisée.</p>
            ) : (
              <ul className="space-y-2.5">
                {candidate.notificationLogs.map((log) => {
                  const Icon = CHANNEL_ICONS[log.channel];
                  return (
                    <li key={log.id} className="flex items-start gap-2.5 text-sm" title={log.error ?? undefined}>
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gris" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{log.recipient}</span>
                        {log.error && <span className="block truncate text-xs text-gris">{log.error}</span>}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LOG_STATUS[log.status]}`}>
                        {LOG_LABEL[log.status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
