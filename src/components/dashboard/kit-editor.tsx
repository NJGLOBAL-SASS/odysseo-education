"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { ImagePlus, Trash2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import {
  QR_POSITIONS,
  WA_URL_WARN_LENGTH,
  kitPageUrl,
  kitReferralLink,
  renderTemplate,
  slugify,
  waLink,
  whatsappMessage,
  type QrPosition,
} from "@/lib/kits/rules";

export type EditableKit = {
  id: string;
  slug: string;
  title: string;
  template: string;
  qrPosition: QrPosition;
  status: string;
  hasImage: boolean;
  imageVersion: number;
};

const DEFAULT_TEMPLATE =
  "🎓 Étudier en Chine avec une bourse ? Odysseo t'accompagne de A à Z : choix de l'université, dossier, visa.\n\n👉 Analyse gratuite de ton profil : {LIEN}";
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const SAMPLE = { firstName: "Exemple", code: "ODY-000" };

/**
 * Flyer prêt à l'envoi : un JPG ou PNG de 10 Mo maximum passe tel quel. Sinon (WEBP, HEIC d'iPhone,
 * type inconnu, fichier trop lourd), le navigateur le redessine en JPG haute qualité (2 160 px max).
 * Renvoie null si le fichier n'est pas une image lisible.
 */
async function prepareFlyer(file: File): Promise<File | null> {
  if ((file.type === "image/jpeg" || file.type === "image/png") && file.size <= 10 * 1024 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 2160 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.92;
    let blob: Blob | null = null;
    while (quality >= 0.6) {
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= 9.5 * 1024 * 1024) break;
      quality -= 0.1;
    }
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Création / modification d'un kit (ODY-14) : flyer, position du QR (aperçu réel pour un partenaire
 * exemple une fois le kit enregistré), texte modèle à variables et message WhatsApp final.
 */
