/* Різьблення переднього ажурного шару зірки — ОДНЕ джерело і для 3D-геометрії, і для розпису.
   Тому фарба лягає рівно по гранях вирізів, а не плямами поверх них.

   Система координат зірки: центр (0,0), R = 100, промінь 0 дивиться вгору, SVG-вісь Y — донизу.
   • windows — 8 трапецієвидних віконець у кільці, наскрізь через обидва шари;
   • cuts    — вирізи лише в білому шарі (крізь них видно берёзову фанеру):
               8 щілинок між пелюстками квітки + по 2 пари листочків у кожному промені.
   Розпис (слоти): основа, окантовка променів, кільце, квітка, гілочки, ягідки, серединка. */
import { STAR } from './config.js';
import { starPoints, n } from './geometry.js';

const rad = (d) => (d * Math.PI) / 180;
const polar = (r, deg) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
const rot = ([x, y], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [x * c - y * s, x * s + y * c]; };
const RAY = (k) => -90 + 45 * k + STAR.rotateDeg; // напрям променя k
const NOTCH = (k) => RAY(k) + 22.5; // напрям западини між променями

/* ---------- розміри різьблення (одиниці зірки) ---------- */
export const CARVE = {
  inset: STAR.frontInset, // білий шар трохи менший — по краю видно фанеру
  band: 4.4, // ширина окантовки променів
  ring: { r0: 19.5, r1: 44 }, // кільце з віконцями
  win: { r0: 24, a0: 10, r1: 39.5, a1: 15.5 }, // трапеція: внутрішній і зовнішній радіуси та півкути
  petal: { r0: 3.6, len: 14.6, wid: 7.2 },
  gap: { rApex: 12.6, rBase: 19, half: 9 }, // щілинка між пелюстками
  stem: { t0: 47.5, t1: 79.5, w: 2.3 },
  leaves: [ // пари листочків: висота основи, довжина, ширина, кут від стебла
    { t: 56.5, len: 9.2, wid: 4.2, ang: 44 },
    { t: 65.5, len: 6.9, wid: 3.3, ang: 44 },
  ],
  leafRim: 2.6, // фарбована грань навколо вирізу листочка
  berries: [[0, -81.6, 1.9], [-2.7, -77.6, 1.55], [2.7, -77.6, 1.55]], // ягідки на верхівці гілочки
  ringBerry: { r: 31.8, rr: 1.9 }, // ягідки на кільці між віконцями
  button: 4.4,
};

/* ---------- примітиви ---------- */
function bez(p0, p1, p2, p3, steps) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}
/** симетричний листочок-«човник»: основа в (0,0), кінчик у (0,-len) */
function leafShape(len, wid, steps = 7) {
  const w = wid / 2;
  return [[0, 0], ...bez([0, 0], [w * 1.35, -len * 0.28], [w * 1.05, -len * 0.78], [0, -len], steps),
    ...bez([0, -len], [-w * 1.05, -len * 0.78], [-w * 1.35, -len * 0.28], [0, 0], steps).slice(0, -1)];
}
const place = (pts, dx, dy, deg = 0) => pts.map((p) => { const [x, y] = rot(p, deg); return [x + dx, y + dy]; });

/** зсув многокутника всередину на d (перетин зсунутих сторін; для окантовки) */
function insetPoly(pts, d) {
  const N = pts.length;
  let area = 0;
  for (let i = 0; i < N; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % N]; area += x1 * y2 - x2 * y1; }
  const sgn = area > 0 ? 1 : -1; // у якого боку «всередині»
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % N], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
    const nx = (-dy / L) * sgn, ny = (dx / L) * sgn; // нормаль усередину
    return [[p[0] + nx * d, p[1] + ny * d], [dx, dy]];
  });
  return lines.map((l2, i) => {
    const l1 = lines[(i - 1 + N) % N];
    const [[x1, y1], [dx1, dy1]] = l1, [[x2, y2], [dx2, dy2]] = l2;
    const den = dx1 * dy2 - dy1 * dx2;
    const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den;
    return [x1 + dx1 * t, y1 + dy1 * t];
  });
}

/* ---------- геометрія вирізів ---------- */
export function windowPolys() {
  const { r0, a0, r1, a1 } = CARVE.win;
  return Array.from({ length: 8 }, (_, k) => {
    const p = NOTCH(k);
    return [polar(r0, p - a0), polar(r1, p - a1), polar(r1, p + a1), polar(r0, p + a0)];
  });
}
/** листочки одного променя (у просторі променя 0) */
function rayLeaves() {
  const out = [], x0 = CARVE.stem.w / 2 + 0.7;
  for (const L of CARVE.leaves) {
    const leaf = leafShape(L.len, L.wid);
    out.push(place(leaf, x0, -L.t, L.ang), place(leaf, -x0, -L.t, -L.ang));
  }
  return out;
}
function petalPoly() {
  const { r0, len, wid } = CARVE.petal;
  return place(leafShape(len, wid, 8), 0, -r0);
}
/** вирізи тільки в білому шарі (крізь них видно фанеру) */
export function cutPolys() {
  const { rApex, rBase, half } = CARVE.gap;
  const out = [];
  for (let k = 0; k < 8; k++) {
    const p = NOTCH(k);
    out.push([polar(rApex, p), polar(rBase, p + half), polar(rBase + 0.6, p), polar(rBase, p - half)]);
    const a = RAY(k) + 90;
    rayLeaves().forEach((leaf) => out.push(leaf.map((pt) => rot(pt, a))));
  }
  return out;
}
/** контур білого шару */
export const frontOutline = () => starPoints(CARVE.inset);

