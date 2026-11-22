/* Бібліотека 17 орнаментів у 3 рівнях: 9 базових + 8 автентичних українських
   (Поділля, Гуцульщина, восьмикутна ружа, солом’яний павук, вишивка, Косів,
   петриківська калина, писанковий сорококлинець).
   Кожен орнамент — набір елементів у «просторі променя» з повторами по 8 променях.
   layer: base | outline | ornament | fine | gold  — визначає крок розпису.
   order: послідовність кроків (залежить від технології: світла чи темна основа).
   dry:   хвилини висихання ПІСЛЯ кроку. */
import { STAR } from './config.js';
import {
  starOutlineD, openingsD, circleD, tipHalfD, bandD, halfW, RING, n,
  petal, leaf, dot, spark, star8, line, mirror,
} from './geometry.js';

export const LEVELS = [
  { id: 1, title: 'Моя перша зірка', sub: 'великі площини, смужки, ромби й трикутники' },
  { id: 2, title: 'Українські традиції', sub: 'калина, колоски, ружа, павук, вишивка' },
  { id: 3, title: 'Майстер різдвяного розпису', sub: 'петриківка, Косів, писанка, тонке золото' },
];

export const SLOT_LABELS = {
  body: 'Основа зірки', arms: 'Центральна зірочка', edge: 'Контур', button: 'Серединка',
  cap: 'Золоті кінчики', rayA: 'Промені — ліва половина', rayB: 'Промені — права половина',
  stripeA: 'Смуги — перші', stripeB: 'Смуги — другі', line: 'Золоті смужки', gold: 'Золоті прикраси',
  triBig: 'Великі трикутники', triSmall: 'Малі трикутники', triRim: 'Трикутники на кільці',
  leaf: 'Листочки й стебла', berry: 'Ягідки', dot: 'Крапочки', stem: 'Стебла й листя',
  grain: 'Зернята колосків', bigStar: 'Великі зірочки', core: 'Серце зірочок',
  notchStar: 'Зірочки між променями', petal: 'Пелюстки', curl: 'Золоті завитки',
  frost: 'Морозні гілочки', crystal: 'Іній-крапки', lace: 'Мереживні арки', pearl: 'Перлинки',
  rhomb: 'Ромби', rhombCore: 'Серця ромбів', tooth: 'Зубці', half: 'Грані променів', kite: 'Зелені ромби',
  zigzag: 'Кривулька', ruzhaA: 'Ружа — перші пелюстки', ruzhaB: 'Ружа — другі пелюстки', paper: 'Кольорові вставки',
  bead: 'Намистинки', beadRed: 'Червоні намистинки', straw: 'Соломинки павука',
  stitchK: 'Хрестики-контури', stitchR: 'Червоні хрестики', stitchW: 'Світлі хрестики', stitchG: 'Зелені хрестики',
  flower: 'Квіти', contour: 'Тонкий контур', shine: 'Відблиски на ягідках', comb: 'Золотий гребінчик',
  triUp: 'Клини вершиною вгору', triDown: 'Клини вершиною вниз',
};

const P = (o) => ({ rep: 1, zone: 'main', ...o });
const ALL = 'all';

/* ---------- спільна основа будь-якої зірки ---------- */
function common({ edgeW = 1.4 } = {}) {
  return [
    P({ layer: 'base', slot: 'body', svg: `<path fill-rule="evenodd" d="${starOutlineD()}${openingsD()}" fill="@"/>` }),
    P({ layer: 'base', slot: 'arms', svg: `<path fill-rule="evenodd" d="${circleD(RING)}${openingsD()}" fill="@"/>` }),
    P({ layer: 'outline', slot: 'edge', svg: line(starOutlineD(0.955), edgeW) + line(openingsD(), edgeW * 0.75) }),
  ];
}
const button = (layer = 'gold') => P({ layer, slot: 'button', svg: dot(0, 0, STAR.holeR + 1.3) });
const notchDots = (slot, layer, r = 1.8) => P({ layer, slot, rep: 'notches', svg: dot(0, -48, r) });
const armDots = (slot, layer, r = 1.4) => P({ layer, slot, rep: ALL, svg: dot(0, -38.6, r) });
const arch = (t, depth, inset = 1.6) => {
  const w = halfW(t) - inset;
  return line(`M${-w} ${-t}Q0 ${-(t + depth * 2)} ${w} ${-t}`, 1.15);
};
/* геометричні примітиви для народних орнаментів */
const rh = (cx, cy, hw, hh) => `M${n(cx)} ${n(cy - hh)}L${n(cx + hw)} ${n(cy)}L${n(cx)} ${n(cy + hh)}L${n(cx - hw)} ${n(cy)}Z`;
const poly = (pts) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z';
const shrink = (pts, f) => {
  const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
};
const s = (o) => Object.fromEntries(Object.entries(o).map(([k, def]) => [k, { def, label: SLOT_LABELS[k] }]));

