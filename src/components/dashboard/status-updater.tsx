"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { STATUS_LABELS_FR, STATUS_LABELS_EN } from "./status-badge";

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
    setStatus(next);
    setSaving(true);
    await fetch(`/api/candidatures/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={saving || isOffline}
      title={isOffline ? "Changement de statut indisponible hors-ligne" : undefined}
      onChange={(e) => updateStatus(e.target.value)}
      className="field-input !min-h-[38px] !w-auto text-sm font-semibold disabled:opacity-50"
    >
      {Object.entries(labels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
