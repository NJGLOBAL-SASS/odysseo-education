import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieConsentBanner } from "@/components/cookies/cookie-consent-banner";
import { SiteTracking } from "@/components/tracking/site-tracking";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsentBanner />
      <SiteTracking />
    </div>
  );
}
