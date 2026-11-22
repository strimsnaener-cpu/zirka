/* Геометрія восьмикутної зірки + маленькі «пензлі» для орнаментів.
   Система координат зірки: центр (0,0), промінь 0 дивиться вгору,
   SVG-вісь Y іде вниз. «Простір променя» (tip-space) — промінь угорі,
   кінчик у (0,-R); копії повертаються на 45°·k. */
import { STAR } from './config.js';

const rad = (d) => (d * Math.PI) / 180;
export const n = (v) => +v.toFixed(2);
export const polar = (r, deg) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
const pt = ([x, y]) => `${n(x)} ${n(y)}`;

export const R = STAR.R;
export const RI = STAR.R * STAR.innerRatio;
export const RING = STAR.ringR;

/** точки кінчиків і западин (16 шт.) */
export function starPoints(scale = 1) {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = -90 + 45 * k + STAR.rotateDeg;
    pts.push(polar(R * scale, a), polar(RI * scale, a + 22.5));
  }
  return pts;
}

export function starOutlineD(scale = 1) {
  return 'M' + starPoints(scale).map(pt).join('L') + 'Z';
}

export function circleD(r, cx = 0, cy = 0) {
  return `M${n(cx - r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx + r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
}

/** трикутний проріз k у круглому вікні (вершина до центру, основа — дуга) */
export function openingD(k) {
  const phi = -67.5 + 45 * k + STAR.rotateDeg;
  const h = STAR.openingHalfDeg;
  return `M${pt(polar(STAR.hubR, phi))}L${pt(polar(RING, phi - h))}A${RING} ${RING} 0 0 1 ${pt(polar(RING, phi + h))}Z`;
}
export const openingsD = () => Array.from({ length: 8 }, (_, k) => openingD(k)).join('');

/** точки прорізу як полігон (для 3D) */
export function openingPolygon(k, arcSteps = 10) {
  const phi = -67.5 + 45 * k + STAR.rotateDeg;
  const h = STAR.openingHalfDeg;
  const pts = [polar(STAR.hubR, phi)];
  for (let i = 0; i <= arcSteps; i++) pts.push(polar(RING, phi - h + (2 * h * i) / arcSteps));
  return pts;
}

/* ---------- простір одного променя ---------- */
/** половина ширини променя на відстані t від центру (між западинами і кінчиком) */
export function halfW(t) {
  const notchT = RI * Math.cos(rad(22.5));
  const notchX = RI * Math.sin(rad(22.5));
  return (notchX * (R - t)) / (R - notchT);
}
export const NOTCH = { x: RI * Math.sin(rad(22.5)), y: -RI * Math.cos(rad(22.5)) };
export const RING_EDGE = { x: RING * Math.sin(rad(22.5)), y: -RING * Math.cos(rad(22.5)) };

/** ліва/права половина «клітинки» променя (від кільця до кінчика) */
export function tipHalfD(side) {
  const s = side === 'left' ? -1 : 1;
  const sweep = side === 'left' ? 1 : 0;
  return `M0 ${-R}L${n(s * NOTCH.x)} ${n(NOTCH.y)}L${n(s * RING_EDGE.x)} ${n(RING_EDGE.y)}A${RING} ${RING} 0 0 ${sweep} 0 ${-RING}Z`;
}
export function tipCellD() {
  return `M0 ${-R}L${n(NOTCH.x)} ${n(NOTCH.y)}L${n(RING_EDGE.x)} ${n(RING_EDGE.y)}A${RING} ${RING} 0 0 0 ${n(-RING_EDGE.x)} ${n(RING_EDGE.y)}L${n(-NOTCH.x)} ${n(NOTCH.y)}Z`;
}
/** смуга-шеврон між відстанями t1 > t2 (обидві ≥ западин) */
export function bandD(t1, t2, inset = 0) {
  const w1 = Math.max(0, halfW(t1) - inset), w2 = Math.max(0, halfW(t2) - inset);
  return `M${n(-w1)} ${-t1}L${n(w1)} ${-t1}L${n(w2)} ${-t2}L${n(-w2)} ${-t2}Z`;
}

/* ---------- пензлі ---------- */
const tf = (x, y, r = 0) => `translate(${n(x)} ${n(y)})${r ? ` rotate(${n(r)})` : ''}`;
/** крапля-пелюстка: основа в (x,y), росте «вгору» на len, повернута на rot */
export function petal(x, y, len, wid, rot = 0, attrs = 'fill="@"') {
  const w = wid / 2;
  return `<path transform="${tf(x, y, rot)}" d="M0 0C${n(w * 1.6)} ${n(-len * 0.3)} ${n(w * 1.1)} ${n(-len * 0.85)} 0 ${n(-len)}C${n(-w * 1.1)} ${n(-len * 0.85)} ${n(-w * 1.6)} ${n(-len * 0.3)} 0 0Z" ${attrs}/>`;
}
/** листок-«човник» */
export function leaf(x, y, len, wid, rot = 0, attrs = 'fill="@"') {
  return `<path transform="${tf(x, y, rot)}" d="M0 0Q${n(wid)} ${n(-len / 2)} 0 ${n(-len)}Q${n(-wid)} ${n(-len / 2)} 0 0Z" ${attrs}/>`;
}
export function dot(x, y, r, attrs = 'fill="@"') {
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" ${attrs}/>`;
}
/** чотирипроменева «іскра» */
export function spark(x, y, r, rot = 0, attrs = 'fill="@"') {
  const c = r * 0.16;
  return `<path transform="${tf(x, y, rot)}" d="M0 ${n(-r)}Q${n(c)} ${n(-c)} ${n(r)} 0Q${n(c)} ${n(c)} 0 ${n(r)}Q${n(-c)} ${n(c)} ${n(-r)} 0Q${n(-c)} ${n(-c)} 0 ${n(-r)}Z" ${attrs}/>`;
}
/** маленька 8-кутна зірочка */
export function star8(x, y, r, ri = r * 0.45, attrs = 'fill="@"') {
  const p = [];
  for (let k = 0; k < 16; k++) p.push(polar(k % 2 ? ri : r, -90 + k * 22.5));
  return `<path transform="${tf(x, y)}" d="M${p.map(pt).join('L')}Z" ${attrs}/>`;
}
export function line(d, w = 1.2, attrs = '') {
  return `<path d="${d}" fill="none" stroke="@" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`;
}
/** дзеркальна копія (ліва/права) */
export const mirror = (svg) => `${svg}<g transform="scale(-1 1)">${svg}</g>`;
