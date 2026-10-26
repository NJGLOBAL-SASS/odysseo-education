import { notFound } from "next/navigation";

// Toute URL qui ne correspond à aucune page affiche la 404 personnalisée
// ([locale]/not-found.tsx) au lieu de la page par défaut de Next.js.
export default function CatchAllNotFound() {
  notFound();
}
