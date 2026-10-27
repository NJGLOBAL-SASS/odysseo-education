"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Spinner } from "@/components/ui/spinner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "idle" | "working" | "done" | "unsupported" | "denied" | "error";

export function PushSubscribeButton() {
  const t = useTranslations("dashboard.settings.push");
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState("");

  // Cet appareil est-il déjà abonné ?
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "done" : "idle"))
      .catch(() => setStatus("idle"));
  }, []);

  async function enable() {
    setStatus("working");
    setError("");
    try {
      const { publicKey } = (await (await fetch("/api/push/public-key")).json()) as { publicKey: string | null };
      if (!publicKey) throw new Error("Clé VAPID absente côté serveur (VAPID_PUBLIC_KEY).");

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "idle");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Enregistrement de l'abonnement refusé par le serveur.");

      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  if (status === "checking") {
    return <div className="skeleton h-[38px] w-60 rounded-[10px]" />;
  }

  if (status === "done") {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-ok">
        <Check className="h-4 w-4" /> {t("enabled")}
      </p>
    );
  }

  if (status === "unsupported") {
    // Sur iPhone, Safari n'expose PushManager que dans l'application installée.
    const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
    return <p className="text-sm text-gris">{ios ? t("iosHint") : t("unsupported")}</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-erreur">{t("denied")}</p>
    );
  }

  return (
    <div>
      <button onClick={enable} disabled={status === "working"} className="btn-sm-dark">
        {status === "working" ? <Spinner /> : <BellRing className="h-4 w-4" />}
        {status === "working" ? t("enabling") : t("enable")}
      </button>
      {status === "error" && <p className="mt-2 text-sm text-erreur">{error}</p>}
    </div>
  );
}