export function KitEditor({ kit, siteUrl }: { kit?: EditableKit; siteUrl: string }) {
  const t = useTranslations("dashboard.kits.editor");
  const router = useRouter();
  const [title, setTitle] = useState(kit?.title ?? "");
  const [template, setTemplate] = useState(kit?.template ?? DEFAULT_TEMPLATE);
  const [position, setPosition] = useState<QrPosition>(kit?.qrPosition ?? "bas-droite");
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [state, setState] = useState<{ busy?: boolean; error?: string; ok?: string }>({});
  const area = useRef<HTMLTextAreaElement>(null);

  const slug = kit?.slug ?? (slugify(title || "kit"));
  const message = useMemo(() => {
    const link = kitReferralLink(siteUrl, SAMPLE.code, slug);
    const text = renderTemplate(template, { firstName: SAMPLE.firstName, link, code: SAMPLE.code });
    return whatsappMessage({ firstName: SAMPLE.firstName, kitUrl: kitPageUrl(siteUrl, slug, SAMPLE.code), text });
  }, [template, siteUrl, slug]);
  const waLength = waLink("237600000000", message).length;

  function insert(variable: string) {
    const el = area.current;
    if (!el) return setTemplate((v) => v + variable);
    const start = el.selectionStart;
    const next = template.slice(0, start) + variable + template.slice(el.selectionEnd);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    });
  }

  function pick(f: File | null) {
    setFile(f);
    setLocalUrl(f ? URL.createObjectURL(f) : null);
  }

  async function save(status: "brouillon" | "pret" | "archive") {
    if (title.trim().length < 3) return setState({ error: t("errors.title") });
    if (template.trim().length < 10) return setState({ error: t("errors.template") });
    if (status === "pret" && !template.includes("{LIEN}")) return setState({ error: t("errors.noLink") });
    setState({ busy: true });
    try {
      let flyer: { url: string; name: string } | undefined;
      if (file) {
        setState({ busy: true, ok: t("converting") });
        const ready = await prepareFlyer(file);
        if (!ready) return setState({ error: t("errors.unreadable") });
        const ext = ready.type === "image/png" ? "png" : "jpg";
        try {
          const blob = await upload(`documents/kits/flyers/${stamp()}-1.${ext}`, ready, {
            access: "private",
            handleUploadUrl: "/api/kits/upload",
            contentType: ready.type,
          });
          flyer = { url: blob.url, name: ready.name };
        } catch (err) {
          const detail = err instanceof Error ? err.message.slice(0, 120) : "?";
          return setState({ error: /non autoris|unauthor|401/i.test(detail) ? t("errors.unauthenticated") : t("errors.upload", { detail }) });
        }
      }
      const res = await fetch(kit ? `/api/kits/${kit.id}` : "/api/kits", {
        method: kit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), template, qrPosition: position, status, ...(flyer && { flyer }) }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; detail?: string; kit?: { id: string } };
      if (!res.ok) {
        if (res.status === 401) return setState({ error: t("errors.unauthenticated") });
        if (json.error === "flyerRequired" || json.error === "badType" || json.error === "tooBig") return setState({ error: t(`errors.${json.error}`) });
        return setState({ error: t("errors.server", { detail: `${res.status} ${json.error ?? ""} ${json.detail ?? ""}`.trim() }) });
      }
      setFile(null);
      setState({ ok: t("saved") });
      if (!kit && json.kit) router.push(`/dashboard/kits/${json.kit.id}`);
      else router.refresh();
    } catch (err) {
      setState({ error: t("errors.server", { detail: err instanceof Error ? err.message.slice(0, 120) : "?" }) });
    }
  }

  async function remove() {
    if (!kit || !window.confirm(t("confirmDelete"))) return;
    setState({ busy: true });
    const res = await fetch(`/api/kits/${kit.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return setState({ error: res?.status === 401 ? t("errors.unauthenticated") : t("errors.server", { detail: String(res?.status ?? "réseau") }) });
    router.push("/dashboard/kits");
    router.refresh();
  }

  const previewSrc = kit?.hasImage && !file ? `/api/kits/${kit.id}/preview.jpg?position=${position}&v=${kit.imageVersion}` : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card space-y-5 p-5">
        <label className="block text-sm font-bold">
          {t("name")}
          <input className="field-input mt-1" value={title} maxLength={120} placeholder={t("namePlaceholder")} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div>
          <p className="text-sm font-bold">{t("flyer")}</p>
          <p className="text-xs text-gris">{t("flyerHint")}</p>
          <label className="btn-sm-ghost mt-2 cursor-pointer">
            <ImagePlus className="h-4 w-4" /> {kit?.hasImage || file ? t("replaceFlyer") : t("chooseFlyer")}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          {file && <p className="mt-1 truncate text-xs font-semibold">{file.name}</p>}
        </div>

        <div>
          <p className="text-sm font-bold">{t("position")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QR_POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={`rounded-[10px] border-[1.5px] px-3 py-2 text-sm font-semibold ${position === p ? "border-noir bg-noir text-white" : "border-bord bg-white"}`}
              >
                {t(`positions.${p}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold">{t("template")}</p>
          <p className="text-xs text-gris">{t("templateHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["{PRENOM}", "{LIEN}", "{CODE}"].map((v) => (
              <button key={v} type="button" onClick={() => insert(v)} className="btn-sm-ghost !min-h-[32px] font-mono text-xs">
                + {v}
              </button>
            ))}
          </div>
          <textarea ref={area} className="field-input mt-2 min-h-[160px] font-sans" value={template} maxLength={3000} onChange={(e) => setTemplate(e.target.value)} />
        </div>

        {state.error && <p className="field-error">{state.error}</p>}
        {state.ok && <p className="text-sm font-semibold text-ok">{state.ok}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={state.busy} onClick={() => save("brouillon")} className="btn-sm-ghost">
            {state.busy ? t("saving") : t("saveDraft")}
          </button>
          <button type="button" disabled={state.busy} onClick={() => save("pret")} className="btn-sm-primary">
            {t("markReady")}
          </button>
          {kit && kit.status !== "archive" && (
            <button type="button" disabled={state.busy} onClick={() => save("archive")} className="btn-sm-ghost text-gris">
              {t("archive")}
            </button>
          )}
          {kit && (
            <button type="button" disabled={state.busy} onClick={remove} className="btn-sm-ghost ml-auto text-erreur">
              <Trash2 className="h-4 w-4" /> {t("delete")}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <p className="mb-2 text-sm font-bold">{t("preview")}</p>
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={previewSrc} src={previewSrc} alt="" className="w-full rounded-[10px] border border-bord" />
          ) : localUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={localUrl} alt="" className="w-full rounded-[10px] border border-bord" />
              <p className="mt-2 text-xs text-gris">{t("previewSave")}</p>
            </div>
          ) : (
            <p className="text-xs text-gris">{t("previewSave")}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="mb-2 text-sm font-bold">{t("message")}</p>
          <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[10px] bg-fond p-3 font-sans text-[13px] leading-relaxed">{message}</pre>
          <p className={`mt-2 text-xs font-semibold ${waLength > WA_URL_WARN_LENGTH ? "text-erreur" : "text-gris"}`}>{t("chars", { count: waLength })}</p>
          {waLength > WA_URL_WARN_LENGTH && <p className="mt-1 text-xs text-erreur">{t("tooLong")}</p>}
        </div>
      </div>
    </div>
  );
}
