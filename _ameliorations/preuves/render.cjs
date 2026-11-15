const { chromium } = require(process.argv[2]);
const fs = require('fs');
const [,, , dir, outDir, logoPath, orderJson, startArg] = process.argv;
const start = Number(startArg || 1); // numéro de la première image (suite des lettres déjà publiées)
const boxes = JSON.parse(fs.readFileSync(dir + '/boxes.json'));
const order = JSON.parse(orderJson);
const logo = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [i, id] of order.entries()) {
    const src = 'data:image/png;base64,' + fs.readFileSync(`${dir}/${id}.png`).toString('base64');
    const res = await p.evaluate(async ({ src, logo, bx }) => {
      const load = (u) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = u; });
      const img = await load(src), lg = await load(logo);
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      // Floutage : pixellisation forte (bloc ≈ hauteur du texte) puis flou, sur une zone élargie.
      for (const { b } of bx) {
        const pad = Math.max(6, b[3] * 0.35);
        const rx = Math.max(0, b[0] - pad), ry = Math.max(0, b[1] - pad), rw = Math.min(c.width - rx, b[2] + 2 * pad), rh = Math.min(c.height - ry, b[3] + 2 * pad);
        const block = Math.max(12, b[3] * 0.9);
        const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(rw / block)); t.height = Math.max(1, Math.round(rh / block));
        const tx = t.getContext('2d'); tx.drawImage(c, rx, ry, rw, rh, 0, 0, t.width, t.height);
        x.save(); x.imageSmoothingEnabled = false; x.filter = 'blur(3px)'; x.drawImage(t, 0, 0, t.width, t.height, rx, ry, rw, rh); x.restore();
        x.fillStyle = 'rgba(214,214,222,0.55)'; x.fillRect(rx, ry, rw, rh);
      }
      // Filigrane (variante B validée le 2026-11-15) : texte diagonal répété (14 %) + grand logo au centre (22 %).
      x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 6);
      x.font = `800 ${Math.round(c.width * 0.05)}px Inter, Arial, sans-serif`; x.fillStyle = 'rgba(255,0,0,0.14)'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const step = c.width * 0.05 * 4.2;
      for (let yy = -c.height; yy < c.height; yy += step) for (let xx = -c.width; xx < c.width; xx += c.width * 0.75) x.fillText('ODYSSEO EDUCATION', xx + (Math.round(yy / step) % 2 ? c.width * 0.375 : 0), yy);
      const cw = c.width * 0.62, ch = cw * lg.height / lg.width; x.globalAlpha = 0.22; x.drawImage(lg, -cw / 2, -ch / 2, cw, ch); x.globalAlpha = 1;
      x.restore();
      // Logo + mention en bas à droite.
      const lw = c.width * 0.22, lh = lw * lg.height / lg.width, m = c.width * 0.03;
      x.fillStyle = 'rgba(255,255,255,0.92)'; x.fillRect(c.width - lw - 2 * m, c.height - lh - 2.6 * m, lw + 1.4 * m, lh + 2.2 * m);
      x.drawImage(lg, c.width - lw - 1.3 * m, c.height - lh - 2.2 * m, lw, lh);
      x.font = `600 ${Math.round(c.width * 0.012)}px Inter, Arial, sans-serif`; x.fillStyle = '#5B5B66'; x.textAlign = 'center';
      x.fillText('Données personnelles masquées', c.width - lw / 2 - 1.3 * m, c.height - 0.75 * m);
      // Export : 1000 px de large, WebP.
      const o = document.createElement('canvas'); o.width = 1000; o.height = Math.round(c.height * 1000 / c.width);
      const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, o.width, o.height);
      let q = 0.8, url = o.toDataURL('image/webp', q);
      while (url.length * 0.75 > 145 * 1024 && q > 0.4) { q -= 0.05; url = o.toDataURL('image/webp', q); }
      return { url, q };
    }, { src, logo, bx: boxes[id] || [] });
    const name = `admission-${String(start + i).padStart(2, '0')}.webp`;
    const buf = Buffer.from(res.url.split(',')[1], 'base64');
    fs.writeFileSync(`${outDir}/${name}`, buf);
    console.log(name, id, Math.round(buf.length / 1024) + 'KB', 'q' + res.q.toFixed(2));
  }
  await b.close();
})();