/* ---------- SVG-розмітка для розпису ---------- */
const pd = (pts) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z';
const circ = (cx, cy, r) => `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0Z`;

const P = (o) => ({ rep: 1, zone: 'main', ...o });
function carvedElements() {
  const outline = frontOutline();
  const wins = windowPolys().map(pd).join('');
  const cuts = cutPolys().map(pd).join('');
  const { r0, r1 } = CARVE.ring;
  const stem = `M0 ${-CARVE.stem.t0}L0 ${-CARVE.stem.t1}`;
  const berries = CARVE.berries.map(([x, y, r]) => circ(x, y, r)).join('');
  return [
    // фанера під білим шаром (лише для мініатюр: вікна наскрізні, а вирізи листочків — ні)
    P({ layer: 'ply', slot: 'body', svg: `<path fill-rule="evenodd" d="${pd(starPoints())}${wins}" fill="@"/>` }),
    P({ layer: 'base', slot: 'body', svg: `<path fill-rule="evenodd" d="${pd(outline)}${wins}${cuts}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'flower', rep: 'all', svg: `<path d="${pd(petalPoly())}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'ring', svg: `<path fill-rule="evenodd" d="${circ(0, 0, r1)}${circ(0, 0, r0)}${wins}" fill="@"/>` }),
    P({ layer: 'outline', slot: 'edge', svg: `<path fill-rule="evenodd" d="${pd(outline)}${pd(insetPoly(outline, CARVE.band))}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'branch', rep: 'all', svg: `<path d="${stem}" fill="none" stroke="@" stroke-width="${CARVE.stem.w}" stroke-linecap="round"/><path d="${rayLeaves().map(pd).join('')}" fill="none" stroke="@" stroke-width="${CARVE.leafRim}" stroke-linejoin="round"/>` }),
    P({ layer: 'fine', slot: 'berry', rep: 'all', svg: `<path d="${berries}${circ(0, -CARVE.ringBerry.r, CARVE.ringBerry.rr)}" fill="@"/>` }),
    P({ layer: 'gold', slot: 'button', svg: `<path d="${circ(0, 0, CARVE.button)}" fill="@"/>` }),
  ];
}

/* ---------- готові ідеї розпису: та сама різьба, різні поєднання 5 фарб набору ---------- */
export const CARVE_LABELS = {
  body: 'Основа', edge: 'Окантовка променів', ring: 'Кільце з віконцями', flower: 'Квітка в центрі',
  branch: 'Гілочки й листочки', berry: 'Ягідки', button: 'Серединка',
};
const SCHEMES = [
  ['classic', 'Класика Різдва', { body: 'white', edge: 'red', ring: 'green', flower: 'red', branch: 'green', berry: 'red', button: 'gold' }],
  ['kalyna', 'Калина', { body: 'white', edge: 'red', ring: 'red', flower: 'red', branch: 'green', berry: 'red', button: 'gold' }],
  ['nightgold', 'Нічне золото', { body: 'black', edge: 'gold', ring: 'black', flower: 'gold', branch: 'gold', berry: 'red', button: 'gold' }],
  ['scandi', 'Сканді', { body: 'white', edge: 'black', ring: 'white', flower: 'black', branch: 'black', berry: 'red', button: 'black' }],
  ['pine', 'Хвойна', { body: 'green', edge: 'white', ring: 'white', flower: 'red', branch: 'white', berry: 'red', button: 'gold' }],
  ['ember', 'Вогник', { body: 'red', edge: 'gold', ring: 'white', flower: 'white', branch: 'gold', berry: 'white', button: 'gold' }],
  ['snow', 'Сніжна з золотом', { body: 'white', edge: 'gold', ring: 'white', flower: 'gold', branch: 'gold', berry: 'gold', button: 'gold' }],
  ['hutsul', 'Гуцульська', { body: 'red', edge: 'black', ring: 'green', flower: 'gold', branch: 'black', berry: 'gold', button: 'black' }],
  ['forest', 'Лісова', { body: 'green', edge: 'gold', ring: 'green', flower: 'white', branch: 'gold', berry: 'red', button: 'gold' }],
  ['evening', 'Вечірня', { body: 'black', edge: 'white', ring: 'white', flower: 'red', branch: 'white', berry: 'red', button: 'red' }],
  ['petryk', 'Петриківська', { body: 'black', edge: 'red', ring: 'red', flower: 'red', branch: 'green', berry: 'gold', button: 'gold' }],
  ['bare', 'Чиста різьба', { body: 'white', edge: 'white', ring: 'white', flower: 'white', branch: 'white', berry: 'white', button: 'gold' }],
];
export function carvedDesigns() {
  const elements = carvedElements();
  return SCHEMES.map(([id, title, defs]) => ({
    id, title, level: 1, carved: true,
    blurb: 'Одна різьба — фарба лягає по її гранях.',
    slots: Object.fromEntries(Object.entries(defs).map(([k, def]) => [k, { def, label: CARVE_LABELS[k] }])),
    order: ['base', 'outline', 'ornament', 'fine', 'gold'],
    dry: {},
    tips: {},
    elements,
    bare: { fill: 'wood', layers: ['ply'] },
  }));
}