/* ======================= РІВЕНЬ 1 ======================= */
const rays = {
  id: 'rays', level: 1, title: 'Різдвяні промені',
  blurb: 'Кожен промінь — дві великі площини. Ідеально для першого разу.',
  slots: s({ body: 'white', arms: 'green', rayA: 'red', rayB: 'green', edge: 'black', cap: 'gold', button: 'gold' }),
  order: ['outline', 'base', 'ornament', 'gold'],
  dry: { base: 10 },
  tips: {
    ornament: 'Фарбуй спершу всі ліві половинки, потім праві — так руки не змажуть свіжу фарбу.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'rayA', rep: ALL, svg: `<path transform="translate(0 -62) scale(.86) translate(0 62)" d="${tipHalfD('left')}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'rayB', rep: ALL, svg: `<path transform="translate(0 -62) scale(.86) translate(0 62)" d="${tipHalfD('right')}" fill="@"/>` }),
    P({ layer: 'gold', slot: 'cap', rep: ALL, svg: `<path d="M0 -94.6L4 -86L-4 -86Z" fill="@"/>` }),
    notchDots('cap', 'gold'),
    button(),
  ],
};

const stripes = {
  id: 'stripes', level: 1, title: 'Смугасте сяйво',
  blurb: 'Широкі смуги-шеврони на кожному промені, між ними — золоті лінії.',
  slots: s({ body: 'white', arms: 'red', stripeA: 'red', stripeB: 'green', line: 'gold', edge: 'black', button: 'gold' }),
  order: ['outline', 'base', 'ornament', 'gold'],
  dry: { base: 10, ornament: 5 },
  tips: { ornament: 'Смугу веди одним рухом від краю до краю — пензлик тримай майже лежачи.' },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'stripeA', rep: ALL, svg: `<path d="${bandD(96, 87, 1.4)}${bandD(71, 63, 2.2)}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'stripeB', rep: ALL, svg: `<path d="${bandD(83, 75, 1.8)}${bandD(59, 52, 2.6)}" fill="@"/>` }),
    P({ layer: 'gold', slot: 'line', rep: ALL, svg: [85, 73, 61].map((t) => line(`M${-(halfW(t) - 2.4)} ${-t}L${halfW(t) - 2.4} ${-t}`, 1.1)).join('') }),
    notchDots('line', 'gold'),
    button(),
  ],
};

const triangles = {
  id: 'triangles', level: 1, title: 'Трикутна казка',
  blurb: 'Великий і малий трикутник у кожному промені та зелені трикутники на кільці.',
  slots: s({ body: 'white', arms: 'green', triBig: 'red', triSmall: 'white', triRim: 'green', edge: 'black', gold: 'gold', button: 'black' }),
  order: ['outline', 'base', 'ornament', 'gold'],
  dry: { base: 10, ornament: 10 },
  tips: { ornament: 'Спершу великі червоні трикутники; малий білий — тільки коли червоний висохне.' },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'triBig', rep: ALL, svg: `<path d="M0 -93L12.6 -57.5L-12.6 -57.5Z" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'triSmall', rep: ALL, svg: `<path d="M0 -81L6.6 -62L-6.6 -62Z" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'triRim', rep: 'notches', svg: `<path d="M0 -52.3L3.4 -45L-3.4 -45Z" fill="@"/>` }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: dot(0, -87, 1.6) + dot(0, -54.5, 1.3) }),
    armDots('gold', 'gold'),
    button(),
  ],
};

/* ======================= РІВЕНЬ 2 ======================= */
const kalyna = {
  id: 'kalyna', level: 2, title: 'Калина',
  blurb: 'Гілочка калини в кожному промені й золота розетка в серці.',
  slots: s({ body: 'white', arms: 'red', leaf: 'green', berry: 'red', dot: 'black', gold: 'gold', edge: 'black', button: 'black' }),
  order: ['outline', 'base', 'ornament', 'gold'],
  dry: { base: 10, ornament: 10 },
  tips: {
    ornament: 'Стебло — тонким кінчиком пензля. Ягідку ставиш «тичком»: торкнулася — і підняла.',
    gold: 'Пелюстки розетки малюй від центру назовні, один мазок — одна пелюстка.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'leaf', rep: ALL, svg: line('M0 -50L0 -84', 1.3) + mirror(leaf(0, -60, 16, 5.6, 42) + leaf(0, -72, 11, 4, 36)) }),
    P({ layer: 'ornament', slot: 'berry', rep: ALL, svg: dot(0, -89, 2.6) + dot(-3.2, -83.5, 2.4) + dot(3.2, -83.5, 2.4) }),
    P({ layer: 'ornament', slot: 'dot', rep: 'notches', svg: dot(0, -49.5, 1.7) + dot(-3.6, -45.6, 1.1) + dot(3.6, -45.6, 1.1) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: leaf(0, 0, 12.5, 3.4) }),
    armDots('gold', 'gold'),
    button(),
  ],
};

const kolosky = {
  id: 'kolosky', level: 2, title: 'Колоски',
  blurb: 'Золоті колоски — символ достатку на Святвечір.',
  slots: s({ body: 'white', arms: 'green', stem: 'green', berry: 'red', dot: 'black', grain: 'gold', edge: 'gold', button: 'black' }),
  order: ['outline', 'base', 'ornament', 'gold'],
  dry: { base: 10, ornament: 5 },
  tips: { gold: 'Зернятка ставиш парами знизу вгору: лівий мазок, правий мазок, і так до верхівки.' },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'stem', rep: ALL, svg: line('M0 -50L0 -92', 1.2) + mirror(leaf(0, -52, 15, 4, 32)) }),
    P({ layer: 'ornament', slot: 'berry', rep: 'notches', svg: dot(0, -48.4, 2.3) }),
    armDots('dot', 'ornament', 1.3),
    P({ layer: 'gold', slot: 'grain', rep: ALL, svg: [62, 69, 76, 83].map((t) => mirror(leaf(0, -t, 8.5, 2.6, 26))).join('') + leaf(0, -87, 8.5, 2.4) }),
    P({ layer: 'gold', slot: 'grain', svg: star8(0, 0, 13.5, 6) }),
    button(),
  ],
};

const zirochky = {
  id: 'zirochky', level: 2, title: 'Зоряне небо',
  blurb: 'Великі зірки-іскри, малі золоті зірочки і зелені — між променями.',
  slots: s({ body: 'white', arms: 'red', bigStar: 'red', core: 'white', notchStar: 'green', dot: 'black', gold: 'gold', edge: 'green', button: 'black' }),
  order: ['outline', 'base', 'ornament', 'gold'],
  dry: { base: 10, ornament: 10 },
  tips: { ornament: 'Іскру малюй від центру до кожного з 4 кінців — так кінчики виходять гострими.' },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'bigStar', rep: ALL, svg: spark(0, -70, 10.5) }),
    P({ layer: 'ornament', slot: 'core', rep: ALL, svg: spark(0, -70, 4.4) }),
    P({ layer: 'ornament', slot: 'notchStar', rep: 'notches', svg: spark(0, -48.2, 3.9) }),
    P({ layer: 'ornament', slot: 'dot', rep: ALL, svg: dot(0, -55.6, 1.3) + dot(-6.5, -78, 0.9) + dot(6.5, -78, 0.9) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: spark(0, -88.5, 4.6) }),
    P({ layer: 'gold', slot: 'gold', svg: star8(0, 0, 12.5, 5.5) }),
    button(),
  ],
};

/* ======================= РІВЕНЬ 3 ======================= */
const petrykivka = {
  id: 'petrykivka', level: 3, title: 'Петриківська розкіш',
  blurb: 'Пелюстки-краплі, листочки, ягідки й тонкі золоті завитки.',
  slots: s({ body: 'white', arms: 'white', petal: 'red', leaf: 'green', berry: 'red', dot: 'black', curl: 'gold', edge: 'gold', button: 'black' }),
  order: ['outline', 'base', 'ornament', 'fine', 'gold'],
  dry: { base: 15, ornament: 15, fine: 5 },
  tips: {
    ornament: 'Пелюстку-краплю роби «натиском»: поклала пензлик, натиснула і плавно потягнула вгору.',
    fine: 'Найтонша робота: пензлик майже сухий, рука спирається на стіл.',
    gold: 'Золото завжди останнє — воно лягає поверх висохлих кольорів і дає блиск.',
  },
  elements: [
    ...common({ edgeW: 1.6 }),
    P({ layer: 'ornament', slot: 'petal', rep: ALL, svg: petal(0, -55, 36, 13) + mirror(petal(0, -52, 17, 6, 40)) }),
    P({ layer: 'ornament', slot: 'petal', rep: 'cardinal', svg: petal(0, -1, 13.5, 6.5) }),
    P({ layer: 'ornament', slot: 'leaf', rep: ALL, svg: mirror(leaf(0, -74, 8.4, 3, 55)) }),
    P({ layer: 'ornament', slot: 'berry', rep: 'notches', svg: dot(0, -49, 2.1) + dot(-2.9, -45.6, 1.7) + dot(2.9, -45.6, 1.7) }),
    P({ layer: 'fine', slot: 'dot', rep: ALL, svg: mirror(dot(14.8, -58, 1.1) + dot(17.2, -52.4, 1)) + dot(0, -95, 0.9) }),
    P({ layer: 'fine', slot: 'curl', rep: ALL, svg: mirror(line('M-3 -54C-10 -56 -13.5 -63 -9.5 -67C-7.3 -69 -5 -67.3 -6.2 -65.4', 0.9)) + line('M0 -59L0 -84', 0.9) }),
    P({ layer: 'gold', slot: 'curl', rep: 'diagonal', svg: leaf(0, 0, 11.5, 3.4) }),
    armDots('curl', 'gold'),
    button(),
  ],
};

const moroz = {
  id: 'moroz', level: 3, title: 'Морозний візерунок',
  blurb: 'Білі гілочки інею на темній хвої, золота зірка в серці.',
  slots: s({ body: 'green', arms: 'black', frost: 'white', crystal: 'white', gold: 'gold', edge: 'white', button: 'white' }),
  order: ['base', 'outline', 'ornament', 'fine', 'gold'],
  dry: { base: 20, ornament: 10 },
  tips: {
    base: 'Темна основа йде ПЕРШОЮ: олівець на ній не видно, тож контури переносимо вже після висихання.',
    outline: 'На темній основі контури наноси білою фарбою дуже тонко або м’яким білим олівцем.',
    ornament: 'Гілочки — від осі назовні, коротким рухом «від себе».',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'frost', rep: ALL, svg: line('M0 -51L0 -93', 1.5) + mirror([[60, 10], [70, 8.5], [80, 6], [87.5, 3.5]].map(([t, l]) => line(`M0 ${-t}L${(l * 0.6).toFixed(2)} ${-(t + l * 0.8).toFixed(2)}`, 1.1)).join('')) }),
    P({ layer: 'ornament', slot: 'frost', rep: 'notches', svg: line('M0 -51.5L0 -44.6M-3.2 -48L3.2 -48', 0.9) }),
    P({ layer: 'fine', slot: 'crystal', rep: ALL, svg: mirror([[60, 10], [70, 8.5], [80, 6]].map(([t, l]) => dot(l * 0.6 + 0.9, -(t + l * 0.8) - 0.7, 0.95)).join('') + dot(13.5, -56, 0.8) + dot(16.5, -51.5, 0.8)) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: spark(0, -92.5, 3.4) }),
    P({ layer: 'gold', slot: 'gold', svg: star8(0, 0, 14, 5.6) }),
    armDots('gold', 'gold'),
    button(),
  ],
};

const merezhyvo = {
  id: 'merezhyvo', level: 3, title: 'Золоте мереживо',
  blurb: 'Червона зірка з золотими арками, перлинками та завитками.',
  slots: s({ body: 'red', arms: 'white', lace: 'gold', pearl: 'white', dot: 'black', curl: 'gold', edge: 'gold', button: 'gold' }),
  order: ['base', 'outline', 'ornament', 'fine', 'gold'],
  dry: { base: 20, ornament: 15, fine: 5 },
  tips: {
    base: 'Червоний кладемо у 2 тонкі шари: другий — тільки після висихання першого.',
    ornament: 'Арки — одним рухом від краю до краю, не відриваючи пензлик.',
  },
  elements: [
    ...common({ edgeW: 1.5 }),
    P({ layer: 'ornament', slot: 'lace', rep: ALL, svg: arch(60, 7) + arch(73.5, 5.5) + arch(84.5, 4) }),
    P({ layer: 'ornament', slot: 'pearl', rep: ALL, svg: petal(0, -51.5, 15, 6.5) }),
    P({ layer: 'fine', slot: 'pearl', rep: ALL, svg: dot(0, -67, 1.5) + dot(0, -79, 1.35) + dot(0, -88.6, 1.1) }),
    P({ layer: 'fine', slot: 'dot', rep: ALL, svg: mirror(dot(halfW(66) - 2.6, -66, 0.9) + dot(halfW(79) - 2.2, -79, 0.8)) }),
    P({ layer: 'gold', slot: 'curl', rep: 'notches', svg: line('M-4.6 -46C-3 -50.4 3 -50.4 4.6 -46', 1) + dot(0, -51.6, 0.9, 'fill="@"') }),
    P({ layer: 'gold', slot: 'curl', svg: star8(0, 0, 13.5, 6.5) }),
    armDots('curl', 'gold', 1.3),
    button(),
  ],
};

/* ============ УКРАЇНСЬКІ НАРОДНІ МОТИВИ (адаптовані під 8 променів і 5 фарб) ============ */

/* Поділля: ромб із «серцем» — оберіг родючості з подільських рушників */
const podillia = {
  id: 'podillia', level: 1, title: 'Подільська геометрія', origin: 'Поділля',
  blurb: 'Великий червоний ромб із чорним «серцем» у кожному промені, як на подільських рушниках.',
  slots: s({ body: 'white', arms: 'red', rhomb: 'red', rhombCore: 'black', tooth: 'black', edge: 'black', gold: 'gold', button: 'gold' }),
  order: ['outline', 'base', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Червоні ромби', fine: 'Чорні серця ромбів і зубці' },
  dry: { base: 10, ornament: 10, fine: 5 },
  tips: {
    ornament: 'Ромб: спершу постав 4 крапки-вершини, з’єднай їх рівними лініями — і тільки потім заливай.',
    fine: 'Чорне серце малюй, коли червоний повністю висох, — інакше кольори змішаються в буре.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'rhomb', rep: ALL, svg: `<path d="${rh(0, -72, 8.6, 17)}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'rhomb', rep: 'notches', svg: `<path d="${rh(0, -48.4, 2.6, 3.6)}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'rhombCore', rep: ALL, svg: `<path fill-rule="evenodd" d="${rh(0, -72, 4.6, 9)}${rh(0, -72, 1.9, 3.7)}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'tooth', rep: ALL, svg: `<path d="${rh(0, -93.2, 1.6, 2.9)}" fill="@"/>` + mirror(`<path d="${rh(10.6, -57.6, 2.2, 3)}" fill="@"/>`) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: dot(0, -72, 1.4) }),
    armDots('gold', 'gold'),
    button(),
  ],
};

/* Гуцульщина: дві грані променя (як різьблений хрестик), ромб і «кривулька» — безкінечна ламана лінія-оберіг */
const zig = (t1, t2, steps) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = t1 + ((t2 - t1) * i) / steps;
    pts.push([halfW(t) * (i % 2 ? 0.82 : 0.52), -t]);
  }
  return 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L');
};
const hutsul = {
  id: 'hutsul', level: 1, title: 'Гуцульська кривулька', origin: 'Гуцульщина',
  blurb: 'Темна зірка з червоними гранями, зеленими ромбами й білою кривулькою.',
  slots: s({ body: 'black', arms: 'red', half: 'red', kite: 'green', zigzag: 'white', edge: 'white', gold: 'gold', button: 'gold' }),
  order: ['base', 'outline', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Червоні грані й зелені ромби', fine: 'Біла кривулька' },
  dry: { base: 20, ornament: 15, fine: 5 },
  tips: {
    base: 'Чорна основа йде першою, у 2 тонкі шари. Контури переносимо вже на суху основу білим олівцем.',
    ornament: 'Червоним фарбуй ліві половинки променів — зірка виглядатиме «різьбленою». Зелений ромб — коли червоний підсохне.',
    fine: 'Кривулька — безперервна ламана: не відривай пензлик від початку до кінця.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'half', rep: ALL, svg: `<path transform="translate(0 -62) scale(.86) translate(0 62)" d="${tipHalfD('left')}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'kite', rep: ALL, svg: `<path d="${rh(0, -71, 5.2, 11)}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'zigzag', rep: ALL, svg: mirror(line(zig(56, 88, 8), 0.9)) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: dot(0, -91.5, 1.3) + dot(0, -71, 1.3) }),
    P({ layer: 'gold', slot: 'gold', svg: star8(0, 0, 12, 5) }),
    armDots('gold', 'gold'),
    button(),
  ],
};

