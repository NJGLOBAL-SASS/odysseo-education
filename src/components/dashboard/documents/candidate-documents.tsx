"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DocumentsManager } from "./documents-manager";
import { DocumentActivityLog } from "./document-activity-log";
import type { CurrentUser } from "./types";

/** Section « Documents du dossier » de la fiche candidat, avec son journal d'accès. */
export function CandidateDocuments({ candidateId, currentUser }: { candidateId: string; currentUser: CurrentUser }) {
  const t = useTranslations("dashboard.documents");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <section className="card p-5 md:col-span-2">
        <h2 className="section-title mb-1">{t("candidateTitle")}</h2>
        <p className="mb-4 text-xs text-gris">{t("candidateHint")}</p>
        <DocumentsManager
          scope="candidate"
          candidateId={candidateId}
          currentUser={currentUser}
          onActivity={() => setRefreshKey((k) => k + 1)}
        />
      </section>
      <section className="card p-5 md:col-span-2">
        <h2 className="section-title mb-3">{t("activity.title")}</h2>
        <DocumentActivityLog query={`candidateId=${candidateId}`} refreshKey={refreshKey} compact />
      </section>
    </>
  );
}
