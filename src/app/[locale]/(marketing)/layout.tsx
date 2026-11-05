import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieConsentBanner } from "@/components/cookies/cookie-consent-banner";
import { SiteTracking } from "@/components/tracking/site-tracking";
import { FloatingWhatsapp } from "@/components/trust/floating-whatsapp";
import { floatingWhatsappNumber } from "@/lib/content/trust";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsentBanner />
      <SiteTracking />
      <FloatingWhatsapp number={floatingWhatsappNumber()} />
    </div>
  );
}
