"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eye, Pencil, Trash2, Upload, History } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { DocumentActivityView } from "./types";

const ICONS = {
  UPLOAD: Upload,
  VIEW: Eye,
  DOWNLOAD: Download,
  UPDATE: Pencil,
  DELETE_FILE: Trash2,
  DELETE_FOLDER: Trash2,
};

const TONES = {
  UPLOAD: "bg-[#E1F6EA] text-ok",
  VIEW: "bg-[#E3F0FF] text-[#0B5FA5]",
  DOWNLOAD: "bg-[#F1E6FF] text-[#6A2DBF]",
  UPDATE: "bg-[#FFF3D6] text-[#8A6200]",
  DELETE_FILE: "bg-erreur-fond text-erreur",
  DELETE_FOLDER: "bg-erreur-fond text-erreur",
};

/**
 * Journal des documents : qui a envoyé, ouvert, téléchargé, modifié ou supprimé quoi.
 * `query` : "candidateId=…" pour un dossier, "scope=internal" ou "scope=all".
 */
export function DocumentActivityLog({
  query,
  refreshKey,
  showCandidate,
  compact,
}: {
  query: string;
  refreshKey?: number;
  showCandidate?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("dashboard.documents.activity");
  const locale = useLocale();
  const [entries, setEntries] = useState<DocumentActivityView[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const fetchPage = useCallback(
    async (before?: string) => {
      const res = await fetch(`/api/documents/activity?${query}${before ? `&before=${encodeURIComponent(before)}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      return (await res.json()) as { entries: DocumentActivityView[]; hasMore: boolean };
    },
    [query]
  );

  useEffect(() => {
    let cancelled = false;
    fetchPage()
      .then((page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setHasMore(page.hasMore);
      })
      .catch(() => !cancelled && setEntries([]));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, refreshKey]);

  async function loadMore() {
    if (!entries?.length) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(entries[entries.length - 1]!.createdAt);
      setEntries([...entries, ...page.entries]);
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  if (entries === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-10 w-full rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gris">
        <History className="mx-auto mb-2 h-6 w-6 text-bord" />
        {t("empty")}
      </div>
    );
  }

  const visible = expanded ? entries : entries.slice(0, 8);

  return (
    <div>
      <ul className="space-y-2.5">
        {visible.map((e) => {
          const Icon = ICONS[e.action];
          return (
            <li key={e.id} className="flex items-start gap-2.5 text-sm">
              <span className={cn("mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full", TONES[e.action])}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">
                  <strong>{e.actorName ?? t("someone")}</strong> {t(`actions.${e.action}`)}{" "}
                  <span className="break-words font-medium">{e.fileName ?? e.folderTitle}</span>
                </span>
                <span className="block text-xs text-gris">
                  {dateTime.format(new Date(e.createdAt))}
                  {e.fileName && ` · ${e.folderTitle}`}
                  {showCandidate && e.candidate && (
                    <>
                      {" · "}
                      <Link href={`/dashboard/candidatures/${e.candidate.id}`} className="font-mono hover:text-noir hover:underline">
                        {e.candidate.code}
                      </Link>
                    </>
                  )}
                  {expanded && e.ip && ` · IP ${e.ip}`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {expanded && hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="btn-sm-ghost mt-4 w-full">
          {loadingMore && <Spinner />} {t("more")}
        </button>
      )}
      {!expanded && (entries.length > 8 || hasMore) && (
        <button onClick={() => setExpanded(true)} className="mt-3 text-xs font-semibold text-gris hover:text-noir">
          {t("showAll")}
        </button>
      )}
    </div>
  );
}
