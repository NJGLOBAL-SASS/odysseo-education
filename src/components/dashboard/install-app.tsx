"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, MonitorSmartphone, Share, SquarePlus, X, CheckCircle2 } from "lucide-react";

import {
  canPromptInstall,
  isIos,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa/install";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";

const BANNER_DISMISS_KEY = "odysseo_install_banner_dismissed";

function useInstallState() {
  const promptable = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const [env, setEnv] = useState({ ready: false, standalone: false, ios: false });
  useEffect(() => setEnv({ ready: true, standalone: isStandalone(), ios: isIos() }), []);
  return { ...env, promptable, available: !env.standalone && (promptable || env.ios) };
}

/** Marche à suivre sur iPhone / iPad (Safari n'expose pas de bouton d'installation). */
function IosInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-noir/50 p-3 backdrop-blur-[2px] sm:items-center">
      <div className="w-full max-w-sm animate-fade-up rounded-brand bg-white p-5 shadow-pop" role="dialog" aria-modal="true">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-96.png" alt="" className="h-11 w-11 rounded-[10px]" />
            <div>
              <p className="font-extrabold">Installer Odysseo</p>
              <p className="text-xs text-gris">Sur l&apos;écran d&apos;accueil de votre iPhone</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gris hover:bg-fond" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-noir text-xs font-bold text-white">1</span>
            <span>
              Dans Safari, touchez <b>Partager</b> <Share className="mb-0.5 inline h-4 w-4" /> en bas de l&apos;écran.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-noir text-xs font-bold text-white">2</span>
            <span>
              Choisissez <b>Sur l&apos;écran d&apos;accueil</b> <SquarePlus className="mb-0.5 inline h-4 w-4" />.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-noir text-xs font-bold text-white">3</span>
            <span>
              Touchez <b>Ajouter</b>, puis ouvrez Odysseo depuis l&apos;icône. Activez ensuite les notifications push dans
              Paramètres : sur iPhone, elles ne fonctionnent que dans l&apos;application installée.
            </span>
          </li>
        </ol>
        <button onClick={onClose} className="btn-sm-dark mt-5 w-full">
          J&apos;ai compris
        </button>
      </div>
    </div>
  );
}

function useInstallAction() {
  const toast = useToast();
  const [showIos, setShowIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const state = useInstallState();

  async function install() {
    if (state.promptable) {
      setBusy(true);
      const outcome = await promptInstall();
      setBusy(false);
      if (outcome === "accepted") toast({ tone: "success", title: "Application installée", description: "Retrouvez Odysseo sur votre écran d'accueil." });
      return;
    }
    if (state.ios) setShowIos(true);
  }

  const modal = showIos ? <IosInstructions onClose={() => setShowIos(false)} /> : null;
  return { state, install, busy, modal };
}

/** Entrée du menu utilisateur. */
export function InstallAppMenuItem({ onDone }: { onDone?: () => void }) {
  const { state, install, busy, modal } = useInstallAction();
  if (!state.available) return modal;
  return (
    <>
      <button
        onClick={async () => {
          await install();
          onDone?.();
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-fond"
      >
        {busy ? <Spinner /> : <Download className="h-4 w-4 text-gris" />} Installer l&apos;application
      </button>
      {modal}
    </>
  );
}

/** Carte de la page Paramètres : état et bouton d'installation. */
export function InstallAppCard() {
  const { state, install, busy, modal } = useInstallAction();

  return (
    <section className="card p-5">
      <h2 className="section-title mb-1">Application</h2>
      <p className="mb-4 text-xs text-gris">
        Installez le tableau de bord comme une application : icône sur l&apos;écran d&apos;accueil, ouverture en plein
        écran, notifications push et consultation hors-ligne.
      </p>
      {!state.ready ? (
        <div className="skeleton h-[38px] w-56 rounded-[10px]" />
      ) : state.standalone ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-ok">
          <CheckCircle2 className="h-4 w-4" /> Vous utilisez l&apos;application installée.
        </p>
      ) : state.available ? (
        <button onClick={install} disabled={busy} className="btn-sm-dark">
          {busy ? <Spinner /> : <Download className="h-4 w-4" />} Installer l&apos;application
        </button>
      ) : (
        <p className="flex items-start gap-2 text-sm text-gris">
          <MonitorSmartphone className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Déjà installée sur cet appareil, ou navigateur sans installation possible. Sur ordinateur, utilisez Chrome
          ou Edge (icône d&apos;installation dans la barre d&apos;adresse) ; sur iPhone, Safari.
        </p>
      )}
      {modal}
    </section>
  );
}

/** Bandeau discret sur mobile, une seule fois (masquable). */
export function InstallAppBanner() {
  const { state, install, busy, modal } = useInstallAction();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(BANNER_DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, "1");
    } catch {
      // stockage indisponible (navigation privée) : le bandeau reviendra simplement
    }
  }

  if (!state.available || dismissed) return modal;

  return (
    <>
      <div className="mb-5 flex animate-fade-up items-center gap-3 rounded-brand bg-noir p-3 pr-2 text-white md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-96.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-[10px] ring-1 ring-white/15" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installer l&apos;application</p>
          <p className="text-xs text-[#B4B4BE]">Accès en un geste et alertes des nouveaux dossiers.</p>
        </div>
        <button onClick={install} disabled={busy} className="btn-sm-primary !min-h-[34px] flex-shrink-0 !px-3 text-xs">
          {busy ? <Spinner className="h-3.5 w-3.5" /> : "Installer"}
        </button>
        <button onClick={dismiss} className="rounded-lg p-1 text-[#B4B4BE] hover:bg-white/10" aria-label="Masquer">
          <X className="h-4 w-4" />
        </button>
      </div>
      {modal}
    </>
  );
}
