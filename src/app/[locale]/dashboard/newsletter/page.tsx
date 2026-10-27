import { auth } from "@/lib/auth";
import { NewsletterPanel } from "@/components/dashboard/newsletter-panel";

export default async function DashboardNewsletterPage({ params }: { params: { locale: string } }) {
  const session = await auth();
  return <NewsletterPanel locale={params.locale} isAdmin={session?.user?.role === "ADMIN"} />;
}
