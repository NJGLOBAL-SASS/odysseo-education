import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const CONTRACT_FILES = [
  "./content/contrats/**/*",
  "./src/assets/fonts/*.ttf",
  "./public/images/logo/logo-full-black-tight.png",
  "./node_modules/pdfkit/js/data/**/*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  // PWA : le service worker et le manifest ne doivent jamais rester en cache
  // navigateur, sinon les mises à jour de l'application n'arrivent pas.
  // Ancienne page Parents (retirée du site public) : les liens déjà partagés mènent à l'accueil.
  async redirects() {
    return [
      { source: "/:locale(fr|en)/parents", destination: "/:locale", permanent: false },
      { source: "/parents", destination: "/", permanent: false },
    ];
  },
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
      // PACK-11 : contrat partenaire (modèle, signature et cachet privés, polices, logo, pdfkit).
      "/api/partner-contract/**/*": CONTRACT_FILES,
      "/api/partner-applications/[id]": CONTRACT_FILES,
      "/api/partners/[id]/contract": CONTRACT_FILES,
      "/[locale]/partenaires/contrat/[token]": CONTRACT_FILES,
    },
  },
};

export default withNextIntl(nextConfig);
