import { CandidatesPanel } from "@/components/dashboard/candidates-panel";

export default function CandidatesListPage({ params }: { params: { locale: string } }) {
  return <CandidatesPanel locale={params.locale} />;
}
