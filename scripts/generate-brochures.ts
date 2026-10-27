/**
 * Génère les brochures PDF depuis la mise en page A4 /[locale]/brochure/[slug]
 * (mêmes données que les pages /cursus : src/lib/programs.ts).
 *
 *   npm run brochures                      → versions anglaises uniquement
 *   npm run brochures -- --locales=fr,en   → régénère aussi les versions françaises
 *   BROCHURE_BASE_URL=http://localhost:3000 npm run brochures
 *
 * Prérequis : l'application tourne (npm run dev ou npm start) et Google Chrome
 * est installé (chemin modifiable via CHROME_PATH).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PROGRAMS, type Locale } from "../src/lib/programs";

const BASE_URL = process.env.BROCHURE_BASE_URL || "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : process.platform === "win32"
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
      : "google-chrome");
const PORT = 9400 + Math.floor(Math.random() * 400);
const locales = (process.argv.find((a) => a.startsWith("--locales="))?.split("=")[1] ?? "en").split(",") as Locale[];

const CONTACT = { fr: "Contact : contact.odysseo@gmail.com", en: "Contact: contact.odysseo@gmail.com" };
const footer = (locale: Locale) => `
  <div style="width:100%;padding:0 14mm;font-family:Inter,Arial,sans-serif;font-size:10px;color:#5B5B66;
              -webkit-print-color-adjust:exact;">
    <div style="border-top:1.5px solid #FF0000;padding-top:2.5mm;display:flex;justify-content:space-between;">
      <span>${CONTACT[locale]}</span>
      <span style="color:#FF0000;font-weight:700;"><span class="pageNumber"></span></span>
    </div>
  </div>`;

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "odysseo-brochures-"));
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], {
    stdio: "ignore",
  });

  try {
    type Target = { webSocketDebuggerUrl: string; type: string };
    let target: Target | undefined;
    for (let i = 0; i < 60 && !target; i++) {
      try {
        const list = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as Target[];
        target = list.find((t) => t.type === "page");
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    if (!target) throw new Error(`Chrome introuvable ou injoignable (${CHROME}).`);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pending = new Map<number, (v: any) => void>();
    ws.onmessage = (m) => {
      const d = JSON.parse(String(m.data));
      if (d.id && pending.has(d.id)) {
        pending.get(d.id)!(d.error ? Promise.reject(new Error(d.error.message)) : d.result);
        pending.delete(d.id);
      }
    };
    const send = (method: string, params: object = {}) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Promise<any>((resolve) => {
        const i = ++id;
        pending.set(i, resolve);
        ws.send(JSON.stringify({ id: i, method, params }));
      });

    await send("Page.enable");
    for (const locale of locales) {
      for (const program of PROGRAMS) {
        const url = `${BASE_URL}/${locale}/brochure/${program.slug}`;
        await send("Page.navigate", { url });
        // Attente : chargement, polices et images prêtes.
        for (let i = 0; i < 80; i++) {
          const { result } = await send("Runtime.evaluate", {
            expression: `document.readyState === "complete" && document.fonts.status === "loaded" && [...document.images].every(i => i.complete)`,
            returnByValue: true,
          });
          if (result.value) break;
          await new Promise((r) => setTimeout(r, 250));
        }
        await new Promise((r) => setTimeout(r, 400));

        const { data } = await send("Page.printToPDF", {
          printBackground: true,
          preferCSSPageSize: true,
          // Densité proche des grilles tarifaires d'origine (6 pages par brochure).
          scale: 0.9,
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate: footer(locale),
        });
        const out = path.join(process.cwd(), "public", program.pdf[locale]);
        fs.writeFileSync(out, Buffer.from(data, "base64"));
        console.log(`✓ ${locale.toUpperCase()} ${program.slug} → public${program.pdf[locale]}`);
      }
    }
    ws.close();
  } finally {
    // On attend la fermeture de Chrome avant de supprimer son profil temporaire.
    await new Promise((resolve) => {
      chrome.once("exit", resolve);
      chrome.kill();
    });
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