/* Восьмикутна ружа — давній знак Сонця: 8 ромбів, що сходяться в центрі */
const ruzhaPetal = (L) => `M0 0L${n(0.19 * L)} ${n(-0.5 * L)}L0 ${n(-L)}L${n(-0.19 * L)} ${n(-0.5 * L)}Z`;
const ruzhaSvg = (cx, cy, L, angles) => angles.map((a) => `<path transform="translate(${cx} ${cy}) rotate(${a})" d="${ruzhaPetal(L)}" fill="@"/>`).join('');
const ruzhaDots = (cx, cy, r, rad) => [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]
  .map((a) => dot(cx + rad * Math.sin((a * Math.PI) / 180), cy - rad * Math.cos((a * Math.PI) / 180), r)).join('');
const ruzha = {
  id: 'ruzha', level: 2, title: 'Восьмикутна ружа', origin: 'Наддніпрянщина, Поділля',
  blurb: 'У кожному промені — ружа з 8 ромбів, у серці — велика золота ружа-сонце.',
  slots: s({ body: 'white', arms: 'green', ruzhaA: 'red', ruzhaB: 'green', leaf: 'green', dot: 'black', gold: 'gold', edge: 'black', button: 'red' }),
  order: ['outline', 'base', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Червоні пелюстки ружі', fine: 'Зелені пелюстки та крапки' },
  dry: { base: 10, ornament: 15, fine: 10 },
  tips: {
    ornament: 'Ружу малюй через одну пелюстку: спершу 4 червоні «хрестом» — так сусідні кольори не торкнуться мокрими.',
    fine: 'Зелені пелюстки — у проміжках між висохлими червоними. Крапки ставиш «тичком» навколо ружі.',
    gold: 'Велику ружу в центрі веди від серединки назовні — кожен ромб двома мазками.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'ruzhaA', rep: ALL, svg: ruzhaSvg(0, -72, 9, [0, 90, 180, 270]) }),
    P({ layer: 'ornament', slot: 'ruzhaA', rep: 'notches', svg: ruzhaSvg(0, -48.6, 3.8, [0, 90, 180, 270]) }),
    P({ layer: 'ornament', slot: 'leaf', rep: ALL, svg: line('M0 -52L0 -62.5', 1.1) + mirror(leaf(0, -56.5, 9, 3.2, 52)) }),
    P({ layer: 'fine', slot: 'ruzhaB', rep: ALL, svg: ruzhaSvg(0, -72, 9, [45, 135, 225, 315]) }),
    P({ layer: 'fine', slot: 'dot', rep: ALL, svg: ruzhaDots(0, -72, 0.8, 8.8) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: `<path d="${rh(0, -89.6, 2.2, 4)}" fill="@"/>` }),
    P({ layer: 'gold', slot: 'gold', svg: ruzhaSvg(0, 0, 13, [0, 45, 90, 135, 180, 225, 270, 315]) }),
    button(),
  ],
};

/* Різдвяний «павук» — солом’яна прикраса-оберіг під стелею хати */
const pavuk = {
  id: 'pavuk', level: 2, title: 'Різдвяний павук', origin: 'солом’яні павуки',
  blurb: 'Золоті соломинки-ромби на хвойному тлі, намистинки й павук-зоря в центрі.',
  slots: s({ body: 'green', arms: 'red', paper: 'red', bead: 'white', beadRed: 'red', straw: 'gold', edge: 'white', button: 'white' }),
  order: ['base', 'outline', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Червоні вставки', fine: 'Намистинки', gold: 'Золоті соломинки' },
  dry: { base: 20, ornament: 10, fine: 5 },
  tips: {
    base: 'Зелена основа — першою і у 2 шари: на ній золото «світиться» найкраще.',
    outline: 'Контури на зеленому — білою фарбою дуже тонко або білим олівцем.',
    fine: 'Намистинки — круглі краплі: набери фарбу на кінчик і просто торкнися дерева.',
    gold: 'Соломинки — тонкі прямі лінії. Веди їх одним рухом, можна під лінійку.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'paper', rep: ALL, svg: `<path d="${rh(0, -73, 4.4, 9.6)}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'bead', rep: ALL, svg: dot(7.6, -73, 1.3) + dot(-7.6, -73, 1.3) + dot(0, -90.4, 1.1) + dot(0, -55.6, 1.4) }),
    P({ layer: 'fine', slot: 'bead', rep: 'notches', svg: dot(0, -48.4, 1.2) }),
    P({ layer: 'fine', slot: 'beadRed', rep: ALL, svg: mirror(dot(3.8, -81.5, 0.9) + dot(3.8, -64.5, 0.9)) + dot(0, -95, 0.8) }),
    P({ layer: 'gold', slot: 'straw', rep: ALL, svg: line(`${rh(0, -73, 7.6, 17)}M0 -57L0 -89M-7.6 -73L7.6 -73`, 0.85) + line(rh(0, -93.2, 1.5, 2.6), 0.7) }),
    P({ layer: 'gold', slot: 'straw', rep: 'notches', svg: line(rh(0, -48.4, 2.6, 3.6), 0.7) }),
    P({ layer: 'gold', slot: 'straw', svg: line('M0 -13L13 0L0 13L-13 0Z', 1) + `<g transform="rotate(45)">${line('M0 -13L13 0L0 13L-13 0Z', 1)}</g>` + line('M0 -13L0 13M-13 0L13 0M-9.2 -9.2L9.2 9.2M-9.2 9.2L9.2 -9.2', 0.6) }),
    button('fine'),
  ],
};

/* Вишивка хрестиком: ромб-оберіг, «деревце» з ріжками і хрестик-зірка */
const PX = 2.2;
const xstitch = (cells, y0 = -54) => cells.map(([c, k]) => {
  const x = c * PX, y = y0 - k * PX, a = PX * 0.36;
  return `M${n(x - a)} ${n(y - a)}L${n(x + a)} ${n(y + a)}M${n(x + a)} ${n(y - a)}L${n(x - a)} ${n(y + a)}`;
}).join('');
const VY = (() => {
  const K = [], R = [], W = [], G = [];
  for (let k = 5; k <= 11; k++) for (let c = -3; c <= 3; c++) {
    const d = Math.abs(c) + Math.abs(k - 8);
    if (d === 3) K.push([c, k]); else if (d === 0) W.push([c, k]); else if (d < 3) R.push([c, k]);
  }
  K.push([0, 12], [0, 13], [0, 14], [0, 15], [0, 16], [0, 17], [-1, 15], [1, 15]);
  for (let k = 0; k <= 4; k++) G.push([0, k]);
  [[1, 1], [2, 2], [3, 3], [4, 4], [4, 5], [3, 6]].forEach(([c, k]) => G.push([c, k], [-c, k]));
  R.push([5, 0], [-5, 0], [6, 1], [-6, 1], [5, 2], [-5, 2]);
  return { K, R, W, G };
})();
const vyshyvanka = {
  id: 'vyshyvanka', level: 2, title: 'Вишиванка', origin: 'вишивка хрестиком',
  blurb: 'Ромб-оберіг, деревце життя з ріжками і хрестик — усе дрібними «хрестиками», як на сорочці.',
  slots: s({ body: 'white', arms: 'red', stitchK: 'black', stitchR: 'red', stitchW: 'white', stitchG: 'green', gold: 'gold', edge: 'black', button: 'gold' }),
  order: ['outline', 'base', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Чорні хрестики-контури', fine: 'Кольорові хрестики' },
  dry: { base: 10, ornament: 10, fine: 10 },
  tips: {
    outline: 'Олівцем легенько розміть сітку: по 2 мм клітинка — так хрестики будуть рівними.',
    ornament: 'Кожен хрестик — два короткі мазки навхрест. Як у вишивці: спершу всі «/», потім усі «\\».',
    fine: 'Кольорові хрестики ставиш, коли чорні висохли, — тоді контур лишиться чистим.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'stitchK', rep: ALL, svg: line(xstitch(VY.K), 0.85) }),
    P({ layer: 'ornament', slot: 'stitchK', rep: 'notches', svg: line(xstitch([[0, 0]], -48.6), 0.85) }),
    P({ layer: 'fine', slot: 'stitchR', rep: ALL, svg: line(xstitch(VY.R), 0.85) }),
    P({ layer: 'fine', slot: 'stitchR', rep: 'notches', svg: line(xstitch([[1, 0], [-1, 0], [0, 1], [0, -1]], -48.6), 0.85) }),
    P({ layer: 'fine', slot: 'stitchW', rep: ALL, svg: line(xstitch(VY.W), 0.85) }),
    P({ layer: 'fine', slot: 'stitchG', rep: ALL, svg: line(xstitch(VY.G), 0.85) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: dot(0, -96, 0.9) }),
    P({ layer: 'gold', slot: 'gold', svg: star8(0, 0, 12.5, 5.2) }),
    armDots('gold', 'gold'),
    button(),
  ],
};

/* Косівська кераміка: біле тло, зелені листки, жовто-золоті тюльпани і тонкий темний контур */
const KOSIV_LINE = 'fill="none" stroke="@" stroke-width=".55" stroke-linejoin="round"';
const kosiv = {
  id: 'kosiv', level: 3, title: 'Косівська кераміка', origin: 'Косів',
  blurb: 'Тюльпани на білому тлі з тонким чорним контуром — як на косівських мисках.',
  slots: s({ body: 'white', arms: 'white', leaf: 'green', flower: 'gold', contour: 'black', gold: 'gold', edge: 'green', button: 'black' }),
  order: ['outline', 'base', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Зелені листки і квіти', fine: 'Тонкий чорний контур' },
  dry: { base: 15, ornament: 15, fine: 10 },
  tips: {
    base: 'Косівське тло — біле й рівне: 2 тонкі шари з висиханням між ними.',
    ornament: 'Спершу зелені листки й стебла, потім жовто-золоті квіти — щоб не змастити.',
    fine: 'Чорний контур — найтоншим пензликом поверх висохлих кольорів: він «збирає» малюнок, як на косівських мисках.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'leaf', rep: ALL, svg: line('M0 -51Q-2.2 -64 0 -77', 1.2) + mirror(leaf(0, -60, 13, 4.6, 50) + leaf(0, -69, 9, 3.4, 40) + petal(0, -77, 9.5, 4, 28)) }),
    P({ layer: 'ornament', slot: 'leaf', rep: 'notches', svg: leaf(0, -44.5, 8, 2.8) }),
    P({ layer: 'ornament', slot: 'leaf', rep: 'diagonal', svg: petal(0, -1, 10, 4.5) }),
    P({ layer: 'ornament', slot: 'flower', rep: ALL, svg: petal(0, -77, 15, 7) }),
    P({ layer: 'ornament', slot: 'flower', rep: 'cardinal', svg: petal(0, -1, 12, 5.5) }),
    P({ layer: 'fine', slot: 'contour', rep: ALL, svg: petal(0, -77, 15, 7, 0, KOSIV_LINE)
      + mirror(petal(0, -77, 9.5, 4, 28, KOSIV_LINE) + leaf(0, -60, 13, 4.6, 50, KOSIV_LINE) + leaf(0, -69, 9, 3.4, 40, KOSIV_LINE))
      + line('M0 -80L0 -88', 0.5) + mirror([58, 64, 70].map((t) => dot(halfW(t) - 2.3, -t, 0.65)).join('')) }),
    P({ layer: 'fine', slot: 'contour', rep: 'notches', svg: dot(0, -52.8, 0.7) }),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: spark(0, -94.5, 2.6) }),
    armDots('gold', 'gold', 1.2),
    button(),
  ],
};

/* Петриківська калина: червоні грона з білими відблисками, листя з золотим «гребінчиком» на чорному тлі */
const BERRIES = [[0, -90.5], [-2.5, -86.4], [2.5, -86.4], [-4.6, -81.8], [0, -81.8], [4.6, -81.8], [-2.4, -77.2], [2.4, -77.2], [0, -72.8]];
const comb = (x, y, len, rot, ticks) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${rot})">${line(`M0 -1.5L0 ${n(-len + 1.5)}`, 0.55)}${ticks.map((k) => line(`M0 ${n(-k)}L-2.3 ${n(-k - 1.8)}`, 0.5)).join('')}</g>`;
const hrona = {
  id: 'hrona', level: 3, title: 'Петриківська калина', origin: 'Петриківка',
  blurb: 'Грона калини з білими відблисками і листя з золотим «гребінчиком» на чорному тлі.',
  slots: s({ body: 'black', arms: 'green', berry: 'red', leaf: 'green', shine: 'white', comb: 'gold', gold: 'gold', edge: 'red', button: 'gold' }),
  order: ['base', 'outline', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Грона й листя', fine: 'Білі відблиски', gold: 'Золотий гребінчик' },
  dry: { base: 20, ornament: 15, fine: 5 },
  tips: {
    base: 'Чорне тло — як у петриківських майстрів: першим, у 2 шари, і добре висушити.',
    ornament: 'Ягідку ставиш «тичком» круглою кистю, листок — «мазком-натиском» від стебла.',
    fine: 'Відблиск — крихітна біла крапка з одного боку кожної ягідки: так грона стають об’ємними.',
    gold: '«Гребінчик» — тонкі риски вздовж листка, як зубчики гребінця. Пензлик майже сухий.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'leaf', rep: ALL, svg: line('M0 -52L0 -71', 1.2) + mirror(leaf(0, -57, 15, 5.4, 48) + leaf(0, -65, 9, 3.4, 36)) }),
    P({ layer: 'ornament', slot: 'berry', rep: ALL, svg: BERRIES.map(([x, y]) => dot(x, y, 2.3)).join('') + dot(0, -30, 2.2) }),
    P({ layer: 'ornament', slot: 'berry', rep: 'notches', svg: dot(0, -48.4, 2) }),
    P({ layer: 'fine', slot: 'shine', rep: ALL, svg: BERRIES.map(([x, y]) => dot(x - 0.7, y - 0.8, 0.62)).join('') + dot(-0.7, -30.8, 0.6) }),
    P({ layer: 'fine', slot: 'shine', rep: 'notches', svg: dot(-0.6, -49.1, 0.55) }),
    P({ layer: 'gold', slot: 'comb', rep: ALL, svg: mirror(comb(0, -57, 15, 48, [3.5, 6, 8.5, 11]) + comb(0, -65, 9, 36, [3.5, 6])) }),
    P({ layer: 'gold', slot: 'gold', svg: star8(0, 0, 13, 5.5) }),
    button(),
  ],
};

/* Писанковий «сорококлинець»: промінь поділено на трикутні клини, чорні проміжки — як лінії воску */
const SK = [97, 87, 77, 67, 57];
const SOROKA = (() => {
  const up = [], down = [];
  for (let i = 0; i < SK.length - 1; i++) {
    const L1 = SK[i], L2 = SK[i + 1];
    const w1 = halfW(L1) - 0.6, w2 = halfW(L2) - 0.6;
    up.push(poly(shrink([[0, -L1], [w2, -L2], [-w2, -L2]], 0.74)));
    if (w1 > 2) for (const sg of [-1, 1]) down.push(poly(shrink([[sg * w1, -L1], [0, -L1], [sg * w2, -L2]], 0.64)));
  }
  return { up: up.join(''), down: down.join('') };
})();
const pysanka = {
  id: 'pysanka', level: 3, title: 'Писанкова зоря', origin: 'писанка-сорококлинець',
  blurb: 'Кожен промінь поділено на трикутні клини, як на писанці-сорококлинці, у центрі — золота зоря.',
  slots: s({ body: 'black', arms: 'red', triUp: 'red', triDown: 'white', dot: 'white', gold: 'gold', edge: 'white', button: 'gold' }),
  order: ['base', 'outline', 'ornament', 'fine', 'gold'],
  stepTitles: { ornament: 'Червоні клини', fine: 'Білі клини й крапки' },
  dry: { base: 20, ornament: 10, fine: 10 },
  tips: {
    base: 'Як на писанці — чорне тло першим. Висуши добре: тонкі чорні проміжки між клинами — це і є «лінії воску».',
    ornament: 'Клин заливай від вершини до основи, не заходячи на чорні проміжки.',
    fine: 'Білі клини — після висихання червоних. Крапки на осі — найменшим кінчиком.',
  },
  elements: [
    ...common(),
    P({ layer: 'ornament', slot: 'triUp', rep: ALL, svg: `<path d="${SOROKA.up}" fill="@"/>` }),
    P({ layer: 'ornament', slot: 'triUp', rep: 'notches', svg: `<path d="${poly(shrink([[0, -53], [3.6, -45], [-3.6, -45]], 0.9))}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'triDown', rep: ALL, svg: `<path d="${SOROKA.down}" fill="@"/>` }),
    P({ layer: 'fine', slot: 'dot', rep: ALL, svg: [87, 77, 67, 57].map((t) => dot(0, -t, 0.9)).join('') + mirror(dot(halfW(53) * 0.55, -53, 0.8)) }),
    armDots('dot', 'fine', 1.2),
    P({ layer: 'gold', slot: 'gold', rep: ALL, svg: dot(0, -97.4, 0.7) }),
    P({ layer: 'gold', slot: 'gold', svg: star8(0, 0, 14, 5.6) }),
    button(),
  ],
};

export const DESIGNS = [rays, stripes, triangles, podillia, hutsul, kalyna, kolosky, zirochky, ruzha, pavuk, vyshyvanka, petrykivka, moroz, merezhyvo, kosiv, hrona, pysanka];
export const DESIGN = Object.fromEntries(DESIGNS.map((d) => [d.id, d]));
for (const d of DESIGNS) d.bare = { fill: 'wood', layers: ['base'] };

/* Пресети кольорів — перестановки 5 фарб (щоб лишалися лише фарби набору) */
export const PRESETS = [
  { id: 'classic', title: 'Як задумано', swap: {} },
  { id: 'night', title: 'Нічна', swap: { white: 'black', black: 'white' } },
  { id: 'pine', title: 'Хвойна', swap: { white: 'green', green: 'white' } },
  { id: 'fire', title: 'Вогняна', swap: { white: 'red', red: 'white' } },
  { id: 'golden', title: 'Золота', swap: { white: 'gold', gold: 'white' } },
];
export function presetColors(design, presetId) {
  const swap = PRESETS.find((p) => p.id === presetId)?.swap || {};
  return Object.fromEntries(Object.entries(design.slots).map(([k, v]) => [k, swap[v.def] || v.def]));
}
