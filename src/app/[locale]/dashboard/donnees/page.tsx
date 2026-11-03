import { auth } from "@/lib/auth";
import { DataSpacePanel } from "@/components/dashboard/documents/data-space-panel";

export default async function DashboardDataPage() {
  const session = await auth();
  return <DataSpacePanel currentUser={{ id: session?.user?.id ?? "", role: session?.user?.role ?? "STAFF" }} />;
}
