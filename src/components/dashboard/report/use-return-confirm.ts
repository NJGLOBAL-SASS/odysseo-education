"use client";

import { useEffect, useState } from "react";

/**
 * Sans API WhatsApp, on ne peut pas savoir si le message est parti : après un clic sur
 * « Envoyer » (WhatsApp ou partage), on pose la question au retour sur l'onglet
 * (événement visibilitychange) — ODY-15 §5.2.
 */
export function useReturnConfirm<T>() {
  const [pending, setPending] = useState<T | null>(null);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!pending) return;
    let left = false;
    const onChange = () => {
      if (document.visibilityState === "hidden") left = true;
      else if (left) setAsk(true);
    };
    document.addEventListener("visibilitychange", onChange);
    // Ordinateur : WhatsApp Web s'ouvre parfois sans masquer l'onglet ; on demande quand même après quelques secondes.
    const timer = window.setTimeout(() => setAsk(true), 8000);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.clearTimeout(timer);
    };
  }, [pending]);
  return {
    pending,
    ask,
    start: (value: T) => {
      setAsk(false);
      setPending(value);
    },
    clear: () => {
      setAsk(false);
      setPending(null);
    },
  };
}
