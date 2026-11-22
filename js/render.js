/* Генератор SVG-розмітки для «розфарбовуваних» об’єктів (зірка, село).
   Об’єкт = { slots, elements, steps, bare }. Елемент:
     { layer, slot, rep, zone, svg }  — у svg символ «@» = колір слота,
     «@d» = темніший відтінок (тінь), «@w» = колір незафарбованої заготовки. */
import { PAINT } from './config.js';

export const LAYER_ORDER = ['base', 'outline', 'ornament', 'fine', 'gold'];
export const LAYER_NAMES = {
  outline: 'Контури',
  base: 'Основа',
  ornament: 'Орнамент',
  fine: 'Дрібні деталі',
  gold: 'Золоті деталі',
};

const REPS = {
  all: [0, 45, 90, 135, 180, 225, 270, 315],
  cardinal: [0, 90, 180, 270],
  diagonal: [45, 135, 225, 315],
  notches: [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5],
};
export const repCount = (rep) => (REPS[rep] ? REPS[rep].length : 1);

export function defs(idp) {
  return `<defs>
  <linearGradient id="${idp}-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F6E08A"/><stop offset=".35" stop-color="#D4AF37"/>
    <stop offset=".62" stop-color="#A9831F"/><stop offset=".82" stop-color="#E9CD66"/><stop offset="1" stop-color="#B8921F"/>
  </linearGradient>
  <linearGradient id="${idp}-goldD" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#B8921F"/><stop offset="1" stop-color="#7d5f14"/>
  </linearGradient>
  <linearGradient id="${idp}-wood" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#EED6A8"/><stop offset=".5" stop-color="#E2C08B"/><stop offset="1" stop-color="#D6AF77"/>
  </linearGradient>
  <pattern id="${idp}-grain" width="40" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
    <path d="M0 3Q10 1 20 3T40 3M0 7.5Q12 6 24 8T40 7" fill="none" stroke="#b98b52" stroke-opacity=".18" stroke-width=".7"/>
  </pattern>
  <filter id="${idp}-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="#000" flood-opacity=".35"/>
  </filter>
</defs>`;
}

export function paint(colorId, idp, shade = false) {
  const p = PAINT[colorId];
  if (!p) return colorId; // довільний колір (напр. для заготовки)
  if (p.metallic) return `url(#${idp}-${shade ? 'goldD' : 'gold'})`;
  return shade ? p.dark : p.hex;
}

function fillTokens(svg, color, dark) {
  return svg.replaceAll('@d', dark).replaceAll('@', color);
}

function repeat(svg, rep) {
  const angles = REPS[rep];
  if (!angles) return svg;
  return angles.map((a) => (a ? `<g transform="rotate(${a})">${svg}</g>` : svg)).join('');
}

/**
 * Розмітка одного об’єкта.
 * opts: idp, colors{slot:paintId}, layers (Set видимих шарів | null=всі),
 *       zone ('main'|'back'|'front'), bare (малювати заготовку під фарбою),
 *       guides (олівцеві контури), interactive (data-slot для кліків),
 *       selected (slot), focusLayers (Set шарів поточного кроку — підсвітка)
 */
export function renderObject(obj, opts) {
  const { idp, colors, layers = null, zone = 'main', bare = false, guides = false, interactive = false, selected = null, focusLayers = null } = opts;
  const els = obj.elements.filter((e) => (e.zone || 'main') === zone);
  let out = '';

  if (bare) {
    const bareFill = obj.bare.fill === 'wood' ? `url(#${idp}-wood)` : obj.bare.fill;
    const bareEls = obj.bare.layers ? els.filter((e) => obj.bare.layers.includes(e.layer)) : els;
    out += `<g class="bare">`;
    for (const e of bareEls) out += repeat(fillTokens(e.svg, bareFill, obj.bare.shade || bareFill), e.rep);
    if (obj.bare.fill === 'wood') {
      out += `<g opacity="1">${bareEls.filter((e) => e.layer === 'base').map((e) => repeat(fillTokens(e.svg, `url(#${idp}-grain)`, `url(#${idp}-grain)`), e.rep)).join('')}</g>`;
    }
    out += `</g>`;
  }

  for (const layer of LAYER_ORDER) {
    if (layers && !layers.has(layer)) continue;
    const group = els.filter((e) => e.layer === layer);
    if (!group.length) continue;
    const focus = focusLayers && focusLayers.has(layer) ? ' is-focus' : '';
    out += `<g class="layer layer-${layer}${focus}" data-layer="${layer}">`;
    for (const e of group) {
      const c = colors[e.slot] || obj.slots[e.slot]?.def || 'white';
      const body = repeat(fillTokens(e.svg, paint(c, idp), paint(c, idp, true)), e.rep);
      if (interactive) {
        const sel = selected === e.slot ? ' is-selected' : '';
        out += `<g class="slot${sel}" data-slot="${e.slot}">${body}</g>`;
      } else out += body;
    }
    out += `</g>`;
  }

  if (guides) {
    out += `<g class="guides" pointer-events="none">${els.map((e) => repeat(fillTokens(e.svg, '#000', '#000'), e.rep)).join('')}</g>`;
  }
  return out;
}

/** які слоти й скільки елементів фарбуються в наборі шарів */
export function slotsInLayers(obj, layerSet) {
  const map = new Map();
  for (const e of obj.elements) {
    if (!layerSet.has(e.layer)) continue;
    map.set(e.slot, (map.get(e.slot) || 0) + repCount(e.rep));
  }
  return [...map.entries()].map(([slot, count]) => ({ slot, count }));
}
