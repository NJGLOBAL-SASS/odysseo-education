import "server-only";

import { get } from "@vercel/blob";

/** Sert un rapport PDF privé (jamais l'URL du store) : équipe ou lien privé de l'étudiant. */
export async function pdfResponse(blobUrl: string, fileName: string | null, download: boolean) {
  const blob = await get(blobUrl, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return new Response("Fichier indisponible.", { status: 502 });
  const name = (fileName || "Rapport_Odysseo.pdf").replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return new Response(blob.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
