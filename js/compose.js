/* Композиція «зірка на паличці + село» в одному SVG (для майстерні й PNG). */
import { defs, renderObject } from './render.js';
import { DESIGN } from './ornaments.js';
import { VILLAGE, VILLAGE_VARIANTS } from './village.js';

export const COMP = {
  w: 400, h: 430,
  star: { x: 200, y: 150, s: 1.25 },
  village: { x: 90, y: 257 },
  stick: { x: 193, w: 14, top: 150, bottom: 377 },
};
export const VIEWS = {
  full: [0, 0, 400, 430],
  star: [62, 12, 276, 276],
  village: [74, 262, 252, 150],
};

function backdrop(kind, idp) {
  const { w, h } = COMP;
  if (kind === 'night') {
    const stars = [[40, 60], [90, 30], [340, 50], [370, 120], [30, 180], [355, 230], [60, 290], [320, 330], [150, 20], [260, 30]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1 : 1.6}" fill="#F3DE8A" opacity="${0.5 + (i % 4) * 0.12}"/>`).join('');
    return `<linearGradient id="${idp}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14264A"/><stop offset="1" stop-color="#060C1C"/></linearGradient>
      <rect width="${w}" height="${h}" fill="url(#${idp}-bg)"/>${stars}
      <circle cx="338" cy="78" r="18" fill="#F6EAC0" opacity=".9"/><circle cx="346" cy="72" r="16" fill="#14264A" opacity=".95"/>`;
  }
  if (kind === 'cloth') {
    return `<linearGradient id="${idp}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1A16"/><stop offset=".55" stop-color="#5E1119"/><stop offset="1" stop-color="#8E1D28"/></linearGradient>
      <pattern id="${idp}-weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3h6M3 0v6" stroke="#fff" stroke-opacity=".018" stroke-width="1"/></pattern>
      <rect width="${w}" height="${h}" fill="url(#${idp}-bg)"/><rect width="${w}" height="${h}" fill="url(#${idp}-weave)"/>`;
  }
  const flakes = Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 73) % 400}" cy="${(i * 131) % 330}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity=".75"/>`).join('');
  return `<linearGradient id="${idp}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FB7CB"/><stop offset=".6" stop-color="#D9E4EC"/><stop offset="1" stop-color="#F4EFE6"/></linearGradient>
    <rect width="${w}" height="${h}" fill="url(#${idp}-bg)"/>${flakes}`;
}

function stick(idp) {
  const s = COMP.stick;
  return `<g class="stick"><rect x="${s.x}" y="${s.top}" width="${s.w}" height="${s.bottom - s.top}" rx="1.5" fill="url(#${idp}-wood)"/>
    <rect x="${s.x}" y="${s.top}" width="${s.w}" height="${s.bottom - s.top}" rx="1.5" fill="url(#${idp}-grain)"/>
    <rect x="${s.x + s.w - 3}" y="${s.top}" width="3" height="${s.bottom - s.top}" fill="#8a5a2b" opacity=".18"/></g>`;
}

/**
 * state: { star:{designId, colors}, village:{variantId, colors} }
 * o: { idp, view, interactive:'star'|'village'|null, selected, guides,
 *      starLayers, villageLayers, starBare, villageBare, focus:{star,village} }
 */
export function compose(state, o = {}) {
  const idp = o.idp || 'c';
  const design = DESIGN[state.star.designId];
  const variant = VILLAGE_VARIANTS.find((v) => v.id === state.village.variantId) || VILLAGE_VARIANTS[0];
  const vb = o.view || VIEWS.full;
  const { star: S, village: V } = COMP;
  const vOpts = (zone) => ({
    idp, zone, colors: state.village.colors, layers: o.villageLayers || null,
    bare: o.villageBare ?? true, guides: o.guidesFor === 'village',
    interactive: o.interactive === 'village', selected: o.selected, focusLayers: o.focus?.village,
  });
  const starMarkup = renderObject(design, {
    idp, colors: state.star.colors, layers: o.starLayers || null, bare: o.starBare ?? true,
    guides: o.guidesFor === 'star', interactive: o.interactive === 'star',
    selected: o.selected, focusLayers: o.focus?.star,
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet" class="comp ${o.interactive || o.dim ? 'edit-' + (o.interactive || o.dim) : ''}">
  ${defs(idp)}
  <g class="backdrop">${backdrop(variant.backdrop, idp)}</g>
  <ellipse cx="200" cy="${V.y + 146}" rx="118" ry="10" fill="#000" opacity=".22"/>
  <g class="obj-village" transform="translate(${V.x} ${V.y})">${renderObject(VILLAGE, vOpts('back'))}</g>
  ${stick(idp)}
  <g class="obj-star" transform="translate(${S.x} ${S.y}) scale(${S.s})" filter="url(#${idp}-shadow)">${starMarkup}</g>
  <g class="obj-village" transform="translate(${V.x} ${V.y})">${renderObject(VILLAGE, vOpts('front'))}</g>
</svg>`;
}

