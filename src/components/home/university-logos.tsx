/* eslint-disable @next/next/no-img-element -- logos de formats variés (PNG/JPG), déjà à la bonne taille */
import { getTranslations } from "next-intl/server";

import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getUniversityLogos, type UniversityLogo } from "@/lib/content/trust";

/** Logos montrés au maximum (2 rangées), dans l'ordre du fichier. */
const MAX_SHOWN = 48;

/**
 * Bandeau de logos de l'accueil (content/universites.json) : les 48 premiers (catalogue
 * d'abord), puis un lien vers /universites qui les montre tous. Chaque logo ouvre la fiche
 * Odysseo de l'université (/universites/[id]), jamais le site de l'université. Non rendu si vide.
 * Deux rangées qui défilent en sens inverse ; arrêt au survol ; immobile (et
 * défilable au doigt) si l'utilisateur a demandé moins d'animations.
 */
export async function UniversityLogos() {
  const all = getUniversityLogos();
  if (all.length === 0) return null;
  const t = await getTranslations("home.logos");

  const shown = all.slice(0, MAX_SHOWN);
  const half = Math.ceil(shown.length / 2);
  const rows = shown.length > 12 ? [shown.slice(0, half), shown.slice(half)] : [shown];

  return (
    <section className="border-b border-bord bg-white py-10" aria-labelledby="logos-title">
      <div className="wrap-site mb-6 text-center">
        <h2 id="logos-title" className="text-xl font-extrabold sm:text-2xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-[15px] text-gris">{t("intro")}</p>
      </div>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <LogoRow key={i} items={row} reverse={i === 1} />
        ))}
      </div>
      {all.length > shown.length && (
        <div className="mt-6 text-center">
          <Link href="/universites" className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold hover:text-rouge">
            {t("all", { count: all.length })} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function LogoRow({ items, reverse }: { items: UniversityLogo[]; reverse: boolean }) {
  const duration = `${Math.max(30, items.length * 3.5)}s`;
  return (
    <div className="group relative overflow-x-auto motion-safe:overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
      <ul
        className={`flex w-max gap-3 px-3 motion-safe:animate-marquee group-hover:[animation-play-state:paused] ${reverse ? "[animation-direction:reverse]" : ""}`}
        style={{ ["--marquee-duration" as string]: duration }}
      >
        {/* Liste doublée pour une boucle continue ; la copie est masquée aux lecteurs d'écran. */}
        {[...items, ...items].map((u, i) => (
          <li
            key={`${u.id}-${i}`}
            aria-hidden={i >= items.length ? true : undefined}
            className={`${i >= items.length ? "motion-reduce:hidden " : ""}w-[124px] flex-shrink-0`}
          >
            <Link
              href={`/universites/${u.id}`}
              tabIndex={i >= items.length ? -1 : undefined}
              className="flex h-full flex-col items-center gap-2 rounded-brand border border-bord bg-white p-3 text-center hover:border-noir"
            >
              <img src={u.logo} alt="" loading="lazy" decoding="async" className="h-14 w-14 object-contain" />
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-gris">{u.nom_en}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
