"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Copy, Mail, Power, UserPlus } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type PortalAccountView = {
  id: string;
  role: "STUDENT" | "PARENT";
  name: string;
  email: string;
  activatedAt: string | null;
  lastLoginAt: string | null;
  disabledAt: string | null;
};

type Prefill = { studentName: string; studentEmail: string; parentName: string; locale: "fr" | "en" };

/** Carte « Espace étudiant » de la fiche dossier : accès étudiant et parent, invitations, liens. */
export function PortalAccess({ candidateId, accounts, prefill }: { candidateId: string; accounts: PortalAccountView[]; prefill: Prefill }) {
  const t = useTranslations("dashboard.candidate.portal");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<null | "STUDENT" | "PARENT">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const hasStudent = accounts.some((a) => a.role === "STUDENT");
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("", text);
    }
  }

  async function act(id: string, action: "resend" | "link" | "disable" | "enable") {
    if (action === "disable" && !window.confirm(t("confirmDisable"))) return;
    setBusy(`${id}:${action}`);
    try {
      const res = await fetch(`/api/portal-accounts/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (action === "link" && json.link) {
        await copy(json.link);
        toast({ tone: "success", title: t("linkCopied") });
      } else if (action === "resend") toast({ tone: "success", title: t("resent") });
      router.refresh();
    } catch {
      toast({ tone: "error", title: t("failed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gris">{t("intro")}</p>
      {accounts.length === 0 && <p className="text-sm text-gris">{t("none")}</p>}
      <ul className="space-y-2">
        {accounts.map((a) => {
          const status = a.disabledAt ? "disabled" : a.activatedAt ? "active" : "pending";
          return (
            <li key={a.id} className="rounded-[10px] border border-bord p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-fond px-2 py-0.5 text-[11px] font-bold">{t(`roles.${a.role}`)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    status === "active" ? "bg-[#E1F6EA] text-ok" : status === "disabled" ? "bg-erreur-fond text-erreur" : "bg-[#FFF3D6] text-[#8A6200]",
                  )}
                >
                  {t(`status.${status}`)}
                </span>
              </div>
              <p className="mt-1 font-semibold">{a.name}</p>
              <p className="break-all text-xs text-gris">{a.email}</p>
              {a.lastLoginAt && <p className="text-xs text-gris">{t("lastLogin", { date: dateFmt.format(new Date(a.lastLoginAt)) })}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!a.disabledAt && (
                  <>
                    <button type="button" onClick={() => act(a.id, "resend")} disabled={!!busy} className="btn-sm border border-bord bg-white !min-h-[32px] text-xs">
                      {busy === `${a.id}:resend` ? <Spinner /> : <Mail className="h-3.5 w-3.5" />} {t("resend")}
                    </button>
                    <button type="button" onClick={() => act(a.id, "link")} disabled={!!busy} className="btn-sm border border-bord bg-white !min-h-[32px] text-xs">
                      {busy === `${a.id}:link` ? <Spinner /> : <Copy className="h-3.5 w-3.5" />} {t("copyLink")}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => act(a.id, a.disabledAt ? "enable" : "disable")}
                  disabled={!!busy}
                  className="btn-sm border border-bord bg-white !min-h-[32px] text-xs text-gris"
                >
                  <Power className="h-3.5 w-3.5" /> {a.disabledAt ? t("enable") : t("disable")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {form ? (
        <CreateForm
          role={form}
          candidateId={candidateId}
          prefill={prefill}
          onCancel={() => setForm(null)}
          onCreated={async (link, emailed) => {
            setForm(null);
            if (!emailed) await copy(link);
            toast({ tone: "success", title: t("created"), description: emailed ? undefined : t("linkCopied") });
            router.refresh();
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {!hasStudent && (
            <button type="button" onClick={() => setForm("STUDENT")} className="btn-sm-dark">
              <UserPlus className="h-4 w-4" /> {t("createStudent")}
            </button>
          )}
          <button type="button" onClick={() => setForm("PARENT")} className={hasStudent ? "btn-sm-dark" : "btn-sm border border-bord bg-white"}>
            <UserPlus className="h-4 w-4" /> {t("addParent")}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateForm({
  role,
  candidateId,
  prefill,
  onCancel,
  onCreated,
}: {
  role: "STUDENT" | "PARENT";
  candidateId: string;
  prefill: Prefill;
  onCancel: () => void;
  onCreated: (link: string, emailed: boolean) => void;
}) {
  const t = useTranslations("dashboard.candidate.portal");
  const [name, setName] = useState(role === "STUDENT" ? prefill.studentName : prefill.parentName);
  const [email, setEmail] = useState(role === "STUDENT" ? prefill.studentEmail : "");
  const [locale, setLocale] = useState<"fr" | "en">(prefill.locale);
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/candidatures/${candidateId}/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name: name.trim(), email: email.trim(), locale, sendEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(["studentExists", "emailTaken", "invalid"].includes(json.error) ? json.error : "invalid");
      onCreated(json.link, Boolean(json.emailed));
    } catch (err) {
      setError(t(`errors.${(err as Error).message as "invalid"}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-[10px] border border-noir p-3 text-sm">
      <p className="font-bold">{role === "STUDENT" ? t("createStudent") : t("addParent")}</p>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold">{t("name")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field-input text-sm" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold">{t("email")}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input text-sm" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold">{t("locale")}</span>
        <select value={locale} onChange={(e) => setLocale(e.target.value as "fr" | "en")} className="field-input text-sm">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> {t("sendEmail")}
      </label>
      {error && <p className="text-xs font-semibold text-erreur">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-sm-dark">
          {busy && <Spinner />} {t("create")}
        </button>
        <button type="button" onClick={onCancel} className="btn-sm border border-bord bg-white">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
