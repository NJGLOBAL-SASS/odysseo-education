import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

import { OG_IMAGE_SIZE, SITE_NAME } from "@/lib/seo";

/**
 * Image de partage 1200×630 (Open Graph / Twitter) — PACK-05.
 * Fond noir #0B0B0D, logo blanc Odysseo, barre rouge #FF0000, titre en blanc, police Inter.
 * Générée au build (routes statiques), à partir des fichiers du dépôt.
 */
const NOIR = "#0B0B0D";
const ROUGE = "#FF0000";

const root = process.cwd();
const asset = (...p: string[]) => readFile(path.join(root, ...p));

let cache: Promise<{ logo: string; regular: Buffer; extraBold: Buffer }> | null = null;
function loadAssets() {
  cache ??= Promise.all([
    asset("public", "images", "logo", "logo-full-white-tight.png"),
    asset("src", "assets", "fonts", "Inter-Regular.ttf"),
    asset("src", "assets", "fonts", "Inter-ExtraBold.ttf"),
  ]).then(([logo, regular, extraBold]) => ({
    logo: `data:image/png;base64,${logo.toString("base64")}`,
    regular,
    extraBold,
  }));
  return cache;
}

export async function renderOgImage({ title, subtitle }: { title: string; subtitle?: string }) {
  const { logo, regular, extraBold } = await loadAssets();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NOIR,
          color: "#FFFFFF",
          fontFamily: "Inter",
          padding: "64px 80px 0 80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logo} width={300} height={108} style={{ objectFit: "contain" }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 96, height: 8, background: ROUGE, marginBottom: 32 }} />
          <div
            style={{
              display: "flex",
              fontSize: title.length > 32 ? 64 : 76,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", marginTop: 24, fontSize: 34, fontWeight: 400, color: "#D4D4DA" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#A1A1AA", marginBottom: 32 }}>{SITE_NAME}</div>
          <div style={{ display: "flex", height: 14, marginLeft: -80, marginRight: -80, background: ROUGE }} />
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
