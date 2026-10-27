import { auth } from "@/lib/auth";
import { PartnersPanel } from "@/components/dashboard/partners-panel";

export default async function DashboardPartnersPage({ searchParams }: { searchParams: { onglet?: string } }) {
  const session = await auth();
  return (
    <PartnersPanel
      isAdmin={session?.user?.role === "ADMIN"}
      initialTab={searchParams.onglet === "demandes" ? "requests" : "partners"}
    />
  );
}
