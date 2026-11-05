"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PlayCircle } from "lucide-react";

export type TestimonialCard = {
  id: string;
  name: string;
  flag?: string;
  country: string;
  program: string;
  city: string;
  year?: number;
  quote: string;
  photo: string;
  videoUrl?: string;
};

/**
 * Cartes témoignages (PACK-06). Carrousel horizontal (défilement natif) sur
 * mobile, grille sur ordinateur. `pick` : nombre de cartes tirées au hasard
 * (côté navigateur, à chaque visite) ; sans `pick`, toutes les cartes.
 */
export function TestimonialCards({ items, pick }: { items: TestimonialCard[]; pick?: number }) {
  const t = useTranslations("proof");
  const [shown, setShown] = useState(() => (pick ? items.slice(0, pick) : items));

  useEffect(() => {
    if (!pick || items.length <= pick) return;
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShown(shuffled.slice(0, pick));
  }, [items, pick]);

  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible">
      {shown.map((x) => (
        <li key={x.id} className="card flex w-[82%] flex-shrink-0 snap-start flex-col p-5 sm:w-[60%] md:w-auto">
          <div className="flex items-center gap-3">
            <Image src={x.photo} alt="" width={56} height={56} sizes="56px" className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-extrabold">{x.name}</p>
              <p className="text-sm text-gris">
                {x.flag && <span aria-hidden="true">{x.flag} </span>}
                {x.country}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm font-semibold text-rouge">
            {x.program} · {x.city}
            {x.year ? ` · ${t("departure", { year: x.year })}` : ""}
          </p>
          <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed">« {x.quote} »</blockquote>
          {x.videoUrl && (
            <a
              href={x.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold hover:text-rouge"
            >
              <PlayCircle className="h-5 w-5 text-rouge" /> {t("watchVideo")}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
