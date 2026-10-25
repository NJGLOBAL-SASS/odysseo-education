import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
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
