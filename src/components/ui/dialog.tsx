"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Spinner } from "./spinner";
import { cn } from "@/lib/utils";

/**
 * Fenêtre modale du dashboard : panneau en bas d'écran sur mobile, centrée
 * sur ordinateur. Échap et clic sur le voile ferment (sauf pendant un envoi).
 */
export function Dialog({
  title,
  description,
  icon,
  tone = "default",
  onClose,
  busy,
  children,
  footer,
  size = "md",
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger" | "success";
  onClose: () => void;
  busy?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const t = useTranslations("dashboard.common");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-noir/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[92dvh] w-full animate-fade-up flex-col overflow-hidden rounded-t-brand bg-white shadow-pop sm:rounded-brand",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5">
          {icon && (
            <span
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                tone === "danger" && "bg-erreur-fond text-erreur",
                tone === "success" && "bg-[#E1F6EA] text-ok",
                tone === "default" && "bg-fond text-noir"
              )}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold leading-snug">{title}</h2>
            {description && <div className="mt-1 text-sm text-gris">{description}</div>}
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="-mr-1 -mt-1 rounded-lg p-1 text-gris hover:bg-fond hover:text-noir"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="flex-1 overflow-y-auto px-5 pb-2">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-bord bg-[#FAFAFB] px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Confirmation d'une action irréversible (suppression...). */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
  icon,
}: {
  title: string;
  text: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  icon?: ReactNode;
}) {
  const t = useTranslations("dashboard.common");
  return (
    <Dialog
      title={title}
      description={text}
      icon={icon}
      tone="danger"
      size="sm"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-sm-ghost">
            {t("cancel")}
          </button>
          <button onClick={onConfirm} disabled={busy} className="btn-sm bg-erreur text-white hover:bg-rouge-fonce">
            {busy && <Spinner />} {confirmLabel}
          </button>
        </>
      }
    />
  );
}
