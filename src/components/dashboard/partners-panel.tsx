"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Copy,
  Check,
  Plus,
  QrCode,
  X,
  ExternalLink,
  MailCheck,
  MailX,
  Handshake,
  Share2,
  Pencil,
  Trash2,
  Inbox,
} from "lucide-react";
import QRCode from "qrcode";

import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { partnerColumns, type PartnerExportRow } from "@/lib/export/columns";
import { referralLink, publicSiteUrl } from "@/lib/referral";
import { cn } from "@/lib/utils";
import { PartnerApplications } from "./partner-applications";
import { useDashboardCounts } from "./dashboard-counts";

type Row = PartnerExportRow & { linkClicks?: number };

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy(key: string, text: string) {
      navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    },
  };
}

/** Carte du lien de parrainage : lien, copie, QR code téléchargeable, partage. */
function ReferralLinkCard({ partner, onClose }: { partner: Row; onClose: () => void }) {
  const t = useTranslations("dashboard.partners.link");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const link = referralLink(partner.referralCode);
  const { copied, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    setQr(null);
    QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: "#0B0B0D", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => {});
  }, [link]);

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="flex-shrink-0">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR code ${partner.referralCode}`} className="h-36 w-36 rounded-[10px] border border-bord" />
        ) : (
          <div className="skeleton h-36 w-36 rounded-[10px]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">{partner.fullName}</p>
            <p className="font-mono text-sm text-gris">{partner.referralCode}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gris hover:bg-fond hover:text-noir" aria-label={tc("close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={link}
            className="field-input !min-h-[40px] min-w-0 flex-1 font-mono !text-sm"
            onFocus={(e) => e.target.select()}
          />
          <button onClick={() => copy("card", link)} className="btn-sm-dark flex-shrink-0">
            {copied === "card" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied === "card" ? tc("copied") : tc("copy")}</span>
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            onClick={() =>
              window.open(`https://wa.me/?text=${encodeURIComponent(t("shareText", { link }))}`, "_blank", "noopener")
            }
            className="btn-sm-ghost"
          >
            <Share2 className="h-4 w-4" /> {t("shareWhatsApp")}
          </button>
          {qr && (
            <a href={qr} download={`odysseo-qr-${partner.referralCode}.png`} className="btn-sm-ghost">
              <QrCode className="h-4 w-4" /> {t("downloadQr")}
            </a>
          )}
          <a
            href={`${publicSiteUrl()}/${locale}/espace-partenaire/${partner.referralCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sm-ghost"
          >
            <ExternalLink className="h-4 w-4" /> {t("portal")}
          </a>
        </div>
        <p className="mt-3 text-xs text-gris">{t("hint")}</p>
      </div>
    </div>
  );
}

/** Modification d'un partenaire : nom, email, WhatsApp, statut (le code reste figé). */
function EditPartnerDialog({ partner, onClose, onSaved }: { partner: Row; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("dashboard.partners");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const [fullName, setFullName] = useState(partner.fullName);
  const [email, setEmail] = useState(partner.email);
  const [phone, setPhone] = useState(partner.phone ?? "");
  const [status, setStatus] = useState(partner.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error === "emailTaken" ? t("edit.emailTaken") : json.error === "invalid" ? tc("invalidEmail") : tc("error"));
        return;
      }
      toast({ tone: "success", title: t("edit.saved") });
      onSaved();
      onClose();
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={t("edit.title")}
      description={t("edit.codeLocked", { code: partner.referralCode })}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-sm-ghost">
            {tc("cancel")}
          </button>
          <button onClick={() => save()} disabled={busy} className="btn-sm-dark">
            {busy && <Spinner />} {busy ? tc("saving") : tc("save")}
          </button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-3 pb-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("columns.name")}</span>
          <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input !min-h-[42px] text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input !min-h-[42px] text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">WhatsApp</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input !min-h-[42px] text-sm" />
        </label>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">{t("edit.status")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["ACTIVE", "SUSPENDED"] as const).map((s) => (
              <label
                key={s}
                className={cn(
                  "cursor-pointer rounded-[10px] border-[1.5px] p-3 text-sm",
                  status === s ? "border-noir bg-fond" : "border-bord"
                )}
              >
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                <span className="block font-semibold">{s === "ACTIVE" ? tc("active") : tc("suspended")}</span>
                <span className="text-xs text-gris">{s === "ACTIVE" ? t("edit.active") : t("edit.suspended")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm font-semibold text-erreur">{error}</p>}
      </form>
    </Dialog>
  );
}

export function PartnersPanel({ isAdmin, initialTab = "partners" }: { isAdmin: boolean; initialTab?: "partners" | "requests" }) {
  const t = useTranslations("dashboard.partners");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const { counts } = useDashboardCounts();
  const { data: partners, loading, isOffline, cachedAt, refresh } = useOfflineDataset<Row>("partenaires", "/api/partners", "partners");

  const [tab, setTab] = useState<"partners" | "requests">(initialTab);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ partner: Row; emailSent: boolean } | null>(null);
  const [linkFor, setLinkFor] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { copied, copy } = useCopy();

  function switchTab(next: "partners" | "requests") {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "requests") url.searchParams.set("onglet", "demandes");
    else url.searchParams.delete("onglet");
    window.history.replaceState(null, "", url);
  }

  async function addPartner(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || t("form.failed"));
        return;
      }
      setCreated({ partner: json.partner, emailSent: Boolean(json.welcomeEmailSent) });
      setLinkFor(null);
      setFullName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      toast({ tone: "success", title: t("form.created"), description: t("form.createdCode", { code: json.partner.referralCode }) });
      refresh();
    } catch {
      setFormError(t("form.network"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/partners/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ tone: "success", title: t("delete.done"), description: deleting.fullName });
      if (linkFor?.id === deleting.id) setLinkFor(null);
      setDeleting(null);
      refresh();
    } catch {
      toast({ tone: "error", title: tc("error"), description: tc("retry") });
    } finally {
      setDeleteBusy(false);
    }
  }

  const totals = partners.reduce(
    (acc, p) => ({
      clicks: acc.clicks + (p.linkClicks ?? 0),
      candidates: acc.candidates + (p._count?.candidates ?? 0),
      points: acc.points + p.pointsBalance,
    }),
    { clicks: 0, candidates: 0, points: 0 }
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">{t("eyebrow")}</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="mt-1 text-sm text-gris">{t("intro")}</p>
        </div>
        {tab === "partners" && (
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons resource="partenaires" isOffline={isOffline} offlineRows={partners} offlineColumns={partnerColumns} />
            <button
              onClick={() => setShowForm((v) => !v)}
              disabled={isOffline}
              title={isOffline ? tc("offlineUnavailable") : undefined}
              className="btn-sm-primary"
            >
              <Plus className="h-4 w-4" /> {t("add")}
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b border-bord" role="tablist">
        {(["partners", "requests"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => switchTab(k)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === k ? "border-rouge text-noir" : "border-transparent text-gris hover:text-noir"
            )}
          >
            {k === "partners" ? <Handshake className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
            {t(`tabs.${k}`)}
            {k === "requests" && counts.partnerRequests > 0 && (
              <span className="rounded-full bg-rouge px-1.5 text-[11px] font-bold tabular-nums text-white">
                {counts.partnerRequests}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "requests" ? (
        <PartnerApplications onPartnerCreated={refresh} />
      ) : (
        <>
          {isOffline && <OfflineBanner cachedAt={cachedAt} />}

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: t("kpi.partners"), value: partners.length },
              { label: t("kpi.clicks"), value: totals.clicks },
              { label: t("kpi.files"), value: totals.candidates },
              { label: t("kpi.points"), value: totals.points },
            ].map((k) => (
              <div key={k.label} className="card px-4 py-3.5">
                {loading ? <div className="skeleton mb-1 h-7 w-12" /> : <p className="text-2xl font-extrabold tabular-nums">{k.value}</p>}
                <p className="text-xs font-medium text-gris">{k.label}</p>
              </div>
            ))}
          </div>

          {showForm && (
            <form onSubmit={addPartner} className="card mb-6 animate-fade-up p-5">
              <h2 className="section-title mb-1">{t("form.title")}</h2>
              <p className="mb-4 text-xs text-gris">{t("form.hint")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input required minLength={2} placeholder={t("form.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} className="field-input !min-h-[42px] text-sm" />
                <input required type="email" placeholder={t("form.email")} value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} className="field-input !min-h-[42px] text-sm" />
                <input type="tel" placeholder={t("form.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} className="field-input !min-h-[42px] text-sm" />
              </div>
              {formError && <p className="mt-3 text-sm font-semibold text-erreur">{formError}</p>}
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="btn-sm-ghost">
                  {tc("cancel")}
                </button>
                <button type="submit" disabled={saving} className="btn-sm-dark">
                  {saving && <Spinner />}
                  {saving ? t("form.creating") : t("form.submit")}
                </button>
              </div>
            </form>
          )}

          {created && (
            <div className="card mb-6 animate-fade-up border-l-[3px] border-l-ok p-5">
              <p className={`mb-4 flex items-center gap-2 text-sm font-semibold ${created.emailSent ? "text-ok" : "text-[#8A6200]"}`}>
                {created.emailSent ? <MailCheck className="h-4 w-4" /> : <MailX className="h-4 w-4" />}
                {created.emailSent ? t("emailSent", { email: created.partner.email }) : t("emailNotSent")}
              </p>
              <ReferralLinkCard partner={created.partner} onClose={() => setCreated(null)} />
            </div>
          )}

          {linkFor && !created && (
            <div className="card mb-6 animate-fade-up p-5">
              <ReferralLinkCard partner={linkFor} onClose={() => setLinkFor(null)} />
            </div>
          )}

          {loading ? (
            <SkeletonTable cols={6} />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t("columns.name")}</th>
                    <th className="px-4 py-3">{t("columns.code")}</th>
                    <th className="px-4 py-3 text-right">{t("columns.clicks")}</th>
                    <th className="px-4 py-3 text-right">{t("columns.candidates")}</th>
                    <th className="px-4 py-3 text-right">{t("columns.conversion")}</th>
                    <th className="px-4 py-3 text-right">{t("columns.points")}</th>
                    <th className="px-4 py-3">{t("columns.status")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-bord">
                  {partners.map((p) => {
                    const clicks = p.linkClicks ?? 0;
                    const count = p._count?.candidates ?? 0;
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-fond">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{p.fullName}</p>
                          <p className="text-xs text-gris">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{p.referralCode}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{clicks}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{count}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gris">
                          {clicks > 0 ? `${Math.round((count / clicks) * 100)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{p.pointsBalance}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              p.status === "ACTIVE" ? "bg-[#E1F6EA] text-ok" : "bg-fond text-gris"
                            }`}
                          >
                            {p.status === "ACTIVE" ? tc("active") : tc("suspended")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => copy(p.id, referralLink(p.referralCode))}
                              disabled={isOffline}
                              className="btn-sm-ghost !min-h-[32px] !px-2.5 text-xs"
                              title={t("copyLink")}
                            >
                              {copied === p.id ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                              {copied === p.id ? tc("copied") : t("linkButton")}
                            </button>
                            <button
                              onClick={() => {
                                setCreated(null);
                                setLinkFor(p);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="btn-sm-ghost !min-h-[32px] !px-2"
                              title={t("qr")}
                              aria-label={t("qr")}
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditing(p)}
                              disabled={isOffline}
                              className="btn-sm-ghost !min-h-[32px] !px-2"
                              title={tc("edit")}
                              aria-label={`${tc("edit")} ${p.fullName}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleting(p)}
                              disabled={isOffline || !isAdmin}
                              className="btn-sm-ghost !min-h-[32px] !px-2 text-erreur hover:!bg-erreur-fond"
                              title={isAdmin ? tc("delete") : tc("adminOnly")}
                              aria-label={`${tc("delete")} ${p.fullName}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {partners.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <Handshake className="mx-auto mb-2 h-8 w-8 text-bord" />
                        <p className="font-semibold">{t("empty")}</p>
                        <p className="text-sm text-gris">{t("emptyHint")}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && <EditPartnerDialog partner={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {deleting && (
        <ConfirmDialog
          title={t("delete.title", { name: deleting.fullName })}
          text={t("delete.text", { count: deleting._count?.candidates ?? 0 })}
          confirmLabel={deleteBusy ? tc("deleting") : tc("delete")}
          icon={<Trash2 className="h-5 w-5" />}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
