/* 3D-модель набору (Three.js + OrbitControls). Одиниці — сантиметри, Y — вгору, підлога y = 0.

   • Зірка — повноцінне тіло з фанери: товщина STAR.thicknessCm, фаска STAR.chamferCm
     по зовнішньому краю і по всіх 8 прорізах. Лицьовий бік = живий розпис з майстерні
     (той самий SVG, що й у конструкторі, з урахуванням поточного кроку), золото — металеве.
   • Підставка — ПЛАСКИЙ силует, вирізаний з фанери (STAND.thicknessCm). Контур
     обводиться автоматично: з вашого PNG ASSETS.villageStand (1-в-1 з виробом) або,
     поки фото немає, з макета села. Силует стоїть у пазу платформи, перед ним у
     своєму пазу — паличка, на якій тримається зірка.
   • Дерево: ASSETS.textures (ваші фото фанери) або процедурна текстура. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ASSETS, STAR, STAND } from './config.js';
import { starPoints, openingPolygon } from './geometry.js';
import { starOnly, villageOnly, VILLAGE_H } from './compose.js';
import { DESIGN } from './ornaments.js';
import { VILLAGE } from './village.js';
import { traceAlpha, rasterize } from './trace.js';
const UP = new THREE.Vector3(0, 1, 0);
// денне студійне світло (світле ательє)
const DAY = { sky: 0xfff6ea, ground: 0xd8c2a2, hemi: 1.15, key: 0xfff1dc, keyI: 2.3, rim: 0xffe6c8, rimI: 0.7, exposure: 1.0 };

/* ---------- розміри (реальний виріб, см) ---------- */
const HALF = STAR.sizeCm / 2;
const K = HALF / STAR.R; // см на одиницю SVG зірки
const T_BACK = STAR.backCm, T_FRONT = STAR.frontCm;
const T = T_BACK + T_FRONT; // 6,2 мм
const CH = STAR.chamferCm;
const VW = 220, VS = 4; // макет села: 220 × VILLAGE_H од., растр 4 px/од.

const FOOT = STAND.foot;
const FOOT_TOP = FOOT.thicknessCm;
const SIL_T = STAND.thicknessCm;
const SIL_CH = 0.04;
const SIL_Z = -FOOT.depthCm / 2 + 0.8 + SIL_T / 2; // хатинка — ближче до заднього краю основи
const STK = STAND.stick;
const STICK_Z = FOOT.depthCm / 2 + STAND.drift.offsetCm; // паличка — у заметі на півкруглому виступі
const STAR_Z = STICK_Z + STK.thicknessCm / 2 + STAND.washerCm; // задня площина зірки
const STAR_Y = STAND.totalHeightCm - HALF; // центр зірки: верхній кінчик = 165 мм

/* «технічні» кольори для карти металу: B = металевість, G = шорсткість */
// G = шорсткість, B = металевість: золото 0,28 / 0,65, решта — матовий акрил
const METAL = '#005CFF', PLAIN = '#00FF00';
/* телефон / слабкий пристрій: менше пікселів, без динамічних тіней, менше снігу */
const MOBILE = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
const LOW = MOBILE || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const TEX = LOW ? 768 : 1024;

/** м’яка «запечена» тінь під підставкою — замість карти тіней на слабких пристроях */
function blobShadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return canvasTex(c);
}

