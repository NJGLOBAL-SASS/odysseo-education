import type { Candidate, Partner, NewsletterSubscriber } from "@prisma/client";

import type { ExportColumn } from "./types";
import { APP_TIME_ZONE } from "@/lib/utils";
import { optionLabel } from "@/lib/intake-labels";
import { STATUS_LABELS_FR } from "@/components/dashboard/status-badge";

function formatDate(d: Date) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: APP_TIME_ZONE });
}

export type CandidateExportRow = Candidate & { partner?: { referralCode: string } | null };

export const candidateColumns: ExportColumn<CandidateExportRow>[] = [
  { key: "code", header: "Code", get: (c) => c.code, pdfWeight: 1.15 },
  { key: "createdAt", header: "Reçu le", get: (c) => formatDate(c.createdAt), pdfWeight: 1.25 },
  { key: "fullName", header: "Nom", get: (c) => c.fullName, pdfWeight: 1.8 },
  { key: "whatsapp", header: "WhatsApp", get: (c) => c.whatsapp, pdfWeight: 1.4 },
  { key: "email", header: "Email", get: (c) => c.email ?? "", pdfWeight: 2.1 },
  { key: "country", header: "Pays", get: (c) => c.country, pdfWeight: 1 },
  { key: "city", header: "Ville", get: (c) => c.city, pdfWeight: 0.9 },
  { key: "managedBy", header: "Géré par", get: (c) => optionLabel("managedBy", c.managedBy), pdfWeight: 0 },
  { key: "situation", header: "Situation", get: (c) => optionLabel("currentSituation", c.currentSituation), pdfWeight: 0 },
  { key: "highestDegree", header: "Diplôme", get: (c) => c.highestDegree, pdfWeight: 0 },
  { key: "targetLevel", header: "Niveau visé", get: (c) => optionLabel("targetLevel", c.targetLevel), pdfWeight: 1 },
  { key: "fieldOfStudy", header: "Domaine", get: (c) => c.fieldOfStudy, pdfWeight: 0 },
  { key: "fundingPlan", header: "Financement", get: (c) => optionLabel("fundingPlan", c.fundingPlan), pdfWeight: 0 },
  { key: "targetIntake", header: "Rentrée", get: (c) => optionLabel("targetIntake", c.targetIntake), pdfWeight: 0 },
  { key: "status", header: "Statut", get: (c) => STATUS_LABELS_FR[c.status] ?? c.status, pdfWeight: 1.1 },
  { key: "partner", header: "Partenaire", get: (c) => c.partner?.referralCode ?? "", pdfWeight: 1 },
  { key: "discovery", header: "Découvert via", get: (c) => optionLabel("discoverySource", c.discoverySource), pdfWeight: 0 },
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
