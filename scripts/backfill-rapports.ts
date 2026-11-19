/**
 * PACK-12 · Rattrapage : crée un brouillon de rapport (offres calculées par les règles) pour
 * chaque dossier qui n'en a pas. À lancer une fois après le déploiement :
 *   npm run backfill:rapports
 * Ne touche jamais un rapport existant. Les candidatures déjà traitées hors plateforme se
 * marquent ensuite « envoyées » depuis la liste (case à cocher → « Marquer rapport envoyé »).
 */
import { backfillDraftReports } from "../src/lib/report/draft";
import { prisma } from "../src/lib/prisma";

backfillDraftReports()
  .then((r) => {
    console.log(`Dossiers sans rapport : ${r.candidates} · brouillons créés : ${r.prepared}${r.failed.length ? ` · échecs : ${r.failed.join(", ")}` : ""}`);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
