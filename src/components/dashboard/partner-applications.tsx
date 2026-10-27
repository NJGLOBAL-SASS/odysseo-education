"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, X, Inbox, Mail, MessageCircle, MapPin, UserCheck, UserX, Clock } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useDashboardCounts } from "./dashboard-counts";

type Status = "PENDING" | "APPROVED" | "REJECTED";
type Application = {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  city: string;
  profile: string;
  motivation: string;
  status: Status;
  responseNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reviewedBy: { name: string | null; email: string } | null;
  partner: { referralCode: string } | null;
};

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

/** Onglet « Demandes » : examen des demandes de partenariat et réponse au demandeur (par email). */
export function PartnerApplications({ onPartnerCreated }: { onPartnerCreated: () => void }) {
  const t = useTranslations("dashboard.partners");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const toast = useToast();
  const { refresh: refreshCounts } = useDashboardCounts();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("PENDING");
  const [review, setReview] = useState<{ app: Application; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/partner-applications", { cache: "no-store" });
      if (res.ok) setApps((await res.json()).applications);
    } catch {
      setApps((a) => a ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f, apps ? (f === "ALL" ? apps.length : apps.filter((a) => a.status === f).length) : 0])
  );
  const visible = (apps ?? []).filter((a) => filter === "ALL" || a.status === filter);

  function openReview(app: Application, decision: "APPROVED" | "REJECTED") {
    const firstName = app.fullName.trim().split(/\s+/)[0] ?? "";
    setReview({ app, decision });
    setError("");
    setNote(t(decision === "APPROVED" ? "requests.dialog.acceptDefault" : "requests.dialog.rejectDefault", { firstName }));
  }

  async function submitReview() {
    if (!review) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/partner-applications/${review.app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: review.decision, note }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "alreadyPartner"
            ? t("requests.dialog.alreadyPartner")
            : json.error === "alreadyReviewed"
              ? t("requests.dialog.alreadyReviewed")
              : tc("error")
        );
        return;
      }
      toast({
        tone: json.emailSent ? "success" : "error",
        title: t(review.decision === "APPROVED" ? "requests.dialog.accepted" : "requests.dialog.rejected"),
        description: json.emailSent
          ? t("requests.dialog.emailSent", { email: review.app.email })
          : t("requests.dialog.emailFailed"),
      });
      if (review.decision === "APPROVED") onPartnerCreated();
      setReview(null);
      refreshCounts();
      await load();
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-brand bg-white p-1 shadow-card" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors",
              filter === f ? "bg-noir text-white" : "text-gris hover:bg-fond hover:text-noir"
            )}
          >
            {t(`requests.filter.${f}`)}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] tabular-nums",
                filter === f ? "bg-white/20" : f === "PENDING" && counts[f] ? "bg-rouge text-white" : "bg-fond"
              )}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {apps === null ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card space-y-3 p-5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card px-4 py-14 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-bord" />
          <p className="font-semibold">{filter === "PENDING" ? t("requests.emptyPending") : t("requests.empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visible.map((app) => (
            <li key={app.id} className="card flex flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{app.fullName}</p>
                  <p className="text-xs text-gris">{t("requests.receivedOn", { date: dateFmt.format(new Date(app.createdAt)) })}</p>
                </div>
                <span
                  className={cn(
                    "flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                    app.status === "PENDING" && "bg-[#FFF3D6] text-[#8A6200]",
                    app.status === "APPROVED" && "bg-[#E1F6EA] text-ok",
                    app.status === "REJECTED" && "bg-fond text-gris"
                  )}
                >
                  {app.status === "PENDING" ? <Clock className="h-3 w-3" /> : app.status === "APPROVED" ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                  {t(`requests.filter.${app.status}`)}
                </span>
              </div>

              <div className="mb-3 grid gap-1.5 text-sm sm:grid-cols-2">
                <a href={`mailto:${app.email}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4 flex-shrink-0 text-gris" /> <span className="truncate">{app.email}</span>
                </a>
                <a
                  href={`https://wa.me/${app.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <MessageCircle className="h-4 w-4 flex-shrink-0 text-[#1FAF55]" /> {app.whatsapp}
                </a>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gris" /> {app.country}, {app.city}
                </span>
                <span className="text-gris">
                  {t("requests.profile")} : <b className="font-semibold text-texte">{t(`profiles.${app.profile}`)}</b>
                </span>
              </div>

              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gris">{t("requests.motivation")}</p>
              <p className="mb-4 whitespace-pre-line rounded-[10px] bg-fond p-3 text-sm leading-relaxed">{app.motivation}</p>

              <div className="mt-auto">
                {app.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button onClick={() => openReview(app, "REJECTED")} className="btn-sm-ghost flex-1">
                      <X className="h-4 w-4" /> {t("requests.reject")}
                    </button>
                    <button onClick={() => openReview(app, "APPROVED")} className="btn-sm-dark flex-1">
                      <Check className="h-4 w-4" /> {t("requests.accept")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 border-t border-bord pt-3 text-xs text-gris">
                    <p>
                      {t("requests.reviewedBy", {
                        decision: t(`requests.filter.${app.status}`),
                        date: app.reviewedAt ? dateFmt.format(new Date(app.reviewedAt)) : "—",
                        name: app.reviewedBy?.name || app.reviewedBy?.email || "—",
                      })}
                    </p>
                    {app.partner && (
                      <p className="font-semibold text-ok">{t("requests.partnerCode", { code: app.partner.referralCode })}</p>
                    )}
                    {app.responseNote && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-noir">{t("requests.response")}</summary>
                        <p className="mt-1.5 whitespace-pre-line rounded-md bg-fond p-2.5 text-[13px] text-texte">{app.responseNote}</p>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {review && (
        <Dialog
          title={t(review.decision === "APPROVED" ? "requests.dialog.acceptTitle" : "requests.dialog.rejectTitle", {
            name: review.app.fullName,
          })}
          description={t(review.decision === "APPROVED" ? "requests.dialog.acceptHint" : "requests.dialog.rejectHint")}
          icon={review.decision === "APPROVED" ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
          tone={review.decision === "APPROVED" ? "success" : "danger"}
          onClose={() => setReview(null)}
          busy={busy}
          footer={
            <>
              <button onClick={() => setReview(null)} disabled={busy} className="btn-sm-ghost">
                {tc("cancel")}
              </button>
              <button
                onClick={submitReview}
                disabled={busy}
                className={review.decision === "APPROVED" ? "btn-sm-dark" : "btn-sm bg-erreur text-white hover:bg-rouge-fonce"}
              >
                {busy ? <Spinner /> : <Mail className="h-4 w-4" />}
                {t(review.decision === "APPROVED" ? "requests.dialog.confirmAccept" : "requests.dialog.confirmReject")}
              </button>
            </>
          }
        >
          <label className="mb-1.5 block text-sm font-semibold">{t("requests.dialog.message")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={7}
            maxLength={3000}
            disabled={busy}
            className="field-input resize-y text-sm leading-relaxed"
          />
          <p className="mt-1.5 text-xs text-gris">→ {review.app.email}</p>
          {error && <p className="mt-2 text-sm font-semibold text-erreur">{error}</p>}
        </Dialog>
      )}
    </div>
  );
}
