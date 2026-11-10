"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, X, Inbox, Mail, MessageCircle, MapPin, UserCheck, UserX, Clock, Pencil, Download } from "lucide-react";

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
  // PACK-11
  firstName: string | null;
  lastName: string | null;
  idType: string | null;
  idNumber: string | null;
  networks: string | null;
  estimate: string | null;
  payoutMethod: string | null;
  payoutNumber: string | null;
  locale: string;
  partner: {
    id: string;
    referralCode: string;
    contractStatus: string;
    contracts: { id: string; number: string; version: string; sentAt: string; signedAt: string | null; tokenExpiresAt: string | null }[];
  } | null;
  statusEvents: { toStatus: string; actorName: string; createdAt: string; note: string | null }[];
};

/** Statut affiché (PACK-11) : demande reçue / refusée, puis statut du contrat du partenaire. */
function displayStatus(app: Application) {
  if (app.status === "PENDING") return "demande_recue";
  if (app.status === "REJECTED") return "refusee";
  return app.partner?.contractStatus ?? "actif";
}

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
  const tk = useTranslations("dashboard.partners.contract");
  const [latestVersion, setLatestVersion] = useState("");
  // Lien de signature en clair : connu seulement juste après l'envoi (seul son hachage est stocké).
  const [links, setLinks] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Application | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/partner-applications", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setApps(json.applications);
        setLatestVersion(json.latestVersion);
      }
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
        body: JSON.stringify({ action: review.decision === "APPROVED" ? "confirm" : "reject", note }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "signatureMissing"
            ? tk("signatureMissing")
            : json.error === "alreadyPartner"
              ? t("requests.dialog.alreadyPartner")
              : json.error === "alreadyReviewed"
                ? t("requests.dialog.alreadyReviewed")
                : tc("error")
        );
        return;
      }
      if (json.link) setLinks((l) => ({ ...l, [review.app.id]: json.link }));
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
                  {tk(`status.${displayStatus(app) as "actif"}`)}
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

              {(app.idType || app.payoutMethod) && (
                <dl className="mb-3 grid gap-1 rounded-[10px] bg-fond p-3 text-sm sm:grid-cols-2">
                  {app.idType && (
                    <div>
                      <dt className="text-xs text-gris">{tk("idDoc")}</dt>
                      <dd className="font-semibold">
                        {app.idType} · {app.idNumber}
                      </dd>
                    </div>
                  )}
                  {app.payoutMethod && (
                    <div>
                      <dt className="text-xs text-gris">{tk("payout")}</dt>
                      <dd className="font-semibold">
                        {app.payoutMethod} · {app.payoutNumber}
                      </dd>
                    </div>
                  )}
                  {app.networks && (
                    <div>
                      <dt className="text-xs text-gris">{tk("networks")}</dt>
                      <dd className="break-all">{app.networks}</dd>
                    </div>
                  )}
                  {app.estimate && (
                    <div>
                      <dt className="text-xs text-gris">{tk("estimate")}</dt>
                      <dd>{app.estimate}</dd>
                    </div>
                  )}
                </dl>
              )}
              {app.motivation && (
                <>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gris">{t("requests.motivation")}</p>
                  <p className="mb-4 whitespace-pre-line rounded-[10px] bg-fond p-3 text-sm leading-relaxed">{app.motivation}</p>
                </>
              )}

              <div className="mt-auto">
                {app.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openReview(app, "REJECTED")} className="btn-sm-ghost flex-1">
                      <X className="h-4 w-4" /> {t("requests.reject")}
                    </button>
                    {app.firstName && (
                      <button onClick={() => setEditing(app)} className="btn-sm-ghost flex-1">
                        <Pencil className="h-4 w-4" /> {tk("edit")}
                      </button>
                    )}
                    <button onClick={() => openReview(app, "APPROVED")} className="btn-sm-dark w-full">
                      <Check className="h-4 w-4" /> {app.firstName ? tk("confirm") : t("requests.accept")}
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
                    {app.partner && (
                      <ContractActions
                        app={app}
                        link={links[app.id]}
                        latestVersion={latestVersion}
                        onLink={(link) => setLinks((l) => ({ ...l, [app.id]: link }))}
                        onChanged={load}
                      />
                    )}
                    {app.statusEvents.length > 0 && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-noir">{tk("history")}</summary>
                        <ul className="mt-1.5 space-y-0.5">
                          {app.statusEvents.map((e, i) => (
                            <li key={i}>
                              {dateFmt.format(new Date(e.createdAt))} · {tk(`status.${e.toStatus as "actif"}`)} · {e.actorName}
                              {e.note ? ` · ${e.note}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
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
          description={review.decision === "APPROVED" ? tk("confirmHint") : t("requests.dialog.rejectHint")}
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

      {editing && (
        <EditApplication
          app={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/** Après confirmation : renvoyer le lien, ouvrir WhatsApp, télécharger le contrat signé, nouvelle version. */
function ContractActions({
  app,
  link,
  latestVersion,
  onLink,
  onChanged,
}: {
  app: Application;
  link?: string;
  latestVersion: string;
  onLink: (link: string) => void;
  onChanged: () => Promise<void>;
}) {
  const tk = useTranslations("dashboard.partners.contract");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const partner = app.partner!;
  const signed = partner.contracts.find((c) => c.signedAt);
  const pending = ["contrat_envoye", "lien_expire"].includes(partner.contractStatus);
  const firstName = app.firstName || app.fullName.split(/\s+/)[0];

  async function run(url: string, init: RequestInit, done: (json: { number?: string }) => string) {
    setBusy(true);
    const res = await fetch(url, init).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      toast({ tone: "error", title: json.error === "signatureMissing" ? tk("signatureMissing") : tc("error") });
      return;
    }
    if (json.link) onLink(json.link);
    toast({ tone: "success", title: done(json) });
    await onChanged();
  }

  return (
    <div className="space-y-2 pt-1">
      {signed && (
        <p className="text-noir">
          {tk("contract")} {signed.number} · {tk("signedOn", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(signed.signedAt!)), version: signed.version })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {pending && (
          <button
            disabled={busy}
            onClick={() => run(`/api/partner-applications/${app.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend" }) }, () => tk("linkRenewed"))}
            className="btn-sm-ghost"
          >
            {busy && <Spinner />} {tk("resend")}
          </button>
        )}
        {link && (
          <>
            <a
              href={`https://wa.me/${app.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(tk("waMessage", { firstName, link }))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sm bg-[#1FAF55] text-white"
            >
              <MessageCircle className="h-4 w-4" /> {tk("openWhatsapp")}
            </a>
            <button onClick={() => navigator.clipboard.writeText(link).catch(() => undefined)} className="btn-sm-ghost">
              {tk("copyLink")}
            </button>
          </>
        )}
        {signed && (
          <a href={`/api/partner-contracts/${signed.id}`} className="btn-sm-dark">
            <Download className="h-4 w-4" /> {tk("downloadSigned")}
          </a>
        )}
      </div>
      {signed && latestVersion && signed.version !== latestVersion && (
        <div className="rounded-md bg-[#FFF3D6] p-2 text-[#8A6200]">
          <p>{tk("newVersion", { current: signed.version, latest: latestVersion })}</p>
          <button disabled={busy} onClick={() => run(`/api/partners/${partner.id}/contract`, { method: "POST" }, (j) => tk("contractSent", { number: j.number ?? "", days: 14 }))} className="btn-sm-ghost mt-1.5">
            {tk("requestNewVersion")}
          </button>
        </div>
      )}
    </div>
  );
}

const EDIT_FIELDS = ["firstName", "lastName", "email", "whatsapp", "country", "city", "idType", "idNumber", "payoutMethod", "payoutNumber"] as const;

/** Corriger une faute dans la demande, avant confirmation uniquement. */
function EditApplication({ app, onClose, onSaved }: { app: Application; onClose: () => void; onSaved: () => Promise<void> }) {
  const tk = useTranslations("dashboard.partners.contract");
  const tc = useTranslations("dashboard.common");
  const ta = useTranslations("partnerApply");
  const LABELS: Record<(typeof EDIT_FIELDS)[number], string> = {
    firstName: ta("v2.firstName"),
    lastName: ta("v2.lastName"),
    email: ta("email"),
    whatsapp: ta("whatsapp"),
    country: ta("country"),
    city: ta("city"),
    idType: ta("v2.idType"),
    idNumber: ta("v2.idNumber"),
    payoutMethod: ta("v2.payoutMethod"),
    payoutNumber: ta("v2.payoutNumber"),
  };
  const [values, setValues] = useState<Record<(typeof EDIT_FIELDS)[number], string>>(
    Object.fromEntries(EDIT_FIELDS.map((k) => [k, (app[k] as string | null) ?? ""])) as Record<(typeof EDIT_FIELDS)[number], string>,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/partner-applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", data: values }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(tc("error"));
    await onSaved();
  }
  return (
    <Dialog
      title={`${tk("edit")} — ${app.fullName}`}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-sm-ghost">
            {tk("cancel")}
          </button>
          <button onClick={save} disabled={busy} className="btn-sm-dark">
            {busy && <Spinner />} {tk("save")}
          </button>
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {EDIT_FIELDS.map((k) => (
          <label key={k} className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-gris">{LABELS[k]}</span>
            <input value={values[k]} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} className="field-input !min-h-[38px] text-sm" />
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-erreur">{error}</p>}
    </Dialog>
  );
}
