"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { STATUS_LABELS_FR, STATUS_LABELS_EN } from "./status-badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

export function StatusUpdater({
  candidateId,
  currentStatus,
  locale,
}: {
  candidateId: string;
  currentStatus: string;
  locale: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const labels = locale === "en" ? STATUS_LABELS_EN : STATUS_LABELS_FR;

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function updateStatus(next: string) {
    const previous = status;
    setStatus(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/candidatures/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast({ tone: "success", title: "Statut mis à jour", description: labels[next] });
      router.refresh();
    } catch {
      setStatus(previous);
      toast({ tone: "error", title: "Échec de la mise à jour du statut", description: "Réessayez dans un instant." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <select
        value={status}
        disabled={saving || isOffline}
        title={isOffline ? "Changement de statut indisponible hors-ligne" : undefined}
        onChange={(e) => updateStatus(e.target.value)}
        className="field-input !min-h-[38px] !w-auto pr-9 text-sm font-semibold disabled:opacity-60"
        aria-label="Statut du dossier"
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {saving && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gris" />}
    </div>
  );
}
