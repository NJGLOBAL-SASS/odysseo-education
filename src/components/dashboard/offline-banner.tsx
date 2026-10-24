"use client";

import { WifiOff } from "lucide-react";

export function OfflineBanner({ cachedAt }: { cachedAt: string | null }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-brand border-[1.5px] border-[#E8D26B] bg-[#FFF8D6] px-3.5 py-2.5 text-sm text-[#5B4A00]">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>
        Mode hors-ligne — données en cache
        {cachedAt ? ` du ${new Date(cachedAt).toLocaleString("fr-FR")}` : ""}. Les actions
        (changement de statut, ajout, envoi) sont indisponibles jusqu&apos;au retour de la connexion.
      </span>
    </div>
  );
}
