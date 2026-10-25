"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
          ? { tone: "success", title: "Invitation envoyée", description: `Un lien d'activation a été envoyé à ${email}.` }
          : { tone: "error", title: "Membre ajouté, mais l'email n'est pas parti", description: "Utilisez « Renvoyer l'invitation »." }
      );
      setName("");
      setEmail("");
      setRole("STAFF");
      setShowForm(false);
      router.refresh();
    } catch {
      setFormError("Connexion impossible. Réessayez.");
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

      const messages = {
        promote: `${member.name || member.email} est maintenant administrateur.`,
        demote: `${member.name || member.email} est maintenant membre de l'équipe.`,
        reset2fa: "2FA désactivée : le membre pourra la réactiver dans ses paramètres.",
        resend: json.emailSent ? `Nouveau lien envoyé à ${member.email}.` : "L'email n'a pas pu partir.",
        delete: `${member.name || member.email} n'a plus accès au dashboard.`,
      };
      toast({ tone: kind === "resend" && !json.emailSent ? "error" : "success", title: messages[kind] });
      router.refresh();
    } catch (err) {
      toast({ tone: "error", title: "Action impossible", description: err instanceof Error ? err.message : undefined });
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
          <p className="page-eyebrow">Accès au dashboard</p>
          <h1 className="page-title">Membres de l&apos;équipe</h1>
          <p className="mt-1 text-sm text-gris">
            {members.length} membre(s) · {admins} administrateur(s)
            {pending > 0 && ` · ${pending} invitation(s) en attente`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm((v) => !v)} className="btn-sm-primary">
            <UserPlus className="h-4 w-4" /> Inviter un membre
          </button>
        )}
      </div>

      {!isAdmin && (
        <p className="mb-4 rounded-brand border border-bord bg-white px-4 py-3 text-sm text-gris">
          Seuls les administrateurs peuvent inviter, modifier ou retirer des membres.
        </p>
      )}

      {showForm && isAdmin && (
        <form onSubmit={invite} className="card mb-6 animate-fade-up p-5">
          <h2 className="section-title mb-1">Inviter un membre</h2>
          <p className="mb-4 text-xs text-gris">
            Il recevra un email pour choisir son mot de passe (lien valable 7 jours). Il pourra aussi se connecter avec
            Google si cette adresse est un compte Google.
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]">
            <input
              required
              minLength={2}
              placeholder="Nom complet *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inviting}
              className="field-input !min-h-[42px] text-sm"
            />
            <input
              required
              type="email"
              placeholder="Email *"
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
              aria-label="Rôle"
            >
              <option value="STAFF">Membre de l&apos;équipe</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gris">
            <b>Membre</b> : candidatures, partenaires, newsletter. <b>Administrateur</b> : tout, plus la gestion de
            l&apos;équipe.
          </p>
          {formError && <p className="mt-3 text-sm font-semibold text-erreur">{formError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} disabled={inviting} className="btn-sm-ghost">
              Annuler
            </button>
            <button type="submit" disabled={inviting} className="btn-sm-dark">
              {inviting ? <Spinner /> : <Send className="h-4 w-4" />}
              {inviting ? "Envoi…" : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {members.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-bord" />
            <p className="font-semibold">Aucun membre</p>
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
                      {isSelf && <Pill>Vous</Pill>}
                      {m.role === "ADMIN" && (
                        <Pill tone="dark">
                          <Crown className="h-3 w-3" /> Administrateur
                        </Pill>
                      )}
                    </p>
                    <p className="truncate text-xs text-gris">{m.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    {m.pending ? (
                      <Pill tone="warn">
                        <Clock className="h-3 w-3" />
                        {m.inviteExpiresAt ? "Invitation en attente" : "Invitation expirée"}
                      </Pill>
                    ) : (
                      <>
                        {m.hasPassword && (
                          <Pill>
                            <KeyRound className="h-3 w-3" /> Mot de passe
                          </Pill>
                        )}
                        {m.hasGoogle && <Pill>Google</Pill>}
                        {m.twoFactorEnabled ? (
                          <Pill tone="ok">
                            <ShieldCheck className="h-3 w-3" /> 2FA
                          </Pill>
                        ) : (
                          m.hasPassword && <Pill tone="warn">Sans 2FA</Pill>
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
                        aria-label={`Actions pour ${m.name || m.email}`}
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
                                Nommer administrateur
                              </MenuItem>
                            ) : (
                              <MenuItem icon={Users} onClick={() => action(m, "demote")}>
                                Repasser en membre
                              </MenuItem>
                            )}
                            {(m.pending || !m.hasPassword) && (
                              <MenuItem icon={Send} onClick={() => action(m, "resend")}>
                                {m.pending ? "Renvoyer l'invitation" : "Envoyer un lien mot de passe"}
                              </MenuItem>
                            )}
                            {m.twoFactorEnabled && (
                              <MenuItem icon={ShieldOff} onClick={() => action(m, "reset2fa")}>
                                Réinitialiser la 2FA
                              </MenuItem>
                            )}
                            <div className="my-1 border-t border-bord" />
                            <MenuItem icon={Trash2} danger onClick={() => (setMenuFor(null), setConfirmDelete(m))}>
                              Retirer de l&apos;équipe
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-noir/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm animate-fade-up rounded-brand bg-white p-5 shadow-pop" role="dialog" aria-modal="true">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-erreur-fond text-erreur">
              <Trash2 className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-extrabold">Retirer {confirmDelete.name || confirmDelete.email} ?</h2>
            <p className="mt-1 text-sm text-gris">
              Son accès au dashboard est coupé immédiatement, sur tous ses appareils. Les dossiers et partenaires ne sont
              pas affectés. Vous pourrez le réinviter plus tard.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} disabled={busy !== null} className="btn-sm-ghost">
                Annuler
              </button>
              <button
                onClick={() => action(confirmDelete, "delete")}
                disabled={busy !== null}
                className="btn-sm bg-erreur text-white hover:bg-rouge-fonce"
              >
                {busy === confirmDelete.id && <Spinner />} Retirer
              </button>
            </div>
          </div>
        </div>
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
