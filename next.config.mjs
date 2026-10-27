import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  // PWA : le service worker et le manifest ne doivent jamais rester en cache
  // navigateur, sinon les mises à jour de l'application n'arrivent pas.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
  experimental: {
    // pdfkit lit ses polices (data/*.afm) relativement à son propre dossier :
    // empaqueté par webpack, le chemin casse (ENOENT → export PDF en 500).
    // On le charge donc depuis node_modules au moment de l'exécution...
    serverComponentsExternalPackages: ["pdfkit"],
    // ...et on force l'inclusion des polices dans la fonction serverless Vercel.
    outputFileTracingIncludes: {
      "/api/export/[resource]": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

export default withNextIntl(nextConfig);
