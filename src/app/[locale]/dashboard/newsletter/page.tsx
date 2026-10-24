import { NewsletterPanel } from "@/components/dashboard/newsletter-panel";

export default function DashboardNewsletterPage({ params }: { params: { locale: string } }) {
  return <NewsletterPanel locale={params.locale} />;
}
