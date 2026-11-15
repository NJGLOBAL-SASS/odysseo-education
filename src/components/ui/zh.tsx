import { cn } from "@/lib/utils";

/**
 * Mention chinoise accolée à un titre (ex. « Comment ça marche 申请流程 »).
 * Décorative : masquée aux lecteurs d'écran, le titre français ou anglais suffit.
 */
export function Zh({ children, className }: { children: string; className?: string }) {
  return (
    <span lang="zh-Hans" aria-hidden="true" className={cn("ml-2 inline-block whitespace-nowrap align-middle text-[0.7em] font-semibold tracking-normal text-gris/80", className)}>
      {children}
    </span>
  );
}
