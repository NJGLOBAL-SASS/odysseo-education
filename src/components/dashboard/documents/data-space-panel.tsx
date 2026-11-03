"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, History } from "lucide-react";

import { cn } from "@/lib/utils";
import { DocumentsManager } from "./documents-manager";
import { DocumentActivityLog } from "./document-activity-log";
import type { CurrentUser } from "./types";

/** Espace « Données » : fichiers internes partagés par l'équipe + journal des accès. */
export function DataSpacePanel({ currentUser }: { currentUser: CurrentUser }) {
  const t = useTranslations("dashboard.documents");
  const [tab, setTab] = useState<"files" | "activity">("files");
  const [journalScope, setJournalScope] = useState<"internal" | "all">("internal");

  return (
    <div>
      <div className="mb-5">
        <p className="page-eyebrow">{t("space.eyebrow")}</p>
        <h1 className="page-title">{t("space.title")}</h1>
        <p className="mt-1 text-sm text-gris">{t("space.intro")}</p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-bord" role="tablist">
        {(["files", "activity"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === k ? "border-rouge text-noir" : "border-transparent text-gris hover:text-noir"
            )}
          >
            {k === "files" ? <FolderOpen className="h-4 w-4" /> : <History className="h-4 w-4" />}
            {t(`space.tabs.${k}`)}
          </button>
        ))}
      </div>

      {tab === "files" ? (
        <DocumentsManager scope="internal" currentUser={currentUser} withFilters />
      ) : (
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">{t("activity.title")}</h2>
            <div className="flex gap-1 rounded-full bg-fond p-1 text-xs font-semibold">
              {(["internal", "all"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setJournalScope(s)}
                  className={cn("rounded-full px-3 py-1.5", journalScope === s ? "bg-white text-noir shadow-sm" : "text-gris hover:text-noir")}
                >
                  {t(`space.journal.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <DocumentActivityLog key={journalScope} query={`scope=${journalScope}`} showCandidate={journalScope === "all"} />
        </section>
      )}
    </div>
  );
}
