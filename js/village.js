/* «Моє різдвяне село» — підставка зірки (біла пластикова заготовка з рельєфом).
   Локальні координати 220×150. zone: back — за паличкою, front — перед нею. */
import { n } from './geometry.js';

const P = (o) => ({ rep: 1, zone: 'back', ...o });

function fir(cx, baseY, h, w) {
  let d = '';
  for (let i = 0; i < 3; i++) {
    const yb = baseY - i * h * 0.27, yt = yb - h * 0.46, wb = w * (1 - i * 0.24);
    d += `M${n(cx - wb)} ${n(yb)}Q${n(cx)} ${n(yb + 3)} ${n(cx + wb)} ${n(yb)}L${n(cx)} ${n(yt)}Z`;
  }
  return d;
}
function firSnow(cx, baseY, h, w) {
  let d = '';
  for (let i = 0; i < 3; i++) {
    const yb = baseY - i * h * 0.27, yt = yb - h * 0.46, wb = w * (1 - i * 0.24);
    const f = 0.42, ys = yt + (yb - yt) * f, ws = wb * f;
    d += `M${n(cx)} ${n(yt)}L${n(cx + ws)} ${n(ys)}Q${n(cx + ws * 0.5)} ${n(ys - 2.2)} ${n(cx)} ${n(ys + 0.6)}Q${n(cx - ws * 0.5)} ${n(ys - 2.2)} ${n(cx - ws)} ${n(ys)}Z`;
  }
  return d;
}
const trunk = (cx, baseY, w = 2.2) => `<rect x="${n(cx - w)}" y="${n(baseY - 1)}" width="${n(w * 2)}" height="6" rx="1" fill="@"/>`;

const GROUND = 'M8 118C6 104 24 98 42 102C58 106 70 96 92 98C112 100 124 94 144 98C164 102 180 96 198 102C214 106 216 116 212 124L206 132C190 140 168 138 150 142C130 146 108 148 88 144C64 140 44 144 28 138C14 134 6 128 8 118Z';
const ROOF = 'M60 71C60 52 80 43 110 41C140 43 160 52 160 71C152 75 142 72 134 76C122 72 100 72 88 76C79 72 69 75 60 71Z';
const ROOF_SNOW = 'M69 57C80 46 100 42 110 42C122 42 140 46 151 57C143 55 139 59 131 56C124 61 118 55 110 58C101 55 96 61 89 57C82 59 77 55 69 57Z';
const THATCH = Array.from({ length: 9 }, (_, i) => {
  const x = 70 + i * 10, top = 50 - Math.sin((i / 8) * Math.PI) * 6;
  return `M${x} ${n(top + 8)}Q${x - 1.5} ${n(top + 16)} ${x - 0.5} 72`;
}).join('');

