"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Send,
  Trash2,
  Crown,
  KeyRound,
  Clock,
  MoreHorizontal,
  Users,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "STAFF";
  twoFactorEnabled: boolean;
  createdAt: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  pending: boolean;
  inviteExpiresAt: string | null;
};

function initials(m: Member) {
  return (m.name || m.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-fond text-gris",
        tone === "ok" && "bg-[#E1F6EA] text-ok",
        tone === "warn" && "bg-[#FFF3D6] text-[#8A6200]",
        tone === "dark" && "bg-noir text-white"
      )}
    >
      {children}
    </span>
  );
}

export function TeamPanel({
  members,
  currentUserId,
  isAdmin,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const t = useTranslations("dashboard.team");
  const tc = useTranslations("dashboard.common");
  const b = (chunks: React.ReactNode) => <b>{chunks}</b>;
  const router = useRouter();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [inviting, setInviting] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setFormError("");
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error);
        return;
      }
      toast(
        json.emailSent
          ? { tone: "success", title: t("invited"), description: t("invitedText", { email }) }
          : { tone: "error", title: t("invitedNoEmail"), description: t("invitedNoEmailText") }
      );
      setName("");
      setEmail("");
      setRole("STAFF");
      setShowForm(false);
      router.refresh();
    } catch {
      setFormError(t("form.network"));
    } finally {
      setInviting(false);
    }
  }

  async function action(member: Member, kind: "promote" | "demote" | "reset2fa" | "resend" | "delete") {
    setMenuFor(null);
    setBusy(member.id);
    try {
      const res =
        kind === "resend"
          ? await fetch(`/api/team/${member.id}/invite`, { method: "POST" })
          : kind === "delete"
            ? await fetch(`/api/team/${member.id}`, { method: "DELETE" })
            : await fetch(`/api/team/${member.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  kind === "reset2fa" ? { resetTwoFactor: true } : { role: kind === "promote" ? "ADMIN" : "STAFF" }
                ),
              });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const name = member.name || member.email;
      const messages = {
        promote: t("done.promote", { name }),
        demote: t("done.demote", { name }),
        reset2fa: t("done.reset2fa"),
        resend: json.emailSent ? t("done.resend", { email: member.email }) : t("done.resendFailed"),
        delete: t("done.delete", { name }),
      };
      toast({ tone: kind === "resend" && !json.emailSent ? "error" : "success", title: messages[kind] });
      router.refresh();
    } catch (err) {
      toast({ tone: "error", title: t("failed"), description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }

  const admins = members.filter((m) => m.role === "ADMIN").length;
  const pending = members.filter((m) => m.pending).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">{t("eyebrow")}</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="mt-1 text-sm text-gris">
            {t("summary", { count: members.length, admins })}
            {pending > 0 && t("pendingSummary", { count: pending })}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm((v) => !v)} className="btn-sm-primary">
            <UserPlus className="h-4 w-4" /> {t("invite")}
          </button>
        )}
      </div>

      {!isAdmin && (
        <p className="mb-4 rounded-brand border border-bord bg-white px-4 py-3 text-sm text-gris">
          {t("adminOnlyNotice")}
        </p>
      )}

      {showForm && isAdmin && (
        <form onSubmit={invite} className="card mb-6 animate-fade-up p-5">
          <h2 className="section-title mb-1">{t("form.title")}</h2>
          <p className="mb-4 text-xs text-gris">{t("form.hint")}</p>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]">
            <input
              required
              minLength={2}
              placeholder={t("form.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inviting}
              className="field-input !min-h-[42px] text-sm"
            />
            <input
              required
              type="email"
              placeholder={t("form.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviting}
              className="field-input !min-h-[42px] text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "STAFF" | "ADMIN")}
              disabled={inviting}
              className="field-input !min-h-[42px] text-sm"
              aria-label={t("form.role")}
            >
              <option value="STAFF">{t("form.roleStaff")}</option>
              <option value="ADMIN">{t("form.roleAdmin")}</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gris">{t.rich("form.rolesHint", { b })}</p>
          {formError && <p className="mt-3 text-sm font-semibold text-erreur">{formError}</p>}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowForm(false)} disabled={inviting} className="btn-sm-ghost">
              {tc("cancel")}
            </button>
            <button type="submit" disabled={inviting} className="btn-sm-dark">
              {inviting ? <Spinner /> : <Send className="h-4 w-4" />}
              {inviting ? tc("sending") : t("form.submit")}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {members.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-bord" />
            <p className="font-semibold">{t("empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-bord">
            {members.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
                  <span
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      m.pending ? "border-2 border-dashed border-bord text-gris" : "bg-noir text-white"
                    )}
                  >
                    {initials(m)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{m.name || "—"}</span>
                      {isSelf && <Pill>{t("you")}</Pill>}
                      {m.role === "ADMIN" && (
                        <Pill tone="dark">
                          <Crown className="h-3 w-3" /> {t("admin")}
                        </Pill>
                      )}
                    </p>
                    <p className="truncate text-xs text-gris">{m.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    {m.pending ? (
                      <Pill tone="warn">
                        <Clock className="h-3 w-3" />
                        {m.inviteExpiresAt ? t("pending") : t("expired")}
                      </Pill>
                    ) : (
                      <>
                        {m.hasPassword && (
                          <Pill>
                            <KeyRound className="h-3 w-3" /> {t("password")}
                          </Pill>
                        )}
                        {m.hasGoogle && <Pill>{t("google")}</Pill>}
                        {m.twoFactorEnabled ? (
                          <Pill tone="ok">
                            <ShieldCheck className="h-3 w-3" /> {t("twoFactor")}
                          </Pill>
                        ) : (
                          m.hasPassword && <Pill tone="warn">{t("noTwoFactor")}</Pill>
                        )}
                      </>
                    )}
                  </div>

                  {isAdmin && !isSelf && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                        disabled={busy === m.id}
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-gris hover:bg-fond hover:text-noir"
                        aria-label={tc("actionsFor", { name: m.name || m.email })}
                        aria-expanded={menuFor === m.id}
                      >
                        {busy === m.id ? <Spinner /> : <MoreHorizontal className="h-5 w-5" />}
                      </button>
                      {menuFor === m.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                          <div className="absolute right-0 top-10 z-50 w-60 animate-fade-up overflow-hidden rounded-brand bg-white py-1.5 shadow-pop">
                            {m.role === "STAFF" ? (
                              <MenuItem icon={Crown} onClick={() => action(m, "promote")}>
                                {t("actions.promote")}
                              </MenuItem>
                            ) : (
                              <MenuItem icon={Users} onClick={() => action(m, "demote")}>
                                {t("actions.demote")}
                              </MenuItem>
                            )}
                            {(m.pending || !m.hasPassword) && (
                              <MenuItem icon={Send} onClick={() => action(m, "resend")}>
                                {m.pending ? t("actions.resend") : t("actions.sendPasswordLink")}
                              </MenuItem>
                            )}
                            {m.twoFactorEnabled && (
                              <MenuItem icon={ShieldOff} onClick={() => action(m, "reset2fa")}>
                                {t("actions.reset2fa")}
                              </MenuItem>
                            )}
                            <div className="my-1 border-t border-bord" />
                            <MenuItem icon={Trash2} danger onClick={() => (setMenuFor(null), setConfirmDelete(m))}>
                              {t("actions.remove")}
                            </MenuItem>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t("removeTitle", { name: confirmDelete.name || confirmDelete.email })}
          text={t("removeText")}
          confirmLabel={t("removeConfirm")}
          icon={<Trash2 className="h-5 w-5" />}
          busy={busy === confirmDelete.id}
          onConfirm={() => action(confirmDelete, "delete")}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  onClick,
  danger,
  children,
}: {
  icon: typeof Send;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm",
        danger ? "text-erreur hover:bg-erreur-fond" : "hover:bg-fond"
      )}
    >
      <Icon className={cn("h-4 w-4", danger ? "" : "text-gris")} />
      {children}
    </button>
  );
}
