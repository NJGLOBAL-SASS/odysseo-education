import type { Candidate, Partner, NewsletterSubscriber } from "@prisma/client";

import type { ExportColumn } from "./types";
import { optionLabel } from "@/lib/intake-labels";
import { STATUS_LABELS_FR } from "@/components/dashboard/status-badge";

function formatDate(d: Date) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export type CandidateExportRow = Candidate & { partner?: { referralCode: string } | null };

export const candidateColumns: ExportColumn<CandidateExportRow>[] = [
  { key: "code", header: "Code", get: (c) => c.code },
  { key: "createdAt", header: "Reçu le", get: (c) => formatDate(c.createdAt) },
  { key: "fullName", header: "Nom", get: (c) => c.fullName },
  { key: "whatsapp", header: "WhatsApp", get: (c) => c.whatsapp },
  { key: "email", header: "Email", get: (c) => c.email ?? "" },
  { key: "country", header: "Pays", get: (c) => c.country },
  { key: "city", header: "Ville", get: (c) => c.city },
  { key: "managedBy", header: "Géré par", get: (c) => optionLabel("managedBy", c.managedBy) },
  { key: "situation", header: "Situation", get: (c) => optionLabel("currentSituation", c.currentSituation) },
  { key: "highestDegree", header: "Diplôme", get: (c) => c.highestDegree },
  { key: "targetLevel", header: "Niveau visé", get: (c) => optionLabel("targetLevel", c.targetLevel) },
  { key: "fieldOfStudy", header: "Domaine", get: (c) => c.fieldOfStudy },
  { key: "fundingPlan", header: "Financement", get: (c) => optionLabel("fundingPlan", c.fundingPlan) },
  { key: "targetIntake", header: "Rentrée", get: (c) => optionLabel("targetIntake", c.targetIntake) },
  { key: "status", header: "Statut", get: (c) => STATUS_LABELS_FR[c.status] ?? c.status },
  { key: "partner", header: "Partenaire", get: (c) => c.partner?.referralCode ?? "" },
  { key: "discovery", header: "Découvert via", get: (c) => optionLabel("discoverySource", c.discoverySource) },
];

export type PartnerExportRow = Partner & { _count?: { candidates: number } };

export const partnerColumns: ExportColumn<PartnerExportRow>[] = [
  { key: "fullName", header: "Nom", get: (p) => p.fullName },
  { key: "email", header: "Email", get: (p) => p.email },
  { key: "referralCode", header: "Code de parrainage", get: (p) => p.referralCode },
  { key: "candidates", header: "Dossiers apportés", get: (p) => String(p._count?.candidates ?? 0) },
  { key: "pointsBalance", header: "Points", get: (p) => String(p.pointsBalance) },
  { key: "status", header: "Statut", get: (p) => (p.status === "ACTIVE" ? "Actif" : "Suspendu") },
  { key: "createdAt", header: "Depuis le", get: (p) => formatDate(p.createdAt) },
];

export const newsletterColumns: ExportColumn<NewsletterSubscriber>[] = [
  { key: "email", header: "Email", get: (s) => s.email },
  { key: "locale", header: "Langue", get: (s) => s.locale.toUpperCase() },
  { key: "confirmed", header: "Confirmé", get: (s) => (s.confirmed ? "Oui" : "Non") },
  { key: "createdAt", header: "Inscrit le", get: (s) => formatDate(s.createdAt) },
];
