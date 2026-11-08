"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { BellRing, CheckCircle2, Download, LogOut } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { canPromptInstall, isIos, isStandalone, promptInstall, subscribeInstall } from "@/lib/pwa/install";
import { isAcceptablePassword } from "@/lib/portal/password";
import { enablePush, getPushState, getServerPushState, subscribePush } from "@/lib/portal/push-client";

export function PasswordChange({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("portal.account");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<{ loading?: boolean; ok?: boolean; error?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isAcceptablePassword(password)) return setState({ error: t("errors.weakPassword") });
    setState({ loading: true });
    const res = await fetch("/api/portal/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: hasPassword ? current : undefined, password }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setCurrent("");
      setPassword("");
      setState({ ok: true });
    } else setState({ error: t(`errors.${["wrongPassword", "weakPassword"].includes(json.error) ? json.error : "generic"}` as "errors.generic") });
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {!hasPassword && <p className="text-[14px] text-gris">{t("setPassword")}</p>}
      {hasPassword && (
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">{t("current")}</span>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="field-input" />
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-semibold">{t("new")}</span>
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </label>
      {state.error && <p className="text-[14px] font-semibold text-erreur">{state.error}</p>}
      {state.ok && <p className="text-[14px] font-semibold text-ok">{t("saved")}</p>}
      <button type="submit" disabled={state.loading || !password} className="btn-sm-dark">
        {state.loading && <Spinner />} {t("save")}
      </button>
    </form>
  );
}

/** Installation de l'application « Mon dossier » et notifications de cet appareil. */
export function AppAndNotifications() {
  const t = useTranslations("portal.account");
  const promptable = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const [env, setEnv] = useState({ ready: false, standalone: false, ios: false });
  const push = useSyncExternalStore(subscribePush, getPushState, getServerPushState);

  useEffect(() => {
    setEnv({ ready: true, standalone: isStandalone(), ios: isIos() });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[14px] text-gris">{t("appText")}</p>
        <div className="mt-2.5">
          {!env.ready ? null : env.standalone ? (
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ok">
              <CheckCircle2 className="h-4 w-4" /> {t("installed")}
            </p>
          ) : promptable ? (
            <button type="button" onClick={() => promptInstall()} className="btn-sm-dark">
              <Download className="h-4 w-4" /> {t("install")}
            </button>
          ) : (
            <p className="rounded-[10px] bg-fond p-3 text-[14px]">{t("iosHelp")}</p>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[14px] font-semibold">{t("notifications")}</p>
        {push === "on" && (
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ok">
            <CheckCircle2 className="h-4 w-4" /> {t("notifyOn")}
          </p>
        )}
        {(push === "idle" || push === "working") && (
          <button type="button" onClick={() => void enablePush()} disabled={push === "working"} className="btn-sm-dark">
            {push === "working" ? <Spinner /> : <BellRing className="h-4 w-4" />} {t("notifyEnable")}
          </button>
        )}
        {push === "denied" && <p className="text-[14px] text-gris">{t("notifyDenied")}</p>}
        {push === "unsupported" && <p className="text-[14px] text-gris">{t("notifyUnsupported")}</p>}
      </div>
    </div>
  );
}

export function LogoutButton() {
  const t = useTranslations("portal.account");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => null);
    // Rien ne doit rester sur un appareil partagé.
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHE" });
    router.replace(`/${locale}/espace/connexion`);
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} disabled={loading} className="btn-ghost w-full">
      {loading ? <Spinner /> : <LogOut className="h-4 w-4" />} {t("logout")}
    </button>
  );
}
