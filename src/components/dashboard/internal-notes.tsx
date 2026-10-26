"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

/** Notes internes de l'équipe sur un dossier (jamais visibles du candidat). */
export function InternalNotes({ candidateId, initial }: { candidateId: string; initial: string }) {
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = value !== saved;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/candidatures/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: value }),
      });
      if (!res.ok) throw new Error();
      setSaved(value);
      toast({ tone: "success", title: "Notes enregistrées" });
    } catch {
      toast({ tone: "error", title: "Impossible d'enregistrer les notes" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder="Appel du 12/03 : intéressé par Médecine à Wuhan, relancer après réception du relevé…"
        className="field-input resize-y text-sm leading-relaxed"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-gris">{dirty ? "Modifications non enregistrées" : "À jour"}</span>
        <button onClick={save} disabled={!dirty || saving} className="btn-sm-dark">
          {saving ? <Spinner /> : <Save className="h-4 w-4" />}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
