"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { BellRing, CheckCircle2, Share, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { isIos, isStandalone } from "@/lib/pwa/install";
import {
  PUSH_CONTEXT_EVENT,
  enablePush,
  getPushState,
  getServerPushState,
  subscribePush,
  type PushContext,
} from "@/lib/portal/push-client";

const SNOOZE_KEY = "odysseo_portal_push_snooze";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const FIRST_DELAY_MS = 2500;

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    // stockage indisponible : la bannière reviendra à la prochaine visite
  }
}

/**
 * Proposition d'activation des notifications, sur toutes les pages de l'espace :
 *  - affichée peu après l'ouverture si l'appareil peut recevoir des notifications et
 *    qu'elles ne sont ni activées ni refusées (« Plus tard » la masque 3 jours) ;
 *  - relancée avec un message adapté après l'envoi d'un message ou de documents ;
 *  - sur iPhone hors application installée, explique qu'il faut d'abord l'installer ;
 *  - si l'autorisation est déjà donnée, l'abonnement se fait sans rien afficher.
 */
export function PushPrompt() {
  const t = useTranslations("portal.pushPrompt");
  const push = useSyncExternalStore(subscribePush, getPushState, getServerPushState);
  const [context, setContext] = useState<PushContext | null>(null);
  const [ios, setIos] = useState(false);
  const [done, setDone] = useState(false);
  const [usedContexts] = useState(() => new Set<PushContext>());

  useEffect(() => {
    setIos(isIos() && !isStandalone());
    const timer = window.setTimeout(() => {
      if (!snoozed()) setContext((c) => c ?? "default");
    }, FIRST_DELAY_MS);
    const onContext = (e: Event) => {
      const detail = (e as CustomEvent<PushContext>).detail;
      if (usedContexts.has(detail)) return;
      usedContexts.add(detail);
      setContext(detail);
    };
    window.addEventListener(PUSH_CONTEXT_EVENT, onContext);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(PUSH_CONTEXT_EVENT, onContext);
    };
  }, [usedContexts]);

  // Message de confirmation bref, puis la bannière disparaît.
  useEffect(() => {
    if (!done || push !== "on") return;
    const timer = window.setTimeout(() => setContext(null), 3000);
    return () => window.clearTimeout(timer);
  }, [done, push]);

  const iosInstall = push === "unsupported" && ios;
  const visible = context !== null && (push === "idle" || push === "working" || iosInstall || (done && push === "on"));
  if (!visible) return null;

  function later() {
    snooze();
    setContext(null);
  }

  async function activate() {
    await enablePush();
    setDone(true);
  }

  const key = context === "message" ? "message" : context === "document" ? "document" : "default";

  return (
    <div
      role="region"
      aria-label={t("label")}
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[480px] animate-toast-in rounded-[14px] border border-bord bg-white p-4 shadow-[0_10px_30px_rgba(11,11,13,.18)] sm:bottom-6"
    >
      {done && push === "on" ? (
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ok">
          <CheckCircle2 className="h-5 w-5" /> {t("enabled")}
        </p>
      ) : (
        <>
          <button type="button" onClick={later} aria-label={t("close")} className="absolute right-2 top-2 rounded-full p-1.5 text-gris hover:bg-fond">
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3 pr-6">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rouge/10 text-rouge">
              {iosInstall ? <Share className="h-[18px] w-[18px]" /> : <BellRing className="h-[18px] w-[18px]" />}
            </span>
            <div>
              <p className="text-[15px] font-bold">{iosInstall ? t("iosTitle") : t(`titles.${key}`)}</p>
              <p className="mt-0.5 text-[14px] text-gris">{iosInstall ? t("iosText") : t("text")}</p>
            </div>
          </div>
          {!iosInstall && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={activate} disabled={push === "working"} className="btn-sm-dark flex-1 justify-center">
                {push === "working" ? <Spinner /> : <BellRing className="h-4 w-4" />} {t("enable")}
              </button>
              <button type="button" onClick={later} className="btn-ghost !min-h-[40px] flex-1 justify-center text-[14px]">
                {t("later")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
