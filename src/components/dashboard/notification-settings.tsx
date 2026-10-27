"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Smartphone, BellRing, Sheet, CheckCircle2, AlertTriangle, XCircle, Send } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type ChannelHealth = {
  key: "EMAIL" | "WHATSAPP" | "PUSH" | "SHEETS";
  name: string;
  state: "ok" | "warning" | "error";
  detail: string;
  testable: boolean;
};

const ICONS = { EMAIL: Mail, WHATSAPP: Smartphone, PUSH: BellRing, SHEETS: Sheet };
const STATE = {
  ok: { Icon: CheckCircle2, cls: "text-ok" },
  warning: { Icon: AlertTriangle, cls: "text-[#8A6200]" },
  error: { Icon: XCircle, cls: "text-erreur" },
};

export function ChannelHealthList({ channels }: { channels: ChannelHealth[] }) {
  const t = useTranslations("dashboard.settings");
  const toast = useToast();
  const router = useRouter();
  const [testing, setTesting] = useState<string | null>(null);

  async function test(channel: ChannelHealth["key"]) {
    setTesting(channel);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const json = (await res.json()) as { ok: boolean; status?: string; error?: string };
      toast(
        json.ok
          ? { tone: "success", title: t("testSent"), description: t("testSentText") }
          : { tone: "error", title: t("testFailed"), description: json.error ?? json.status }
      );
      router.refresh();
    } catch {
      toast({ tone: "error", title: t("testError"), description: t("testNetwork") });
    } finally {
      setTesting(null);
    }
  }

  return (
    <ul className="divide-y divide-bord">
      {channels.map((c) => {
        const Icon = ICONS[c.key];
        const s = STATE[c.state];
        return (
          <li key={c.key} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0 sm:items-center">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-fond">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold">
                {c.name}
                <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", s.cls)}>
                  <s.Icon className="h-3.5 w-3.5" /> {t(`state.${c.state}`)}
                </span>
              </p>
              <p className="text-xs text-gris [overflow-wrap:anywhere]">{c.detail}</p>
            </div>
            {c.testable && (
              <button
                onClick={() => test(c.key)}
                disabled={testing !== null}
                className="btn-sm-ghost !min-h-[34px] flex-shrink-0 text-xs"
              >
                {testing === c.key ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                {testing === c.key ? t("testing") : t("test")}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-gris">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-noir" : "bg-[#D4D4DA]"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}

export function NotificationPreferences({
  initial,
}: {
  initial: { emailOnNewLead: boolean; pushOnNewLead: boolean };
}) {
  const t = useTranslations("dashboard.settings");
  const toast = useToast();
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<keyof typeof initial | null>(null);

  async function update(key: keyof typeof initial, value: boolean) {
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSaving(key);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error();
      toast({ tone: "success", title: t("prefSaved") });
    } catch {
      setPrefs(previous);
      toast({ tone: "error", title: t("prefFailed") });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="divide-y divide-bord">
      <Toggle
        label={t("prefEmail")}
        description={t("prefEmailHint")}
        checked={prefs.emailOnNewLead}
        disabled={saving !== null}
        onChange={(v) => update("emailOnNewLead", v)}
      />
      <Toggle
        label={t("prefPush")}
        description={t("prefPushHint")}
        checked={prefs.pushOnNewLead}
        disabled={saving !== null}
        onChange={(v) => update("pushOnNewLead", v)}
      />
    </div>
  );
}
