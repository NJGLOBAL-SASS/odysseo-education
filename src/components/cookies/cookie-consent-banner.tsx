"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "odysseo_cookie_consent";

type Consent = { necessary: true; analytics: boolean; marketing: boolean };

function getAnonId() {
  let id = localStorage.getItem("odysseo_anon_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("odysseo_anon_id", id);
  }
  return id;
}

export function CookieConsentBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  async function save(consent: Consent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    setVisible(false);
    try {
      await fetch("/api/cookies/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: getAnonId(), ...consent }),
      });
    } catch {
      // La préférence reste valable localement même si la journalisation échoue.
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-bord bg-carte p-4 shadow-[0_-2px_12px_rgba(0,0,0,.08)]">
      <div className="wrap-site flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-rouge" />
          <div>
            <p className="font-semibold">{t("title")}</p>
            <p className="text-sm text-gris">{t("description")}</p>

            {customize && (
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked disabled className="h-4 w-4" />
                  {t("necessary")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="h-4 w-4"
                  />
                  {t("analytics")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="h-4 w-4"
                  />
                  {t("marketing")}
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-2">
          {customize ? (
            <button
              className="btn-dark !w-auto"
              onClick={() => save({ necessary: true, analytics, marketing })}
            >
              {t("save")}
            </button>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setCustomize(true)}>
                {t("customize")}
              </button>
              <button
                className="btn-ghost"
                onClick={() => save({ necessary: true, analytics: false, marketing: false })}
              >
                {t("rejectAll")}
              </button>
              <button
                className="btn-primary"
                onClick={() => save({ necessary: true, analytics: true, marketing: true })}
              >
                {t("acceptAll")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
