import { Suspense } from "react";

import { CandidatesPanel } from "@/components/dashboard/candidates-panel";
import { SkeletonTable } from "@/components/ui/skeleton";

export default function CandidatesListPage({ params }: { params: { locale: string } }) {
  // Suspense : le filtre rapide se lit dans l'URL (?filtre=relancer, lien de l'alerte de 8 h).
  return (
    <Suspense fallback={<SkeletonTable />}>
      <CandidatesPanel locale={params.locale} />
    </Suspense>
  );
}
