"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Plus } from "lucide-react";

import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { partnerColumns, type PartnerExportRow } from "@/lib/export/columns";

export function PartnersPanel() {
  const t = useTranslations("dashboard.partners");
  const { data: partners, isOffline, cachedAt, refresh } = useOfflineDataset<PartnerExportRow>(
    "partenaires",
    "/api/partners",
    "partners"
  );

  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function addPartner(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      setFullName("");
      setEmail("");
      setShowForm(false);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  function copyLink(partner: PartnerExportRow) {
    const url = `${window.location.origin}/r/${partner.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(partner.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <ExportButtons
            resource="partenaires"
            isOffline={isOffline}
            offlineRows={partners}
            offlineColumns={partnerColumns}
          />
          <button
            onClick={() => setShowForm((v) => !v)}
            disabled={isOffline}
            title={isOffline ? "Indisponible hors-ligne" : undefined}
            className="btn-dark !w-auto disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> {t("add")}
          </button>
        </div>
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      {showForm && (
        <form onSubmit={addPartner} className="card mb-4 flex flex-wrap gap-2 p-4">
          <input
            required
            placeholder="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="field-input flex-1"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input flex-1"
          />
          <button type="submit" disabled={saving} className="btn-primary !w-auto">
            {t("add")}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bord text-gris">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("columns.name")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.code")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.candidates")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.points")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-bord">
            {partners.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{p.fullName}</p>
                  <p className="text-xs text-gris">{p.email}</p>
                </td>
                <td className="px-4 py-3 font-mono">{p.referralCode}</td>
                <td className="px-4 py-3">{p._count?.candidates ?? 0}</td>
                <td className="px-4 py-3 font-bold">{p.pointsBalance}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#E1F6EA] px-2.5 py-1 text-xs font-semibold text-ok">
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => copyLink(p)}
                    disabled={isOffline}
                    className="btn-ghost !min-h-[32px] !px-2.5 text-xs disabled:opacity-40"
                  >
                    {copiedId === p.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gris">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
