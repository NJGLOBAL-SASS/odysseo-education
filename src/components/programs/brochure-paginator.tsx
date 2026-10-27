"use client";

import { useEffect } from "react";

/** Hauteur utile d'une page A4 en px CSS : (297 mm − 16 mm de pied de page) / échelle d'impression 0,9. */
const PAGE_HEIGHT_PX = ((297 - 16) / 0.9) * (96 / 25.4);
/** Marge sous le bandeau des pages 2+ (mb-7) et marge de sécurité contre les arrondis d'impression. */
const HEADER_GAP_PX = 28;
const SAFETY_PX = 10;

type Unit = { el: HTMLElement; top: number; bottom: number };

const pageY = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

/** Titres et libellés à garder avec l'élément qui les suit. */
const isKeepWithNext = (el: HTMLElement) => el.matches("h2, h3, h4, [data-keep-next]");

/**
 * Découpe un bloc en unités insécables : les enfants directs d'une section
 * (cartes, tableau, encadré…), un titre restant collé à l'unité suivante.
 * Une section marquée `data-no-split` reste entière.
 */
function unitsOf(block: HTMLElement): HTMLElement[][] {
  const section = block.firstElementChild;
  const children =
    section instanceof HTMLElement && section.tagName === "SECTION" && !section.hasAttribute("data-no-split")
      ? [...section.children].filter((c): c is HTMLElement => c instanceof HTMLElement)
      : [block];
  const groups: HTMLElement[][] = [];
  let pending: HTMLElement[] = [];
  for (const child of children) {
    pending.push(child);
    if (!isKeepWithNext(child)) {
      groups.push(pending);
      pending = [];
    }
  }
  if (pending.length) groups.push(pending);
  return groups;
}

/**
 * Mise en page automatique des brochures PDF : le contenu s'enchaîne et un saut
 * de page (avec le bandeau `[data-print-header]`) n'est inséré que lorsque l'unité
 * suivante ne tient plus dans la page en cours. Les positions sont mesurées une
 * fois sur le flux continu, puis les bandeaux sont insérés.
 * Signale la fin avec `data-paginated` sur <html> (attendu par le script de génération).
 */
export function BrochurePaginator() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) =>
          img.complete ? null : new Promise((resolve) => img.addEventListener("load", resolve, { once: true }))
        )
      );
      if (cancelled) return;

      const root = document.querySelector<HTMLElement>("[data-paginate]");
      const template = document.querySelector<HTMLElement>("[data-print-header]");
      if (!root || !template) return;

      template.hidden = false;
      const headerSpace = template.offsetHeight + HEADER_GAP_PX;
      template.hidden = true;

      const units: Unit[] = [];
      for (const block of root.querySelectorAll<HTMLElement>(":scope > [data-block]")) {
        for (const group of unitsOf(block)) {
          const first = group[0]!;
          const last = group[group.length - 1]!;
          units.push({
            el: first,
            top: pageY(first) - parseFloat(getComputedStyle(first).marginTop),
            bottom: last.getBoundingClientRect().bottom + window.scrollY,
          });
        }
      }

      // Page 1 : la couverture commence en haut du document.
      let pageTop = pageY(root.closest<HTMLElement>(".brochure") ?? root);
      const breaks: HTMLElement[] = [];
      for (const unit of units) {
        if (unit.bottom - pageTop > PAGE_HEIGHT_PX - SAFETY_PX && unit.top - pageTop > headerSpace) {
          breaks.push(unit.el);
          pageTop = unit.top - headerSpace;
        }
      }

      for (const el of breaks) {
        const header = template.cloneNode(true) as HTMLElement;
        header.hidden = false;
        header.removeAttribute("data-print-header");
        header.style.breakBefore = "page";
        el.parentElement!.insertBefore(header, el);
        // La marge haute de l'unité ferait double emploi avec celle du bandeau.
        el.style.marginTop = "0";
      }
      document.documentElement.dataset.paginated = "1";
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