/* ---------- текстури ---------- */
function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function dataTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
function woodCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#e9d4ad'; g.fillRect(0, 0, size, size); // світла береза
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const y = rnd() * size;
    g.strokeStyle = `rgba(${165 + rnd() * 30},${120 + rnd() * 25},70,${0.04 + rnd() * 0.07})`;
    g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    for (let x = -32; x <= size + 32; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 4 + (rnd() - 0.5) * 2);
    g.stroke();
  }
  return c;
}
/** торець фанери: шари шпону */
function edgeCanvas() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const plies = 5;
  for (let i = 0; i < plies; i++) {
    g.fillStyle = i % 2 ? '#d9b47c' : '#e8cb98';
    g.fillRect(0, (i * 64) / plies, 256, 64 / plies);
    g.fillStyle = 'rgba(110,70,30,.35)';
    g.fillRect(0, (i * 64) / plies, 256, 1.2);
  }
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(120,80,40,${Math.random() * 0.12})`;
    g.fillRect(Math.random() * 256, Math.random() * 64, 1 + Math.random() * 6, 1);
  }
  return c;
}
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return canvasTex(c);
}
async function tryLoad(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!r.ok) return null;
    const t = await new THREE.TextureLoader().loadAsync(url);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } catch { return null; }
}
function tiled(src, rx, ry) {
  const t = src.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}
/** калібрування фото (ASSETS.calib) — через матрицю текстури, геометрія не змінюється */
function applyCalib(t, c = {}) {
  t.center.set(0.5, 0.5);
  t.rotation = -((c.rotateDeg || 0) * Math.PI) / 180;
  const s = c.scale || 1;
  t.repeat.set(1 / s, 1 / s);
  t.offset.set(c.offsetX || 0, c.offsetY || 0);
  return t;
}
/** SVG → карта металу/шорсткості: золоті слоти = METAL, усе інше = PLAIN */
function metalSvg(svg) {
  return svg.replace('<svg ', `<svg style="fill:${PLAIN}" `).replace(/(fill|stroke)="(?!none|#005CFF)[^"]*"/g, `$1="${PLAIN}"`);
}
function metalColors(obj, colors) {
  return Object.fromEntries(Object.keys(obj.slots).map((s) => [s, (colors[s] || obj.slots[s].def) === 'gold' ? METAL : PLAIN]));
}
const hasGold = (obj, colors) => Object.keys(obj.slots).some((s) => (colors[s] || obj.slots[s].def) === 'gold');

/* ---------- геометрія ---------- */
function starShape() {
  const sh = new THREE.Shape();
  starPoints().forEach(([x, y], i) => (i ? sh.lineTo(x * K, -y * K) : sh.moveTo(x * K, -y * K)));
  sh.closePath();
  for (let k = 0; k < 8; k++) {
    const p = new THREE.Path();
    openingPolygon(k, 10).forEach(([x, y], i) => (i ? p.lineTo(x * K, -y * K) : p.moveTo(x * K, -y * K)));
    p.closePath();
    sh.holes.push(p);
  }
  return sh;
}
/* ---------- передній ажурний шар: білий, із наскрізними вирізами ----------
   ті самі 8 вікон, що й у фанері + центральна 8-пелюсткова квітка-сніжинка
   + у кожному з 8 променів — пташка і гілочка з трьох листочків.
   Крізь вирізи видно берёзову фанеру заднього шару. Одиниці — SVG зірки (R = 100, y — донизу). */
const rotP = ([x, y], deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
function bez(p0, p1, p2, p3, n = 6) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}
/** пелюстка-крапля: основа в (0,0), росте вгору на len */
const petalPts = (len, wid) => { const w = wid / 2; return [[0, 0], ...bez([0, 0], [w * 1.6, -len * 0.3], [w * 1.1, -len * 0.85], [0, -len]), ...bez([0, -len], [-w * 1.1, -len * 0.85], [-w * 1.6, -len * 0.3], [0, 0]).slice(0, -1)]; };
/** листочок-«човник» */
const leafPts = (len, wid) => [[0, 0], ...bez([0, 0], [wid * 0.66, -len * 0.33], [wid * 0.66, -len * 0.66], [0, -len], 5), ...bez([0, -len], [-wid * 0.66, -len * 0.66], [-wid * 0.66, -len * 0.33], [0, 0], 5).slice(0, -1)];
/** стилізована пташка (дзьоб праворуч), центр у (0,0) */
const BIRD = [[-9.5, -2.2], [-6, -1.3], [-3, -2.5], [0, -3.4], [2.5, -4.4], [4.6, -4.7], [6.2, -3.7], [9, -2.6], [6.3, -1.6], [4.6, 0.2], [1.6, 2.4], [-2, 2.6], [-5, 1.5], [-9.5, 1.3], [-7, -0.4]];
const place = (pts, dx, dy, rot = 0) => pts.map((p) => { const [x, y] = rotP(p, rot); return [x + dx, y + dy]; });
function openworkHoles() {
  const holes = [];
  for (let k = 0; k < 8; k++) holes.push(openingPolygon(k, 10));
  for (let k = 0; k < 8; k++) {
    const a = 45 * k + STAR.rotateDeg, dir = k % 2 ? -1 : 1;
    [
      place(petalPts(11.5, 5), 0, -6), // пелюстка квітки-сніжинки (по осі променя)
      BIRD.map(([x, y]) => [x * dir, y - 61]), // пташка — по черзі дивиться ліворуч / праворуч
      place(leafPts(8, 3.4), -1.5, -71, -32), // гілочка: два листочки навскіс
      place(leafPts(8, 3.4), 1.5, -71, 32),
      place(leafPts(8.5, 2.6), 0, -79.5), // і верхній листочок
    ].forEach((h) => holes.push(h.map((pt) => rotP(pt, a))));
  }
  return holes;
}
function polyPath(pts, P = THREE.Path) {
  const p = new P();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x * K, -y * K) : p.moveTo(x * K, -y * K)));
  p.closePath();
  return p;
}
function openworkShape() {
  const sh = polyPath(starPoints(STAR.frontInset), THREE.Shape);
  openworkHoles().forEach((h) => sh.holes.push(polyPath(h)));
  return sh;
}
/** основа підставки: заокруглений прямокутник + півкруглий виступ-замет спереду (у фігурі y = −z) */
function footShape(W, D, r, rb) {
  const s = new THREE.Shape();
  s.moveTo(-W / 2 + r, -D / 2);
  s.lineTo(-rb, -D / 2);
  s.absarc(0, -D / 2, rb, Math.PI, Math.PI * 2, false);
  s.lineTo(W / 2 - r, -D / 2); s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + r);
  s.lineTo(W / 2, D / 2 - r); s.quadraticCurveTo(W / 2, D / 2, W / 2 - r, D / 2);
  s.lineTo(-W / 2 + r, D / 2); s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - r);
  s.lineTo(-W / 2, -D / 2 + r); s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + r, -D / 2);
  return s;
}
/** паличка: прямокутник із заокругленим верхнім торцем */
function stickShape(w, len) {
  const r = w / 2, s = new THREE.Shape();
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, len - r);
  s.absarc(0, len - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}
/** рельєф хатинки для bump-карти: що світліше — то вище */
const VILLAGE_RELIEF = { ground: '#4a4a4a', walls: '#7a7a7a', roof: '#b4b4b4', roofSnow: '#f0f0f0', door: '#5a5a5a', windows: '#3c3c3c', frames: '#a0a0a0', trees: '#909090', treeSnow: '#d8d8d8' };

function shapeFrom(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}
/** «лист фанери» заданої форми: товщина thick, фаска ch (в межах контуру, розмір не росте).
    Матеріали: 0 — лице, 1 — торець і фаска, 2 — зворот. uvFn(x, y, isFront) → [u, v] для лиця/звороту */
function plate(shape, thick, ch, uvFn) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thick - 2 * ch, steps: 1, curveSegments: 8,
    bevelEnabled: ch > 0, bevelThickness: ch, bevelSize: ch, bevelOffset: -ch, bevelSegments: 1,
  });
  geo.translate(0, 0, -(thick - 2 * ch) / 2);
  const [caps, sides] = geo.groups;
  const half = caps.count / 2;
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const firstIsBack = pos.getZ(caps.start) < pos.getZ(caps.start + half);
  geo.clearGroups();
  [[caps.start, firstIsBack ? 2 : 0], [caps.start + half, firstIsBack ? 0 : 2]].forEach(([s, m]) => {
    geo.addGroup(s, half, m);
    for (let i = s; i < s + half; i++) {
      const [u, v] = uvFn(pos.getX(i), pos.getY(i), m === 0);
      uv.setXY(i, u, v);
    }
  });
  geo.addGroup(sides.start, sides.count, 1);
  uv.needsUpdate = true;
  return geo;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* ---------- силует підставки ---------- */
/** з макета села: frame = рамка текстури в см (низ-ліво = (-W/2, 0)) */
async function traceVillageSvg() {
  const canvas = await rasterize(villageOnly({}, { idp: 'vt', bare: true, mono: '#000' }), VW * VS, VILLAGE_H * VS);
  const px = traceAlpha(canvas);
  // масштаб — так, щоб силует хатинки з ялинками мав реальну ширину STAND.widthCm
  const xs = px.map(([x]) => x / VS);
  const kv = STAND.widthCm / (Math.max(...xs) - Math.min(...xs));
  const W = VW * kv, H = VILLAGE_H * kv;
  return { pts: px.map(([x, y]) => [(x / VS - VW / 2) * kv, (VILLAGE_H - y / VS) * kv]), W, H, fromPhoto: false };
}
/** з фото PNG із прозорим фоном — 1-в-1 з реальним виробом */
async function traceVillagePhoto(tex) {
  const img = tex.image;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const cw = 1000, chh = Math.round((cw * ih) / iw);
  const canvas = await rasterize(img, cw, chh);
  const px = traceAlpha(canvas, { epsilon: 1.4 });
  if (px.length < 8) return null;
  const W = STAND.widthCm, H = STAND.photoHeightCm || (W * ih) / iw;
  return { pts: px.map(([x, y]) => [(x / cw - 0.5) * W, (1 - y / chh) * H]), W, H, fromPhoto: true };
}

export class Viewer {
  constructor(host) {
    this.host = host;
    this.look = 'painted';
    this.viewName = 'fit';
    this.spin = { vel: 0, drag: null };
    this.auto = true;
    this.touched = false; this.swayT = 0; this.swayOff = 0; // демо-покачування до першого дотику
    this.active = false;
    this.dragging = false;
    this.t = 0;
    this.resumeAt = 0;
    this.texKey = '';
    this.job = 0;
    this.tex = {};
  }

  async init() {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: LOW ? 'default' : 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = DAY.exposure;
    r.shadowMap.enabled = !LOW;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host.innerHTML = '';
    this.host.appendChild(r.domElement);

    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);

    // світла студія: м’яке денне «вікно» + теплий ключовий + легкий контровий (видно фаску, волокна й шари фарби)
    const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemi); scene.add(hemi);
    const key = new THREE.DirectionalLight(DAY.key, DAY.keyI);
    key.position.set(7, 16, 17);
    key.castShadow = !LOW;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -11, right: 11, top: 19, bottom: -3, near: 1, far: 50 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    let rim = null;
    if (!LOW) { rim = new THREE.DirectionalLight(DAY.rim, DAY.rimI); rim.position.set(-9, 11, -11); scene.add(rim); }
    const candle = new THREE.PointLight(0xffa860, 25, 40, 2); candle.position.set(0, 5, 9); scene.add(candle);
    this.L = { hemi, key, rim, candle };

    // підставка «стоїть на столі»: м’яка контактна тінь завжди + справжня тінь від ключового світла (крім слабких GPU)
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: blobShadowTex(), transparent: true, depthWrite: false, opacity: LOW ? 1 : 0.7 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);
    if (!LOW) {
      const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.ShadowMaterial({ opacity: 0.22, color: 0x4a3020 }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    }

    /* ----- фото й текстури (кожне — необов’язкове) ----- */
    const X = ASSETS.textures || {};
    const [pf, pb, pv, tf, te] = await Promise.all([
      tryLoad(ASSETS.starFront), tryLoad(ASSETS.starBack), tryLoad(ASSETS.villageStand), tryLoad(X.face), tryLoad(X.edge),
    ]);
    const aniso = r.capabilities.getMaxAnisotropy();
    const rc = X.repeatCm || 12;
    const faceSrc = tf || canvasTex(woodCanvas());
    const edgeSrc = te || canvasTex(edgeCanvas());
    const faceUnit = tiled(faceSrc, STAR.sizeCm / rc, STAR.sizeCm / rc); // UV 0..1 на всю зірку
    const faceCm = tiled(faceSrc, 1 / rc, 1 / rc); // UV у сантиметрах
    const edgeTex = tiled(edgeSrc, 1 / rc, 1 / T); // u — уздовж краю (см), v — товщина
    [faceUnit, faceCm, edgeTex].forEach((t) => (t.anisotropy = aniso));
    if (pf) applyCalib(pf, ASSETS.calib?.front);
    if (pb) applyCalib(pb, ASSETS.calib?.back);
    this.photo = { front: pf, back: pb, village: pv };
    this.faceUnit = faceUnit;

    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.78, ...o });
    const gypsum = { color: 0xf3efe7, roughness: 0.93 }; // білий матовий «гіпс»
    this.m = {
      starFront: std({ ...gypsum }), // ажурний шар; лице — розпис (матовий акрил, золото — металік)
      white: std({ ...gypsum }),
      plyFace: std({ map: faceUnit, roughness: 0.82 }), // берёзова фанера, видна крізь вирізи
      starBack: std({ map: pb || faceUnit, roughness: 0.82 }),
      edge: std({ map: edgeTex, roughness: 0.88 }),
      stick: std({ map: faceCm, color: 0xd9a86c, roughness: 0.8 }), // паличка — тепліше й темніше за фанеру
      metal: std({ color: 0xbdb6aa, metalness: 0.85, roughness: 0.38 }),
      dark: std({ color: 0x2b2420, roughness: 0.9 }),
      silFront: std({ ...gypsum, color: 0xffffff }),
    };

    const product = (this.product = new THREE.Group());
    scene.add(product);
    const add = (mesh, cast = true) => { mesh.castShadow = cast; mesh.receiveShadow = true; product.add(mesh); return mesh; };

    /* ----- основа 155 × 60 мм із півкруглим виступом-заметом спереду ----- */
    const fc = 0.06;
    const footGeo = new THREE.ExtrudeGeometry(footShape(FOOT.widthCm, FOOT.depthCm, 0.5, STAND.drift.radiusCm), {
      depth: FOOT.thicknessCm - 2 * fc, steps: 1, curveSegments: 10,
      bevelEnabled: true, bevelThickness: fc, bevelSize: fc, bevelOffset: -fc, bevelSegments: 2,
    });
    footGeo.rotateX(-Math.PI / 2);
    footGeo.translate(0, fc, 0);
    add(new THREE.Mesh(footGeo, this.m.white));
    // сніговий замет, у який встромлена паличка
    const drift = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.m.white);
    drift.scale.set(STAND.drift.radiusCm * 0.92, STAND.drift.heightCm, STAND.drift.radiusCm * 0.82);
    drift.position.set(0, FOOT_TOP - 0.02, STICK_Z);
    add(drift);

    /* ----- хатинка з ялинками: білий матовий силует із рельєфом ----- */
    let sil = pv ? await traceVillagePhoto(pv) : null;
    if (!sil) sil = await traceVillageSvg();
    this.sil = sil;
    const minY = Math.min(...sil.pts.map((p) => p[1]));
    const silGeo = plate(shapeFrom(sil.pts), SIL_T, SIL_CH, (x, y, front) => (front ? [x / sil.W + 0.5, y / sil.H] : [x, y]));
    const silMesh = (this.silMesh = new THREE.Mesh(silGeo, [this.m.silFront, this.m.white, this.m.white]));
    silMesh.position.set(0, FOOT_TOP - minY - 0.01, SIL_Z);
    add(silMesh);
    if (!pv) {
      const relief = await rasterize(villageOnly(VILLAGE_RELIEF, { idp: 'vb', bare: false }), VW * 2, VILLAGE_H * 2, '#000');
      this.m.silFront.bumpMap = dataTex(relief);
      this.m.silFront.bumpScale = 1.6;
    }

    /* ----- паличка 12,8 × 6,3 × 107 мм із заокругленим верхом; гвинтик-вісь і шайба ----- */
    const stickTop = STAR_Y + 0.9;
    const sb = 0.03;
    const stickGeo = new THREE.ExtrudeGeometry(stickShape(STK.widthCm, STK.lengthCm), {
      depth: STK.thicknessCm - 2 * sb, steps: 1, curveSegments: 10,
      bevelEnabled: true, bevelThickness: sb, bevelSize: sb, bevelOffset: -sb, bevelSegments: 1,
    });
    stickGeo.translate(0, 0, -(STK.thicknessCm - 2 * sb) / 2);
    const stick = add(new THREE.Mesh(stickGeo, this.m.stick));
    stick.position.set(0, stickTop - STK.lengthCm, STICK_Z);
    const cyl = (r1, r2, h, z, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 20), mat); m.rotation.x = Math.PI / 2; m.position.set(0, STAR_Y, z); return add(m); };
    cyl(0.42, 0.42, STAND.washerCm, STICK_Z + STK.thicknessCm / 2 + STAND.washerCm / 2, this.m.metal); // шайба
    const back = STICK_Z - STK.thicknessCm / 2;
    cyl(0.3, 0.34, 0.14, back - 0.07, this.m.metal); // голівка гвинтика ззаду
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.03), this.m.dark);
    slit.position.set(0, STAR_Y, back - 0.14); product.add(slit);

    /* ----- зірка 118 мм, 6,2 мм: фанера 3,2 мм + білий ажурний шар 3,0 мм. Обертається на гвинтику ----- */
    this.starY = STAR_Y;
    const uvStar = (x, y, front) => [((front ? x : -x) / HALF + 1) / 2, (y / HALF + 1) / 2];
    const star = (this.star = new THREE.Group());
    star.position.set(0, STAR_Y, STAR_Z);
    const plyLayer = new THREE.Mesh(plate(starShape(), T_BACK, CH, uvStar), [this.m.plyFace, this.m.edge, this.m.starBack]);
    plyLayer.position.z = T_BACK / 2;
    const lace = new THREE.Mesh(plate(openworkShape(), T_FRONT, CH, uvStar), [this.m.starFront, this.m.white, this.m.white]);
    lace.position.z = T_BACK + T_FRONT / 2 + 0.002;
    [plyLayer, lace].forEach((m) => { m.castShadow = m.receiveShadow = true; star.add(m); });
    product.add(star);

    /* ----- сніжинки ----- */
    const N = LOW ? 60 : 170, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 34; pos[i * 3 + 1] = Math.random() * 26; pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 3; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.26, map: dotTex(), transparent: true, depthWrite: false, opacity: 0.55, color: 0xfff1dc }));
    this.snow.visible = this.light === 'candle';
    scene.add(this.snow);

    /* ----- керування: вільне обертання 360° ----- */
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    Object.assign(c, {
      enableDamping: true, dampingFactor: 0.08, enablePan: false,
      minDistance: 8, maxDistance: 70, rotateSpeed: 0.85, zoomSpeed: 0.8,
      autoRotate: false, autoRotateSpeed: 1.6, minPolarAngle: 0.05, maxPolarAngle: Math.PI * 0.92,
    });
    c.addEventListener('start', () => { this.dragging = true; this.tween = null; this.touched = true; });
    c.addEventListener('end', () => { this.dragging = false; this.resumeAt = this.t + 3; });
    r.domElement.style.touchAction = 'none'; // сторінка не гортається — увесь жест належить 3D
    this.initSpin(r.domElement);

    this.views = {
      front: { target: [0, STAR_Y, STAR_Z], dir: [0, 0.04, 1], dist: 30 },
      side: { target: [0, STAR_Y, STAR_Z], dir: [0.95, 0.14, 0.32], dist: 22 },
      back: { target: [0, STAR_Y, STICK_Z], dir: [-0.25, 0.1, -1], dist: 26 },
    };
    this.setView(this.viewName, true);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host);
    this.resize();
    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.raf = 0;
    // вкладку згорнули — рендер стоїть; повернулися — продовжує
    this.onVis = () => { if (!document.hidden && this.active) this.kick(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.ready = true;
    this.applyLook();
    if (this.light) this.setLight(this.light);
  }

  /** перенести полотно в інший контейнер (вітрина ↔ майстерня) */
  attach(host) {
    if (!host || host === this.host) return;
    this.ro?.unobserve(this.host);
    this.host = host;
    host.querySelector('.viewer-loading')?.remove();
    host.appendChild(this.renderer.domElement);
    this.ro?.observe(host);
    this.resize();
  }

  /* ---------- живі текстури з майстерні ---------- */
  async update(state, { starLayers = null, villageLayers = null } = {}) {
    this.state = state;
    if (!this.ready) return;
    const sl = starLayers ? [...starLayers] : null, vl = villageLayers ? [...villageLayers] : null;
    const key = JSON.stringify([state.star.designId, state.star.colors, state.village.colors, sl, vl]);
    if (key === this.texKey) return;
    this.texKey = key;
    const job = ++this.job;
    const d = DESIGN[state.star.designId];
    const sc = state.star.colors, vc = state.village.colors;
    const sGold = hasGold(d, sc) && (!starLayers || [...starLayers].length), vGold = hasGold(VILLAGE, vc);
    const [star, starM, vil, vilM] = await Promise.all([
      rasterize(starOnly(state.star.designId, sc, { idp: 'tx', bare: false, layers: starLayers }), TEX, TEX, '#F1EDE4'),
      sGold ? rasterize(metalSvg(starOnly(state.star.designId, metalColors(d, sc), { idp: 'tm', bare: false, layers: starLayers })), 512, 512, PLAIN) : null,
      rasterize(villageOnly(vc, { idp: 'vx', bare: true, layers: villageLayers }), VW * VS, VILLAGE_H * VS, VILLAGE.bare.fill),
      vGold ? rasterize(metalSvg(villageOnly(metalColors(VILLAGE, vc), { idp: 'vm', bare: false, layers: villageLayers })), VW * 2, VILLAGE_H * 2, PLAIN) : null,
    ]);
    if (job !== this.job) return; // уже прийшов новіший стан
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    const next = { star: canvasTex(star), starM: starM && dataTex(starM), vil: canvasTex(vil), vilM: vilM && dataTex(vilM) };
    next.star.anisotropy = next.vil.anisotropy = aniso;
    Object.values(this.tex).forEach((t) => t?.dispose());
    this.tex = next;
    this.applyLook();
  }

  setLook(look) { this.look = look; this.applyLook(); }

  /* ---------- освітлення: «день» або «свічка». Перехід плавний (~0,8 с), полум’я мерехтить ---------- */
  setLight(mode) {
    this.light = mode;
    if (!this.L) return;
    const c = mode === 'candle';
    this.lt = {
      sky: new THREE.Color(c ? 0xffb07a : DAY.sky), ground: new THREE.Color(c ? 0x2a1208 : DAY.ground), hemi: c ? 0.2 : DAY.hemi,
      key: new THREE.Color(c ? 0xffb27a : DAY.key), keyI: c ? 0.3 : DAY.keyI,
      rim: new THREE.Color(c ? 0xff7a30 : DAY.rim), rimI: c ? 0.45 : DAY.rimI,
      flame: new THREE.Color(c ? 0xff9a42 : 0xffa860), flameI: c ? 110 : 25,
      flamePos: c ? new THREE.Vector3(0, STAR_Y - 7.5, STAR_Z + 5.5) : new THREE.Vector3(0, 5, 9),
      exposure: c ? 1.15 : DAY.exposure, snow: c ? 0.55 : 0,
    };
    if (!this.ltNow) { this.ltNow = true; this.stepLight(1); } // перший кадр — одразу, без переходу
  }
  /** k ∈ (0..1] — частка шляху до цільового світла за цей кадр */
  stepLight(k) {
    const L = this.L, t = this.lt;
    if (!t) return;
    const n = (a, b) => a + (b - a) * k;
    L.hemi.color.lerp(t.sky, k); L.hemi.groundColor.lerp(t.ground, k); L.hemi.intensity = n(L.hemi.intensity, t.hemi);
    L.key.color.lerp(t.key, k); L.key.intensity = n(L.key.intensity, t.keyI);
    if (L.rim) { L.rim.color.lerp(t.rim, k); L.rim.intensity = n(L.rim.intensity, t.rimI); }
    L.candle.color.lerp(t.flame, k); L.candle.position.lerp(t.flamePos, k);
    this.flameBase = n(this.flameBase ?? t.flameI, t.flameI);
    this.renderer.toneMappingExposure = n(this.renderer.toneMappingExposure, t.exposure);
    if (this.snow) { this.snow.material.opacity = n(this.snow.material.opacity, t.snow); this.snow.visible = this.snow.material.opacity > 0.02; }
  }
  applyLook() {
    if (!this.ready) return;
    const painted = this.look === 'painted';
    // матовий акрил (шорсткість 0,78); золото — металік 0,65 / 0,28 через карту (B = метал, G = шорсткість)
    const setFace = (mat, map, metal) => {
      mat.map = map || null;
      mat.metalnessMap = mat.roughnessMap = metal || null;
      mat.metalness = metal ? 0.65 : 0;
      mat.roughness = 0.78;
      mat.needsUpdate = true;
    };
    setFace(this.m.starFront, painted ? this.tex.star : this.photo.front, painted ? this.tex.starM : null);
    setFace(this.m.silFront, painted ? this.tex.vil : this.photo.village, painted ? this.tex.vilM : null);
  }

  /* ---------- ракурси (плавний переліт камери навколо цілі) ---------- */
  /** ракурс «уся композиція»: зірка з підставкою цілком у кадрі за будь-яких пропорцій екрана */
  fitView() {
    const box = (this._box ||= new THREE.Box3().setFromObject(this.product));
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const vf = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    // ширина — між фронтальною й діагональною (при огляді збоку виріб вужчий), щоб зірка була більшою
    const halfW = (size.x + Math.hypot(size.x, size.z)) / 4, halfH = size.y / 2;
    const dist = Math.max(halfH / Math.tan(vf), halfW / Math.tan(hf)) * 1.04 + size.z / 2;
    return { target: ctr.toArray(), dir: [0.2, 0.08, 1], dist };
  }

  /* жести: свайп по самій зірці — крутить її на осі, як вертушку; по фону — камера (OrbitControls) */
  initSpin(el) {
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v = new THREE.Vector3();
    const sp = this.spin;
    this.onSpinDown = (e) => {
      if (e.target !== el || sp.drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      if (!ray.intersectObject(this.star, true).length) return; // фон — віддаємо камері
      e.stopPropagation(); // OrbitControls цей дотик не отримає
      this.star.getWorldPosition(v);
      // дивимось на лице чи на зворот — від цього залежить напрям обертання
      const facing = this.camera.position.z - v.z >= 0 ? 1 : -1;
      const p = v.clone().project(this.camera);
      sp.drag = { id: e.pointerId, cx: rect.left + ((p.x + 1) / 2) * rect.width, cy: rect.top + ((1 - p.y) / 2) * rect.height, x: e.clientX, y: e.clientY, t: performance.now(), facing };
      sp.vel = 0;
      this.dragging = true; this.touched = true; this.tween = null;
      try { el.setPointerCapture(e.pointerId); } catch { /* ні — слухаємо window */ }
    };
    this.onSpinMove = (e) => {
      const d = sp.drag;
      if (!d || e.pointerId !== d.id) return;
      const rx = d.x - d.cx, ry = d.y - d.cy, mx = e.clientX - d.x, my = e.clientY - d.y;
      const r2 = rx * rx + ry * ry;
      // кут повороту навколо центру зірки (екранна y — донизу), біля самого центру — за горизонтальним свайпом
      const da = (r2 < 900 ? -mx / 70 : -(rx * my - ry * mx) / r2) * d.facing;
      this.star.rotation.z += da;
      const now = performance.now(), dt = Math.max(8, now - d.t) / 1000;
      sp.vel = THREE.MathUtils.clamp(sp.vel * 0.5 + (da / dt) * 0.5, -22, 22);
      d.x = e.clientX; d.y = e.clientY; d.t = now;
    };
    this.onSpinUp = (e) => {
      const d = sp.drag;
      if (!d || e.pointerId !== d.id) return;
      if (performance.now() - d.t > 90) sp.vel = 0; // палець зупинився перед тим, як відпустити
      sp.drag = null;
      this.dragging = false;
      this.resumeAt = this.t + 3;
    };
    addEventListener('pointerdown', this.onSpinDown, true);
    addEventListener('pointermove', this.onSpinMove);
    addEventListener('pointerup', this.onSpinUp);
    addEventListener('pointercancel', this.onSpinUp);
  }

  setView(name, instant = false) {
    const v = name === 'fit' && this.product ? this.fitView() : this.views?.[name];
    if (!v) { this.viewName = name; return; }
    this.viewName = name;
    const t1 = new THREE.Vector3(...v.target);
    const s1 = new THREE.Spherical().setFromVector3(new THREE.Vector3(...v.dir).normalize().multiplyScalar(v.dist));
    if (instant) {
      this.controls.target.copy(t1);
      this.camera.position.setFromSpherical(s1).add(t1);
      this.controls.update();
      return;
    }
    const s0 = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    let dth = s1.theta - s0.theta;
    dth = ((((dth + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    this.tween = { t: 0, dur: 1.0, s0, s1: new THREE.Spherical(s1.radius, s1.phi, s0.theta + dth), t0: this.controls.target.clone(), t1 };
    this.resumeAt = this.t + 3.5;
  }
  /** кнопка «Крутити зірку»: поштовх за годинниковою стрілкою, як пальцем по вертушці */
  spinKick(v = -7) {
    if (!this.spin) return;
    this.spin.vel = THREE.MathUtils.clamp(this.spin.vel + v, -22, 22);
    this.touched = true; this.resumeAt = this.t + 3;
  }
  setAuto(on) { this.auto = on; if (on) this.resumeAt = this.t; }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.viewName === 'fit' && this.product && this.controls) {
      // екран змінив пропорції — та сама точка огляду, нова відстань, щоб усе влізло
      const f = this.fitView();
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      if (!dir.lengthSq()) dir.fromArray(f.dir).normalize();
      this.tween = null;
      this.controls.target.fromArray(f.target);
      this.camera.position.copy(this.controls.target).addScaledVector(dir, f.dist);
      this.controls.minDistance = f.dist * 0.5;
      this.controls.maxDistance = f.dist * 1.5;
      this.controls.update();
    }
    // setSize очищає буфер — одразу малюємо кадр, щоб полотно не блимало порожнім
    if (this.scene) this.renderer.render(this.scene, this.camera);
  }

  setActive(on) {
    this.active = on; // повторний виклик безпечний: kick() не запустить другий цикл
    if (on) this.kick();
    else if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  }
  kick() {
    if (!this.clock || this.raf || document.hidden) return;
    this.clock.getDelta();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** повне звільнення пам’яті GPU (геометрії, матеріали, текстури, рендерер) */
  dispose() {
    this.setActive(false);
    document.removeEventListener('visibilitychange', this.onVis);
    removeEventListener('pointerdown', this.onSpinDown, true);
    removeEventListener('pointermove', this.onSpinMove);
    removeEventListener('pointerup', this.onSpinUp);
    removeEventListener('pointercancel', this.onSpinUp);
    this.ro?.disconnect();
    this.controls?.dispose();
    Object.values(this.tex).forEach((t) => t?.dispose());
    this.scene?.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => {
        Object.values(m).forEach((v) => v?.isTexture && v.dispose());
        m.dispose();
      });
    });
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer?.domElement.remove();
    this.ready = false;
  }

  loop() {
    this.raf = 0;
    if (!this.active || document.hidden) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    const tw = this.tween;
    if (tw) {
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const lerp = (a, b) => a + (b - a) * e;
      this.controls.target.lerpVectors(tw.t0, tw.t1, e);
      this.camera.position.setFromSpherical(new THREE.Spherical(lerp(tw.s0.radius, tw.s1.radius), lerp(tw.s0.phi, tw.s1.phi), lerp(tw.s0.theta, tw.s1.theta))).add(this.controls.target);
      if (k >= 1) this.tween = null;
    }
    if (!this.touched && this.auto && !this.tween && !this.dragging) {
      // «О, вона об’ємна!» — легке покачування ±17° туди-назад, поки ніхто не торкнувся
      this.swayT += dt;
      const off = 0.3 * Math.min(1, this.swayT / 1.2) * Math.sin(this.swayT * 1.15);
      this._sv = (this._sv || new THREE.Vector3()).copy(this.camera.position).sub(this.controls.target).applyAxisAngle(UP, off - this.swayOff);
      this.camera.position.copy(this.controls.target).add(this._sv);
      this.swayOff = off;
      this.controls.autoRotate = false;
    } else if (this.auto && this.touched && !this.dragging && !this.tween && this.t > this.resumeAt + 4) {
      // 7 с без дотиків — камера сама повертається до лиця зірки й знову легко погойдується
      this.setView('fit');
      this.touched = false; this.swayT = 0; this.swayOff = 0;
    }
    // зірка-вертушка: після свайпу ще крутиться за інерцією й плавно зупиняється
    const sp = this.spin;
    if (!sp.drag && sp.vel) {
      this.star.rotation.z += sp.vel * dt;
      sp.vel *= Math.exp(-dt * 0.9);
      if (Math.abs(sp.vel) < 0.02) sp.vel = 0;
    }
    // майже зупинилась — м’яко «клацає» в найближче рівне положення (8 променів → крок 45°)
    if (!sp.drag && Math.abs(sp.vel) < 0.8) {
      const z = this.star.rotation.z, snap = Math.round(z / (Math.PI / 4)) * (Math.PI / 4);
      if (Math.abs(snap - z) > 1e-4) this.star.rotation.z += (snap - z) * (1 - Math.exp(-dt * 5));
    }
    this.controls.update(dt);
    this.stepLight(1 - Math.exp(-dt * 3.6)); // ~0,8 с від дня до свічки
    { // живе полум’я: кілька повільних хвиль, без різких спалахів
      const t = this.t, f = this.light === 'candle' ? 1 + 0.07 * Math.sin(t * 6.3) + 0.045 * Math.sin(t * 11.7 + 1.3) + 0.03 * Math.sin(t * 2.1) : 1;
      this.L.candle.intensity = (this.flameBase || 0) * f;
    }
    // сніг
    const p = this.snow.visible ? this.snow.geometry.attributes.position : null;
    if (p) {
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * (0.9 + (i % 5) * 0.25);
      if (y < 0) y += 26;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(this.t * 0.6 + i) * dt * 0.25);
    }
    p.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  }
}
