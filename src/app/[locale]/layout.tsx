import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";

import { locales } from "@/i18n/config";
import { WebAnalytics } from "@/components/tracking/web-analytics";
import { PAGE_SEO, SITE_NAME, SITE_URL, fullTitle, toLocale } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Valeurs par défaut de toutes les pages (chaque page publique précise les
// siennes via src/lib/seo.ts) : URL absolue des balises og:image / canonical.
export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = toLocale(params.locale);
  const home = PAGE_SEO.home[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: fullTitle(home.title), template: `%s · ${SITE_NAME}` },
    description: home.description,
    applicationName: SITE_NAME,
    icons: { icon: "/images/logo/favicon-64.png" },
    openGraph: {
      siteName: SITE_NAME,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const messages = await getMessages();

  return (
    <html lang={params.locale} className={inter.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <WebAnalytics />
      </body>
    </html>
  );
}
