"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeButton() {
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  async function enable() {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID non configuré");

      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permission refusée");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-ok">
        <Check className="h-4 w-4" /> Notifications push activées.
      </p>
    );
  }

  return (
    <div>
      <button onClick={enable} className="btn-dark !w-auto">
        <BellRing className="h-4 w-4" /> Activer les notifications push
      </button>
      {status === "error" && (
        <p className="mt-2 text-sm text-erreur">
          Impossible d&apos;activer les notifications (clé VAPID manquante ou permission refusée).
        </p>
      )}
    </div>
  );
}
