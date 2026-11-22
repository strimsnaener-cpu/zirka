/* Автоматична обвідка силуету з зображення (альфа-канал) → полігон.
   Використовується для підставки: з SVG-макета або з вашого PNG-фото з прозорим фоном.
   Береться НАЙБІЛЬША суцільна фігура (дрібні відірвані елементи ігноруються). */

const DIRS = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]]; // за годинниковою (y донизу)
const dirIndex = (dx, dy) => DIRS.findIndex(([x, y]) => x === dx && y === dy);

/** маска найбільшої зв’язної області */
function largestMask(canvas, threshold) {
  const { width: w, height: h } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = data[i * 4 + 3] > threshold ? 1 : 0;
  const label = new Int32Array(w * h);
  let best = 0, bestSize = 0, id = 0;
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (!on[i] || label[i]) continue;
    id++;
    let size = 0;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (on[q] && !label[q]) { label[q] = id; stack.push(q); }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
  }
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = label[i] === best ? 1 : 0;
  return { mask, w, h };
}

/** Moore-neighbour tracing зовнішнього контуру. Повертає [[x,y],…] у пікселях */
export function traceAlpha(canvas, { threshold = 110, epsilon = 1.1 } = {}) {
  const { mask, w, h } = largestMask(canvas, threshold);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) { sx = x; sy = y; break outer; }
  if (sx < 0) return [];
  const pts = [[sx, sy]];
  let cx = sx, cy = sy, b = 0; // прийшли «із заходу»
  let firstMove = null;
  for (let guard = 0; guard < w * h * 2; guard++) {
    let k = -1;
    for (let i = 0; i < 8; i++) {
      const d = (b + i) % 8;
      if (on(cx + DIRS[d][0], cy + DIRS[d][1])) { k = d; break; }
    }
    if (k < 0) break; // одиночний піксель
    // критерій Джейкоба: знову в старті й робимо той самий перший крок → контур замкнено
    if (cx === sx && cy === sy) {
      if (firstMove === null) firstMove = k;
      else if (k === firstMove) break;
    }
    const pk = (k + 7) % 8;
    const bx = cx + DIRS[pk][0], by = cy + DIRS[pk][1];
    cx += DIRS[k][0]; cy += DIRS[k][1];
    b = Math.max(0, dirIndex(bx - cx, by - cy));
    if (!(cx === sx && cy === sy)) pts.push([cx, cy]);
  }
  return simplify(pts, epsilon);
}

/** Рамер–Дуглас–Пекер */
function simplify(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, z] = stack.pop();
    const [ax, ay] = pts[a], [zx, zy] = pts[z];
    const len = Math.hypot(zx - ax, zy - ay) || 1;
    let best = -1, bd = 0;
    for (let i = a + 1; i < z; i++) {
      const d = Math.abs((zx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (zy - ay)) / len;
      if (d > bd) { bd = d; best = i; }
    }
    if (bd > eps && best > 0) { keep[best] = 1; stack.push([a, best], [best, z]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** намалювати SVG-рядок або зображення у canvas потрібного розміру */
export async function rasterize(src, w, h, bg = null) {
  const isSvg = typeof src === 'string';
  const url = isSvg ? URL.createObjectURL(new Blob([src.replace('<svg ', `<svg width="${w}" height="${h}" preserveAspectRatio="none" `)], { type: 'image/svg+xml' })) : null;
  try {
    const img = isSvg
      ? await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; })
      : src;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.drawImage(img, 0, 0, w, h);
    return c;
  } finally { if (url) URL.revokeObjectURL(url); }
}
