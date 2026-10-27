"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Mail, Pencil, Trash2 } from "lucide-react";

import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { newsletterColumns } from "@/lib/export/columns";
import { cn } from "@/lib/utils";
import type { NewsletterSubscriber } from "@prisma/client";

function EditSubscriberDialog({
  subscriber,
  onClose,
  onSaved,
}: {
  subscriber: NewsletterSubscriber;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("dashboard.newsletter");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const [email, setEmail] = useState(subscriber.email);
  const [locale, setLocale] = useState(subscriber.locale as "fr" | "en");
  const [confirmed, setConfirmed] = useState(subscriber.confirmed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/newsletter/${subscriber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, confirmed }),
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
      icon={<Pencil className="h-5 w-5" />}
      size="sm"
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
          <span className="mb-1 block text-sm font-semibold">{t("columns.email")}</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input !min-h-[42px] text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("columns.language")}</span>
          <select value={locale} onChange={(e) => setLocale(e.target.value as "fr" | "en")} className="field-input !min-h-[42px] text-sm">
            <option value="fr">{tc("french")}</option>
            <option value="en">{tc("english")}</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-5 w-5 accent-noir" />
          {t("columns.confirmed")}
        </label>
        {error && <p className="text-sm font-semibold text-erreur">{error}</p>}
      </form>
    </Dialog>
  );
}

export function NewsletterPanel({ locale, isAdmin }: { locale: string; isAdmin: boolean }) {
  const t = useTranslations("dashboard.newsletter");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const { data: subscribers, loading, isOffline, cachedAt, refresh } = useOfflineDataset<NewsletterSubscriber>(
    "newsletter",
    "/api/newsletter",
    "subscribers"
  );
  const [editing, setEditing] = useState<NewsletterSubscriber | null>(null);
  const [deleting, setDeleting] = useState<NewsletterSubscriber | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/newsletter/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ tone: "success", title: t("delete.done"), description: deleting.email });
      setDeleting(null);
      refresh();
    } catch {
      toast({ tone: "error", title: tc("error"), description: tc("retry") });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">{t("eyebrow")}</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="mt-1 text-sm text-gris">{loading ? t("loading") : t("count", { count: subscribers.length })}</p>
        </div>
        <ExportButtons resource="newsletter" isOffline={isOffline} offlineRows={subscribers} offlineColumns={newsletterColumns} />
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      {loading ? (
        <SkeletonTable cols={4} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t("columns.email")}</th>
                <th className="px-4 py-3">{t("columns.language")}</th>
                <th className="px-4 py-3">{t("columns.confirmed")}</th>
                <th className="px-4 py-3">{t("columns.date")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bord">
              {subscribers.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-fond">
                  <td className="px-4 py-3 font-medium">{s.email}</td>
                  <td className="px-4 py-3 uppercase">{s.locale}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        s.confirmed ? "bg-[#E1F6EA] text-ok" : "bg-fond text-gris"
                      )}
                    >
                      {s.confirmed ? tc("yes") : tc("no")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gris">{new Intl.DateTimeFormat(locale).format(new Date(s.createdAt))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(s)}
                        disabled={isOffline}
                        className="btn-sm-ghost !min-h-[32px] !px-2"
                        title={tc("edit")}
                        aria-label={`${tc("edit")} ${s.email}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
                        disabled={isOffline || !isAdmin}
                        className="btn-sm-ghost !min-h-[32px] !px-2 text-erreur hover:!bg-erreur-fond"
                        title={isAdmin ? tc("delete") : tc("adminOnly")}
                        aria-label={`${tc("delete")} ${s.email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <Mail className="mx-auto mb-2 h-8 w-8 text-bord" />
                    <p className="font-semibold">{t("empty")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditSubscriberDialog subscriber={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {deleting && (
        <ConfirmDialog
          title={t("delete.title", { email: deleting.email })}
          text={t("delete.text")}
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