export const VILLAGE = {
  id: 'village', title: 'Моє різдвяне село',
  bare: { fill: '#EEF0F3', shade: '#D3D7DE' },
  slots: {
    ground: { label: 'Сніговий пагорб', def: 'white' },
    walls: { label: 'Стіни й комин', def: 'white' },
    roof: { label: 'Стріха (дах)', def: 'white' },
    roofSnow: { label: 'Сніг на даху', def: 'white' },
    door: { label: 'Двері', def: 'red' },
    windows: { label: 'Віконця й клямка', def: 'gold' },
    frames: { label: 'Рами, тин, стріха-штрихи', def: 'black' },
    trees: { label: 'Ялинки', def: 'green' },
    treeSnow: { label: 'Сніг на ялинках', def: 'white' },
  },
  order: ['base', 'ornament', 'fine', 'gold'],
  stepTitles: { base: 'Основа: сніг і стіни', ornament: 'Дах, ялинки, двері', fine: 'Сніжок, рами, тин', gold: 'Золоті віконця' },
  dry: { base: 10, ornament: 10 },
  tips: {
    base: 'Підставку тримай за низ. Стіни фарбуй першими — вони найбільші.',
    ornament: 'Ялинки — короткими мазками згори вниз, як ростуть гілки.',
    fine: 'Сніжок на гілках ставиш кінчиком пензля, не зафарбовуючи всю гілку.',
    gold: 'Золоті віконця — і хатинка «засвітилася»!',
  },
  elements: [
    P({ layer: 'base', slot: 'ground', svg: `<path transform="translate(0 6)" d="${GROUND}" fill="@d"/><path d="${GROUND}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'trees', svg: `<path d="${fir(46, 104, 62, 17)}${fir(181, 102, 76, 20)}" fill="@"/>` + trunk(46, 104) + trunk(181, 102) }),
    P({ layer: 'fine', slot: 'treeSnow', svg: `<path d="${firSnow(46, 104, 62, 17)}${firSnow(181, 102, 76, 20)}" fill="@"/>` }),
    P({ layer: 'base', slot: 'walls', svg: `<rect x="126" y="34" width="12" height="22" fill="@"/><rect x="72" y="66" width="76" height="44" rx="2" fill="@"/><rect x="72" y="104" width="76" height="6" fill="@d"/>` }),
    P({ layer: 'ornament', slot: 'roof', svg: `<path d="${ROOF}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'frames', svg: `<path d="${THATCH}" fill="none" stroke="@" stroke-width=".9" stroke-linecap="round" opacity=".75"/><rect x="72" y="72" width="76" height="38" fill="none" stroke="@" stroke-width=".8" opacity=".55"/>` }),
    P({ layer: 'fine', slot: 'roofSnow', svg: `<path d="${ROOF_SNOW}" fill="@"/><rect x="123.5" y="30.5" width="17" height="6" rx="3" fill="@"/>` }),
    P({ layer: 'gold', slot: 'windows', svg: `<rect x="80" y="78" width="15" height="14" rx="1" fill="@"/><rect x="125" y="78" width="15" height="14" rx="1" fill="@"/>` }),
    P({ layer: 'fine', slot: 'frames', svg: `<path d="M80 78h15v14h-15zM87.5 78v14M80 85h15M125 78h15v14h-15zM132.5 78v14M125 85h15" fill="none" stroke="@" stroke-width="1.3"/>` }),
    P({ layer: 'ornament', slot: 'door', svg: `<path d="M103 110V88Q103 82 110 82Q117 82 117 88V110Z" fill="@"/>` }),
    P({ layer: 'gold', slot: 'windows', svg: `<circle cx="114" cy="97" r="1.3" fill="@"/>` }),
    /* перед паличкою */
    P({ zone: 'front', layer: 'base', slot: 'ground', svg: `<path d="M94 121C96 113 104 111 110 111C117 111 124 113 126 121C118 124 102 124 94 121Z" fill="@"/>` }),
    P({ zone: 'front', layer: 'fine', slot: 'frames', svg: `<path d="M152 96v17M160 95v18M168 96v17M149 101.5l23-1.5M149 108.5l23-1" fill="none" stroke="@" stroke-width="2.2" stroke-linecap="round"/>` }),
    P({ zone: 'front', layer: 'ornament', slot: 'trees', svg: `<path d="${fir(22, 116, 42, 12)}${fir(205, 114, 46, 13)}" fill="@"/>` + trunk(22, 116, 1.8) + trunk(205, 114, 1.8) }),
    P({ zone: 'front', layer: 'fine', slot: 'treeSnow', svg: `<path d="${firSnow(22, 116, 42, 12)}${firSnow(205, 114, 46, 13)}" fill="@"/>` }),
  ],
};

export const VILLAGE_VARIANTS = [
  {
    id: 'snowy', title: 'Засніжене село', blurb: 'Білі дахи, золоті віконця', backdrop: 'day',
    colors: { ground: 'white', walls: 'white', roof: 'white', roofSnow: 'white', door: 'red', windows: 'gold', frames: 'black', trees: 'green', treeSnow: 'white' },
  },
  {
    id: 'festive', title: 'Різдвяні будиночки', blurb: 'Червоні стіни, святковий настрій', backdrop: 'cloth',
    colors: { ground: 'white', walls: 'red', roof: 'white', roofSnow: 'white', door: 'green', windows: 'gold', frames: 'white', trees: 'green', treeSnow: 'white' },
  },
  {
    id: 'night', title: 'Нічний пейзаж', blurb: 'Темні хатки й золоте світло у вікнах', backdrop: 'night',
    colors: { ground: 'white', walls: 'black', roof: 'green', roofSnow: 'white', door: 'red', windows: 'gold', frames: 'gold', trees: 'green', treeSnow: 'white' },
  },
];
