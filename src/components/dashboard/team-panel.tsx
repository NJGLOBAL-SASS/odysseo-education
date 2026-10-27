"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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

import { StatCard } from "@/components/dashboard/stat-card";
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

const FILTERS = ["all", "admins", "staff", "pending"] as const;
type Filter = (typeof FILTERS)[number];

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
  const [filter, setFilter] = useState<Filter>("all");
  const locale = useLocale();

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
  const active = members.filter((m) => !m.pending);
  const withTwoFactor = active.filter((m) => m.twoFactorEnabled).length;

  const counts: Record<Filter, number> = {
    all: members.length,
    admins,
    staff: members.length - admins,
    pending,
  };
  const visible = members.filter((m) =>
    filter === "admins" ? m.role === "ADMIN" : filter === "staff" ? m.role === "STAFF" : filter === "pending" ? m.pending : true
  );
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });

  function renderMenu(m: Member) {
    if (!isAdmin || m.id === currentUserId) return null;
    return (
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
    );
  }

  const avatar = (m: Member) => (
    <span
      className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
        m.pending ? "border-2 border-dashed border-bord text-gris" : "bg-noir text-white"
      )}
    >
      {initials(m)}
    </span>
  );

  const roleBadge = (m: Member) =>
    m.role === "ADMIN" ? (
      <Pill tone="dark">
        <Crown className="h-3 w-3" /> {t("admin")}
      </Pill>
    ) : (
      <Pill>{t("roleStaff")}</Pill>
    );

  const accessPills = (m: Member) =>
    m.pending ? (
      <Pill tone="warn">
        <Clock className="h-3 w-3" />
        {m.inviteExpiresAt ? t("pending") : t("expired")}
      </Pill>
    ) : m.hasPassword || m.hasGoogle ? (
      <>
        {m.hasPassword && (
          <Pill>
            <KeyRound className="h-3 w-3" /> {t("password")}
          </Pill>
        )}
        {m.hasGoogle && <Pill>{t("google")}</Pill>}
      </>
    ) : (
      <span className="text-xs text-gris">{t("noAccess")}</span>
    );

  const securityPill = (m: Member) =>
    m.twoFactorEnabled ? (
      <Pill tone="ok">
        <ShieldCheck className="h-3 w-3" /> {t("twoFactor")}
      </Pill>
    ) : m.hasPassword && !m.pending ? (
      <Pill tone="warn">{t("noTwoFactor")}</Pill>
    ) : (
      <span className="text-xs text-gris">—</span>
    );

  const identity = (m: Member) => (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
        <span className="[overflow-wrap:anywhere]">{m.name || "—"}</span>
        {m.id === currentUserId && <Pill>{t("you")}</Pill>}
      </p>
      <p className="text-xs text-gris [overflow-wrap:anywhere]">{m.email}</p>
    </div>
  );

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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Users} label={t("stats.members")} value={members.length} accent />
        <StatCard icon={Crown} label={t("stats.admins")} value={admins} />
        <StatCard icon={Clock} label={t("stats.pending")} value={pending} />
        <StatCard
          icon={ShieldCheck}
          label={t("stats.twoFactor")}
          value={t("stats.twoFactorValue", { on: withTwoFactor, total: active.length })}
        />
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

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === f ? "border-noir bg-noir text-white" : "border-bord bg-white text-gris hover:text-noir"
            )}
          >
            {t(`filters.${f}`)}
            <span className={cn("tabular-nums text-xs", filter === f ? "text-white/70" : "text-gris")}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        {members.length === 0 || visible.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-bord" />
            <p className="font-semibold">{members.length === 0 ? t("empty") : t("emptyFilter")}</p>
          </div>
        ) : (
          <>
            {/* Ordinateur : colonnes alignées */}
            <table className="hidden w-full text-left text-sm lg:table">
              <thead>
                <tr className="border-b border-bord text-xs font-semibold uppercase tracking-wide text-gris">
                  <th className="px-5 py-3 font-semibold">{t("columns.member")}</th>
                  <th className="px-3 py-3 font-semibold">{t("columns.role")}</th>
                  <th className="px-3 py-3 font-semibold">{t("columns.access")}</th>
                  <th className="px-3 py-3 font-semibold">{t("columns.security")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-semibold">{t("columns.added")}</th>
                  <th className="w-14 px-3 py-3">
                    <span className="sr-only">{t("columns.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bord">
                {visible.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-fond/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {avatar(m)}
                        {identity(m)}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">{roleBadge(m)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1.5">{accessPills(m)}</div>
                    </td>
                    <td className="px-3 py-3.5">{securityPill(m)}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-gris tabular-nums">
                      {dateFmt.format(new Date(m.createdAt))}
                    </td>
                    <td className="px-3 py-3.5 text-right">{renderMenu(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile et tablette : cartes empilées */}
            <ul className="divide-y divide-bord lg:hidden">
              {visible.map((m) => (
                <li key={m.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    {avatar(m)}
                    <div className="min-w-0 flex-1">{identity(m)}</div>
                    {renderMenu(m)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-[52px]">
                    {roleBadge(m)}
                    {accessPills(m)}
                    {m.twoFactorEnabled || (m.hasPassword && !m.pending) ? securityPill(m) : null}
                  </div>
                  <p className="mt-2 pl-[52px] text-xs text-gris">
                    {t("columns.added")} {dateFmt.format(new Date(m.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          </>
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
