import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";
import { get } from "@vercel/blob";

import { badgeLayout, type QrPosition } from "./rules";

const NOIR = "#0B0B0D";
const ROUGE = "#FF0000";

let fontCache: Promise<{ extraBold: Buffer; logo: string }> | null = null;
function assets() {
  fontCache ??= Promise.all([
    readFile(path.join(process.cwd(), "src", "assets", "fonts", "Inter-ExtraBold.ttf")),
    readFile(path.join(process.cwd(), "public", "images", "logo", "logo-full-white-tight.png")),
  ]).then(([extraBold, logo]) => ({ extraBold, logo: `data:image/png;base64,${logo.toString("base64")}` }));
  return fontCache;
}

/** Flyer d'origine depuis le stockage privé. */
export async function loadFlyer(url: string) {
  const blob = await get(url, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) throw new Error("flyerUnavailable");
  return Buffer.from(await new Response(blob.stream).arrayBuffer());
}

/**
 * Badge blanc aux coins arrondis : QR code (correction M, marge blanche) au-dessus de « Code : XXX »,
 * dessiné avec la police Inter du site (rendu identique partout, sans police système).
 */
async function badge(link: string, code: string, width: number, height: number) {
  const { extraBold } = await assets();
  const pad = Math.round(width * 0.06);
  const qrSize = width - pad * 2;
  const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1, width: qrSize * 2, color: { dark: NOIR, light: "#FFFFFF" } });
  const fontSize = Math.max(16, Math.round(width * 0.085));
  const res = new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width, height, background: "#FFFFFF", borderRadius: Math.round(width * 0.07), padding: pad, paddingBottom: Math.round(pad * 0.6) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={qrSize} height={qrSize} alt="" />
        <div style={{ display: "flex", flex: 1, alignItems: "center", fontFamily: "Inter", fontWeight: 800, fontSize, color: NOIR }}>
          Code : <span style={{ color: ROUGE, marginLeft: 6 }}>{code}</span>
        </div>
      </div>
    ),
    { width, height, fonts: [{ name: "Inter", data: extraBold, weight: 800, style: "normal" }] },
  );
  return Buffer.from(await res.arrayBuffer());
}

/** Flyer du partenaire : badge incrusté, JPEG qualité 82, largeur maximale 1080 px. */
export async function partnerFlyer(flyer: Buffer, opts: { link: string; code: string; position: QrPosition }) {
  const base = sharp(flyer).rotate();
  const meta = await base.metadata();
  const scale = Math.min(1, 1080 / (meta.width ?? 1080));
  const width = Math.round((meta.width ?? 1080) * scale);
  const height = Math.round((meta.height ?? 1080) * scale);
  const box = badgeLayout(width, height, opts.position);
  const badgePng = await badge(opts.link, opts.code, box.width, box.height);
  return sharp(flyer)
    .rotate()
    .resize({ width, height })
    .composite([{ input: badgePng, left: box.left, top: box.top }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/**
 * Aperçu WhatsApp (og:image) : 1200 × 630, flyer personnalisé centré sur un fond aux couleurs
 * de la charte, moins de 300 Ko (la qualité baisse jusqu'à passer sous la limite).
 */
export async function partnerOgImage(personalFlyer: Buffer) {
  const { logo } = await assets();
  const W = 1200;
  const H = 630;
  const flyerH = H - 60;
  const meta = await sharp(personalFlyer).metadata();
  const flyerW = Math.round(((meta.width ?? 1080) / (meta.height ?? 1350)) * flyerH);
  const flyer = await sharp(personalFlyer).resize({ height: flyerH }).toBuffer();
  const bg = new ImageResponse(
    (
      <div style={{ display: "flex", width: W, height: H, background: NOIR, alignItems: "flex-end" }}>
        <div style={{ display: "flex", width: "100%", height: 10, background: ROUGE }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" height={44} style={{ position: "absolute", left: 48, top: 40 }} />
      </div>
    ),
    { width: W, height: H },
  );
  const background = Buffer.from(await bg.arrayBuffer());
  const left = Math.max(260, Math.round((W - flyerW) / 2));
  let quality = 80;
  let out: Buffer = Buffer.alloc(0);
  while (quality >= 40) {
    out = await sharp(background)
      .composite([{ input: flyer, left: Math.min(left, W - flyerW), top: 30 }])
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (out.length < 300 * 1024) break;
    quality -= 10;
  }
  return out;
}
