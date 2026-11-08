"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, Save } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { PARALLEL_STAGES, PUBLIC_NOTE_MAX, STAGES } from "@/lib/tracking-stages";

/**
 * Suivi visible par l'étudiant (PACK-08) : étape, note publique et message WhatsApp à copier
 * (envoi manuel, pas d'envoi automatique). Chaque changement d'étape s'ajoute à l'historique.
 */
export function TrackingEditor({
  candidateId,
  initialStage,
  initialNote,
  history,
  stageLabels,
  copyMessages,
}: {
  candidateId: string;
  initialStage: string;
  initialNote: string;
  history: { label: string; date: string }[];
  /** Libellés des étapes dans la langue du tableau de bord. */
  stageLabels: Record<string, string>;
  /** Message WhatsApp prêt à copier pour chaque étape, dans la langue du candidat. */
  copyMessages: Record<string, string>;
}) {
  const t = useTranslations("dashboard.candidate.tracking");
  const router = useRouter();
  const toast = useToast();
  const [stage, setStage] = useState(initialStage);
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState({ stage: initialStage, note: initialNote });
  const [saving, setSaving] = useState(false);
  const dirty = stage !== saved.stage || note.trim() !== saved.note;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/candidatures/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, publicNote: note.trim() }),
      });
      if (!res.ok) throw new Error();
      setSaved({ stage, note: note.trim() });
      toast({ tone: "success", title: t("saved"), description: stageLabels[stage] });
      router.refresh();
    } catch {
      toast({ tone: "error", title: t("failed") });
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyMessages[saved.stage] ?? "");
      toast({ tone: "success", title: t("copied") });
    } catch {
      toast({ tone: "error", title: t("failed") });
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">{t("stage")}</span>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="field-input text-sm">
          <optgroup label={t("stepsGroup")}>
            {STAGES.map((s, i) => (
              <option key={s} value={s}>
                {i + 1}. {stageLabels[s]}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("parallelGroup")}>
            {PARALLEL_STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">{t("note")}</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, PUBLIC_NOTE_MAX))}
          rows={3}
          maxLength={PUBLIC_NOTE_MAX}
          className="field-input resize-y text-sm leading-relaxed"
        />
        <span className="mt-1 flex justify-between gap-2 text-xs text-gris">
          <span>{t("noteHint")}</span>
          <span className="tabular-nums">
            {note.length}/{PUBLIC_NOTE_MAX}
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={!dirty || saving} className="btn-sm-dark">
          {saving ? <Spinner /> : <Save className="h-4 w-4" />} {t("save")}
        </button>
        <button type="button" onClick={copy} disabled={dirty} className="btn-sm border border-bord bg-white" title={copyMessages[saved.stage]}>
          <Copy className="h-4 w-4" /> {t("copy")}
        </button>
      </div>
      {history.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gris">{t("history")}</p>
          <ol className="space-y-1 text-xs">
            {[...history].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className={i === 0 ? "font-semibold" : "text-gris"}>{h.label}</span>
                <span className="tabular-nums text-gris">{h.date}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