/** лише зірка (мініатюри, текстура для 3D) */
export function starOnly(designId, colors, { idp = 's', bare = true, size = null, transparent = true, layers = null } = {}) {
  const d = DESIGN[designId];
  const wh = size ? `width="${size}" height="${size}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" ${wh}>${defs(idp)}${transparent ? '' : '<rect x="-100" y="-100" width="200" height="200" fill="#fff"/>'}${renderObject(d, { idp, colors, bare, layers })}</svg>`;
}

/** лише село (текстура й силует для 3D). Рамка 0..220 × 0..VILLAGE_H — низ = низ пагорба */
export const VILLAGE_H = 156;
export function villageOnly(colors, { idp = 'v', bare = true, layers = null, mono = null } = {}) {
  const o = { idp, colors, bare, layers };
  let body = renderObject(VILLAGE, { ...o, zone: 'back' }) + renderObject(VILLAGE, { ...o, zone: 'front' });
  if (mono) body = `<g fill="${mono}" stroke="${mono}">${body.replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="' + mono + '"')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 ${VILLAGE_H}">${defs(idp)}${body}</svg>`;
}

export function variantOf(id) {
  return VILLAGE_VARIANTS.find((v) => v.id === id) || VILLAGE_VARIANTS[0];
}

/** Превʼю «як розписано вручну»: натуральне дерево з волокнами й торцем фанери,
   акрил із нерівним краєм, фактурою мазків і ледь прозорим шаром. Лише для карток барабана —
   3D-текстури й майстерня користуються звичайним starOnly. */
export function starHandmade(designId, colors, { idp = 'hm', seed = 3 } = {}) {
  const d = DESIGN[designId];
  const wood = renderObject(d, { idp, colors, bare: true, layers: new Set() });
  const paintL = renderObject(d, { idp, colors, bare: false });
  const fx = `<defs>
  <filter id="${idp}-wf" x="-6%" y="-6%" width="114%" height="116%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.32" numOctaves="3" seed="${seed}" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .45  0 0 0 0 .28  0 0 0 0 .12  0 0 -1.6 0 .9" result="grain"/>
    <feComposite in="grain" in2="SourceAlpha" operator="in" result="g2"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="${seed + 5}" result="pores"/>
    <feColorMatrix in="pores" type="matrix" values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .1  0 0 -1.2 0 .62" result="p1"/>
    <feComposite in="p1" in2="SourceAlpha" operator="in" result="p2"/>
    <feMerge result="woodTop"><feMergeNode in="SourceGraphic"/><feMergeNode in="g2"/><feMergeNode in="p2"/></feMerge>
    <feOffset in="SourceAlpha" dx=".6" dy="2.2" result="off"/>
    <feFlood flood-color="#7a5430"/><feComposite in2="off" operator="in" result="edge"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="3.5"/><feOffset dy="6" result="sb"/>
    <feFlood flood-color="#000" flood-opacity=".55"/><feComposite in2="sb" operator="in" result="shadow"/>
    <feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="woodTop"/></feMerge>
  </filter>
  <filter id="${idp}-pf" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${seed + 1}" result="wob"/>
    <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.32 0.08" numOctaves="2" seed="${seed + 2}" result="brush"/>
    <feDiffuseLighting in="brush" surfaceScale="1.1" lighting-color="#fff" result="lit"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>
    <feComponentTransfer in="lit" result="soft"><feFuncR type="linear" slope=".2" intercept=".84"/><feFuncG type="linear" slope=".2" intercept=".84"/><feFuncB type="linear" slope=".2" intercept=".84"/></feComponentTransfer>
    <feBlend in="soft" in2="d" mode="multiply" result="m"/>
    <feComposite in="m" in2="d" operator="in" result="painted"/>
    <feComponentTransfer in="painted"><feFuncA type="table" tableValues="0 .86 .92"/></feComponentTransfer>
  </filter>
</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-104 -104 208 212" width="416" height="424">${defs(idp)}${fx}<g filter="url(#${idp}-wf)">${wood}</g><g filter="url(#${idp}-pf)">${paintL}</g></svg>`;
}
export const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
