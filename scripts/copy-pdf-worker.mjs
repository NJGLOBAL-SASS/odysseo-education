// Copie le worker pdf.js dans public/ : webpack (Terser) ne sait pas l'empaqueter,
// et il doit rester à la même version que pdfjs-dist. Lancé par `npm install`.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(dirname(require.resolve("pdfjs-dist/package.json")), "legacy/build/pdf.worker.min.mjs");
const target = join(root, "public/pdfjs/pdf.worker.min.mjs");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("[pdfjs] worker copié dans public/pdfjs/");
