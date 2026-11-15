"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";

export type VideoCard = {
  id: string;
  name: string;
  flag?: string;
  country: string;
  program: string;
  city: string;
  year?: number;
  poster: string;
  /** MP4 hébergé par Odysseo (lu par la balise <video>). */
  file?: string;
  /** Lecteur YouTube / TikTok intégré. */
  embed?: string;
  /** Lien d'origine, ouvert dans un nouvel onglet si aucun lecteur intégré n'est possible. */
  link?: string;
};

/**
 * Témoignages vidéo au format vertical (9:16). Rien n'est chargé avant le clic :
 * l'affiche est la photo de l'étudiant, puis la vidéo démarre à sa place.
 * Carrousel au doigt sur mobile, grille sur ordinateur.
 */
export function VideoTestimonialCards({ items }: { items: VideoCard[] }) {
  const t = useTranslations("home.videos");
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
      {items.map((x) => {
        const isPlaying = playing === x.id;
        const canPlayHere = Boolean(x.file || x.embed);
        return (
          <li key={x.id} className="w-[72%] flex-shrink-0 snap-start sm:w-[44%] md:w-auto">
            <div className="relative aspect-[9/16] overflow-hidden rounded-brand bg-noir">
              {isPlaying && x.file ? (
                <video src={x.file} poster={x.poster} controls autoPlay playsInline className="h-full w-full object-cover" />
              ) : isPlaying && x.embed ? (
                <iframe
                  src={x.embed}
                  title={t("play", { name: x.name })}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <>
                  <Image src={x.poster} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 72vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-noir/90 via-noir/10 to-transparent" />
                  {canPlayHere ? (
                    <button
                      type="button"
                      onClick={() => setPlaying(x.id)}
                      aria-label={t("play", { name: x.name })}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <PlayBadge />
                    </button>
                  ) : (
                    x.link && (
                      <a
                        href={x.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("play", { name: x.name })}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <PlayBadge />
                      </a>
                    )
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="font-extrabold">
                      {x.flag && <span aria-hidden="true">{x.flag} </span>}
                      {x.name}
                    </p>
                    <p className="text-sm text-[#D4D4DA]">
                      {x.program} · {x.city}
                      {x.year ? ` · ${t("departure", { year: x.year })}` : ""}
                    </p>
                  </div>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PlayBadge() {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rouge text-white shadow-pop transition-transform hover:scale-105">
      <Play className="ml-1 h-7 w-7" fill="currentColor" />
    </span>
  );
}
