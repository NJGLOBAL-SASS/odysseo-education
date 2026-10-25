"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Plus, QrCode, X, ExternalLink, MailCheck, MailX, Handshake, Share2 } from "lucide-react";
import QRCode from "qrcode";

import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { partnerColumns, type PartnerExportRow } from "@/lib/export/columns";
import { referralLink, publicSiteUrl } from "@/lib/referral";

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

function shareOnWhatsApp(link: string) {
  const text = `Tu veux étudier en Chine ? Remplis ton dossier Odysseo Education ici : ${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

/** Carte du lien de parrainage : lien, copie, QR code téléchargeable, partage. */
function ReferralLinkCard({ partner, onClose }: { partner: Row; onClose: () => void }) {
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
          <button onClick={onClose} className="rounded-lg p-1 text-gris hover:bg-fond hover:text-noir" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <input readOnly value={link} className="field-input !min-h-[40px] flex-1 font-mono !text-sm" onFocus={(e) => e.target.select()} />
          <button onClick={() => copy("card", link)} className="btn-sm-dark flex-shrink-0">
            {copied === "card" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "card" ? "Copié" : "Copier"}
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={() => shareOnWhatsApp(link)} className="btn-sm-ghost">
            <Share2 className="h-4 w-4" /> Partager sur WhatsApp
          </button>
          {qr && (
            <a href={qr} download={`odysseo-qr-${partner.referralCode}.png`} className="btn-sm-ghost">
              <QrCode className="h-4 w-4" /> Télécharger le QR
            </a>
          )}
          <a
            href={`${publicSiteUrl()}/fr/espace-partenaire/${partner.referralCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sm-ghost"
          >
            <ExternalLink className="h-4 w-4" /> Espace partenaire
          </a>
        </div>
        <p className="mt-3 text-xs text-gris">
          Toute personne qui remplit le formulaire depuis ce lien (ou ce QR code) est attribuée automatiquement à ce
          partenaire, sans code à taper — même si elle revient dans les 30 jours.
        </p>
      </div>
    </div>
  );
}

export function PartnersPanel() {
  const t = useTranslations("dashboard.partners");
  const toast = useToast();
  const { data: partners, loading, isOffline, cachedAt, refresh } = useOfflineDataset<Row>(
    "partenaires",
    "/api/partners",
    "partners"
  );

  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ partner: Row; emailSent: boolean } | null>(null);
  const [linkFor, setLinkFor] = useState<Row | null>(null);
  const { copied, copy } = useCopy();

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
        setFormError(json.error || "Erreur lors de la création.");
        return;
      }
      setCreated({ partner: json.partner, emailSent: Boolean(json.welcomeEmailSent) });
      setLinkFor(null);
      setFullName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      toast({ tone: "success", title: "Partenaire créé", description: `Code ${json.partner.referralCode}` });
      refresh();
    } catch {
      setFormError("Connexion impossible. Réessayez.");
    } finally {
      setSaving(false);
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Programme de parrainage</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="mt-1 text-sm text-gris">
            Chaque partenaire reçoit un code et un lien personnel qui attribue automatiquement ses candidats.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons resource="partenaires" isOffline={isOffline} offlineRows={partners} offlineColumns={partnerColumns} />
          <button
            onClick={() => setShowForm((v) => !v)}
            disabled={isOffline}
            title={isOffline ? "Indisponible hors-ligne" : undefined}
            className="btn-sm-primary"
          >
            <Plus className="h-4 w-4" /> {t("add")}
          </button>
        </div>
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Partenaires", value: partners.length },
          { label: "Clics sur les liens", value: totals.clicks },
          { label: "Dossiers apportés", value: totals.candidates },
          { label: "Points distribués", value: totals.points },
        ].map((k) => (
          <div key={k.label} className="card px-4 py-3.5">
            {loading ? <div className="skeleton mb-1 h-7 w-12" /> : <p className="text-2xl font-extrabold tabular-nums">{k.value}</p>}
            <p className="text-xs font-medium text-gris">{k.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={addPartner} className="card mb-6 animate-fade-up p-5">
          <h2 className="section-title mb-1">Nouveau partenaire</h2>
          <p className="mb-4 text-xs text-gris">
            Le code et le lien de parrainage sont générés automatiquement et envoyés par email au partenaire.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <input required minLength={2} placeholder="Nom complet *" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} className="field-input !min-h-[42px] text-sm" />
            <input required type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} className="field-input !min-h-[42px] text-sm" />
            <input type="tel" placeholder="WhatsApp (facultatif)" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} className="field-input !min-h-[42px] text-sm" />
          </div>
          {formError && <p className="mt-3 text-sm font-semibold text-erreur">{formError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="btn-sm-ghost">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-sm-dark">
              {saving && <Spinner />}
              {saving ? "Création…" : "Créer et générer le lien"}
            </button>
          </div>
        </form>
      )}

      {created && (
        <div className="card mb-6 animate-fade-up border-l-[3px] border-l-ok p-5">
          <p className={`mb-4 flex items-center gap-2 text-sm font-semibold ${created.emailSent ? "text-ok" : "text-[#8A6200]"}`}>
            {created.emailSent ? <MailCheck className="h-4 w-4" /> : <MailX className="h-4 w-4" />}
            {created.emailSent
              ? `Lien envoyé par email à ${created.partner.email}.`
              : "Partenaire créé, mais l'email n'a pas pu partir : transmettez-lui le lien ci-dessous."}
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t("columns.name")}</th>
                <th className="px-4 py-3">{t("columns.code")}</th>
                <th className="px-4 py-3 text-right">Clics</th>
                <th className="px-4 py-3 text-right">{t("columns.candidates")}</th>
                <th className="px-4 py-3 text-right">Conversion</th>
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
                        {p.status === "ACTIVE" ? "Actif" : "Suspendu"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => copy(p.id, referralLink(p.referralCode))}
                          disabled={isOffline}
                          className="btn-sm-ghost !min-h-[32px] !px-2.5 text-xs"
                          title="Copier le lien de parrainage"
                        >
                          {copied === p.id ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied === p.id ? "Copié" : "Lien"}
                        </button>
                        <button
                          onClick={() => {
                            setCreated(null);
                            setLinkFor(p);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="btn-sm-ghost !min-h-[32px] !px-2.5"
                          title="QR code et partage"
                        >
                          <QrCode className="h-3.5 w-3.5" />
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
                    <p className="font-semibold">Aucun partenaire</p>
                    <p className="text-sm text-gris">Ajoutez votre premier partenaire pour générer son lien.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
