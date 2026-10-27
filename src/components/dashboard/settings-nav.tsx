"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Plug, ShieldCheck, Smartphone, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  { id: "notifications", icon: Bell },
  { id: "integrations", icon: Plug },
  { id: "security", icon: ShieldCheck },
  { id: "app", icon: Smartphone },
  { id: "log", icon: ScrollText },
] as const;

/**
 * Navigation des sections de la page Paramètres : colonne fixe sur ordinateur,
 * onglets défilants sur mobile. La section visible est surlignée.
 */
export function SettingsNav() {
  const t = useTranslations("dashboard.settings");
  const [active, setActive] = useState<string>(SETTINGS_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    SETTINGS_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label={t("navLabel")}
      className="sticky top-16 z-20 -mx-4 mb-6 border-b border-bord bg-fond/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:mb-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <ul className="-mb-px flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
        {SETTINGS_SECTIONS.map(({ id, icon: Icon }) => (
          <li key={id} className="flex-shrink-0">
            <a
              href={`#${id}`}
              onClick={() => setActive(id)}
              aria-current={active === id ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors lg:rounded-[10px] lg:border-b-0 lg:py-2.5",
                active === id
                  ? "border-rouge text-noir lg:bg-white lg:shadow-card"
                  : "border-transparent text-gris hover:text-noir lg:hover:bg-white/60"
              )}
            >
              <Icon className={cn("h-4 w-4", active === id && "text-rouge")} />
              {t(`sections.${id}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
