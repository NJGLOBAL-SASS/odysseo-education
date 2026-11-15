"use client";
/* eslint-disable @next/next/no-img-element -- affiches déjà en WebP à la bonne taille */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";

import { Link } from "@/i18n/navigation";

export type CampusVideoCard = {
  id: string;
  youtube: string;
  title: string;
  channel: string;
  universityId: string;
  universityName: string;
  city?: string;
  poster?: string;
  posterCredit?: string;
};

/**
 * Vidéos officielles des universités (16:9). Rien n'est chargé depuis YouTube avant le clic :
 * l'affiche est la photo du campus (Wikimedia Commons, créditée) ou la vignette YouTube.
 */
export function CampusVideoCards({ items, showUniversityLink = true }: { items: CampusVideoCard[]; showUniversityLink?: boolean }) {
  const t = useTranslations("campusVideos");
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <li key={v.id} className="card overflow-hidden">
          <div className="relative aspect-video bg-noir">
            {playing === v.id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&rel=0&playsinline=1`}
                title={v.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : (
              <button type="button" onClick={() => setPlaying(v.id)} className="group absolute inset-0" aria-label={t("play", { title: v.title })}>
                <img
                  src={v.poster ?? `https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-noir/70 via-transparent to-transparent" />
                <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rouge text-white shadow-pop transition-transform group-hover:scale-110">
                  <Play className="ml-1 h-6 w-6" fill="currentColor" />
                </span>
              </button>
            )}
          </div>
          <div className="p-4">
            <p className="font-extrabold leading-snug">{v.title}</p>
            <p className="mt-1 text-sm text-gris">
              {showUniversityLink ? (
                <Link href={`/universites/${v.universityId}`} className="font-semibold text-noir hover:text-rouge">
                  {v.universityName}
                </Link>
              ) : (
                v.universityName
              )}
              {v.city ? ` · ${v.city}` : ""}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-gris">
              {t("official", { channel: v.channel })}
              {v.posterCredit && playing !== v.id ? ` · ${v.posterCredit}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
