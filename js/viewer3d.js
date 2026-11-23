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
import { starOnly, villageOnly, VILLAGE_H, COMP } from './compose.js';
import { DESIGN } from './ornaments.js';
import { VILLAGE } from './village.js';
import { traceAlpha, rasterize } from './trace.js';
const UP = new THREE.Vector3(0, 1, 0);
// денне студійне світло (світле ательє)
const DAY = { sky: 0xfff6ea, ground: 0xd8c2a2, hemi: 1.15, key: 0xfff1dc, keyI: 2.3, rim: 0xffe6c8, rimI: 0.7, exposure: 1.0 };

/* ---------- розміри ---------- */
const HALF = STAR.sizeCm / 2;
const K = HALF / STAR.R; // см на одиницю SVG зірки
const T = STAR.thicknessCm;
const CH = Math.min(STAR.chamferCm, T * 0.3);
const KV = STAR.sizeCm / (2 * STAR.R * COMP.star.s); // см на одиницю макета села (як у майстерні)
const VW = 220, VS = 4; // макет села: 220 × VILLAGE_H од., растр 4 px/од.

const FOOT = STAND.foot;
const FOOT_TOP = FOOT.thicknessCm;
const SIL_T = STAND.thicknessCm;
const SIL_CH = Math.min(0.025, SIL_T * 0.2);
const SIL_Z = -FOOT.depthCm / 2 + 1.3;
const SIL_BOTTOM = FOOT_TOP - STAND.groove.depthCm;
const STK = STAND.stick;
const STICK_Z = SIL_Z + SIL_T / 2 + STK.frontOffsetCm + STK.thicknessCm / 2;
const STAR_Z = STICK_Z + STK.thicknessCm / 2 + T / 2 + 0.01;

/* «технічні» кольори для карти металу: B = металевість, G = шорсткість */
const METAL = '#0073D9', PLAIN = '#00FF00';
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
  g.fillStyle = '#e2c08b'; g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const y = rnd() * size;
    g.strokeStyle = `rgba(${150 + rnd() * 40},${100 + rnd() * 30},50,${0.05 + rnd() * 0.1})`;
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
  return svg.replace('<svg ', `<svg style="fill:${PLAIN}" `).replace(/(fill|stroke)="(?!none|#0073D9)[^"]*"/g, `$1="${PLAIN}"`);
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
  const W = VW * KV, H = VILLAGE_H * KV;
  return { pts: px.map(([x, y]) => [(x / VS - VW / 2) * KV, (VILLAGE_H - y / VS) * KV]), W, H, fromPhoto: false };
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
    this.viewName = 'front';
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
    key.position.set(8, 20, 22);
    key.castShadow = !LOW;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -16, right: 16, top: 30, bottom: -4, near: 1, far: 70 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    let rim = null;
    if (!LOW) { rim = new THREE.DirectionalLight(DAY.rim, DAY.rimI); rim.position.set(-12, 14, -14); scene.add(rim); }
    const candle = new THREE.PointLight(0xffa860, 60, 40, 2); candle.position.set(0, 7, 10); scene.add(candle);
    this.L = { hemi, key, rim, candle };

    // підставка «стоїть на столі»: м’яка контактна тінь завжди + справжня тінь від ключового світла (крім слабких GPU)
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshBasicMaterial({ map: blobShadowTex(), transparent: true, depthWrite: false, opacity: LOW ? 1 : 0.7 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);
    if (!LOW) {
      const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.ShadowMaterial({ opacity: 0.22, color: 0x4a3020 }));
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

    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.7, ...o });
    this.m = {
      starFront: std({ map: faceUnit, roughness: 0.62 }),
      starBack: std({ map: pb || faceUnit }),
      edge: std({ map: edgeTex, roughness: 0.85 }),
      ply: std({ map: faceCm, roughness: 0.75 }),
      silFront: std({ roughness: 0.6 }),
      dark: std({ color: 0x2b1d12, roughness: 1 }),
    };

    const product = (this.product = new THREE.Group());
    scene.add(product);

    /* ----- підставка: платформа з пазами ----- */
    const fc = 0.08;
    const footGeo = new THREE.ExtrudeGeometry(roundedRect(FOOT.widthCm, FOOT.depthCm, 0.35), {
      depth: FOOT.thicknessCm - 2 * fc, steps: 1, curveSegments: 6,
      bevelEnabled: true, bevelThickness: fc, bevelSize: fc, bevelOffset: -fc, bevelSegments: 2,
    });
    footGeo.rotateX(-Math.PI / 2);
    footGeo.translate(0, fc, 0);
    const foot = new THREE.Mesh(footGeo, [this.m.ply, this.m.edge]);
    foot.castShadow = foot.receiveShadow = true;
    product.add(foot);

    /* ----- силует села ----- */
    let sil = pv ? await traceVillagePhoto(pv) : null;
    if (!sil) sil = await traceVillageSvg();
    this.sil = sil;
    const xs = sil.pts.map((p) => p[0]), ys = sil.pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys);
    const silGeo = plate(shapeFrom(sil.pts), SIL_T, SIL_CH, (x, y, front) => {
      const u = x / sil.W + 0.5, v = y / sil.H;
      return front ? [u, v] : [x, y]; // зворот — просто дерево в см
    });
    const silMesh = (this.silMesh = new THREE.Mesh(silGeo, [this.m.silFront, this.m.edge, this.m.ply]));
    silMesh.position.set(0, SIL_BOTTOM - minY, SIL_Z);
    silMesh.castShadow = silMesh.receiveShadow = true;
    product.add(silMesh);
    // паз під силует і паз під паличку (темні щілини у платформі)
    const groove = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 0.12, SIL_T + 0.05), this.m.dark);
    groove.rotation.x = -Math.PI / 2;
    groove.position.set((minX + maxX) / 2, FOOT_TOP + 0.004, SIL_Z);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(STK.widthCm + 0.08, STK.thicknessCm + 0.05), this.m.dark);
    slot.rotation.x = -Math.PI / 2;
    slot.position.set(0, FOOT_TOP + 0.004, STICK_Z);
    product.add(groove, slot);

    /* ----- зірка на паличці ----- */
    const starY = (this.starY = STAND.starCenterCm != null
      ? FOOT_TOP + STAND.starCenterCm
      : SIL_BOTTOM + (VILLAGE_H + (COMP.village.y - COMP.star.y)) * KV);
    const starGeo = plate(starShape(), T, CH, (x, y, front) => [((front ? x : -x) / HALF + 1) / 2, (y / HALF + 1) / 2]);
    const star = (this.star = new THREE.Mesh(starGeo, [this.m.starFront, this.m.edge, this.m.starBack]));
    star.position.set(0, starY, STAR_Z);
    star.castShadow = star.receiveShadow = true;
    product.add(star);

    const stickBottom = FOOT_TOP - STK.slotDepthCm, stickTop = starY + 1.2;
    const stick = new THREE.Mesh(new THREE.BoxGeometry(STK.widthCm, stickTop - stickBottom, STK.thicknessCm), [this.m.edge, this.m.edge, this.m.ply, this.m.ply, this.m.ply, this.m.ply]);
    stick.position.set(0, (stickTop + stickBottom) / 2, STICK_Z);
    stick.castShadow = true;
    product.add(stick);

    /* ----- «Заготовка» села без фото: чистий силует з легкими тінями рельєфу ----- */
    if (!pv) {
      const kit = await rasterize(villageOnly({}, { idp: 'vk', bare: true, layers: new Set() }), VW * VS, VILLAGE_H * VS, VILLAGE.bare.fill);
      this.kitVillage = canvasTex(kit);
      this.kitVillage.anisotropy = aniso;
    } else this.kitVillage = pv;

    /* ----- сніжинки ----- */
    const N = LOW ? 60 : 170, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 42; pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.42, map: dotTex(), transparent: true, depthWrite: false, opacity: 0.55, color: 0xfff1dc }));
    this.snow.visible = this.light === 'candle';
    scene.add(this.snow);

    /* ----- керування: вільне обертання 360° ----- */
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    Object.assign(c, {
      enableDamping: true, dampingFactor: 0.08, enablePan: false,
      minDistance: 14, maxDistance: 95, rotateSpeed: 0.85, zoomSpeed: 0.8,
      autoRotate: true, autoRotateSpeed: 1.6, minPolarAngle: 0.05, maxPolarAngle: Math.PI * 0.92,
    });
    c.addEventListener('start', () => { this.dragging = true; this.tween = null; this.touched = true; });
    // телефон: вертикальний свайп по зірці гортає сторінку, горизонтальний — крутить зірку
    // (OrbitControls сам ставить touch-action:none — перевизначаємо після створення)
    if (MOBILE) r.domElement.style.touchAction = 'pan-y';
    c.addEventListener('end', () => { this.dragging = false; this.resumeAt = this.t + 3; });

    this.views = {
      front: { target: [0, starY, STAR_Z], dir: [0, 0.04, 1], dist: 44 },
      side: { target: [0, starY, STAR_Z], dir: [0.95, 0.14, 0.32], dist: 37 },
      stand: { target: [0, starY * 0.56, 0], dir: [0.36, 0.3, 1], dist: 62 },
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
      rasterize(starOnly(state.star.designId, sc, { idp: 'tx', bare: true, layers: starLayers }), TEX, TEX, '#E2C08B'),
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

  /* ---------- освітлення: «день» або «світло свічки» (теплий вогник знизу з живим мерехтінням) ---------- */
  setLight(mode) {
    this.light = mode;
    const L = this.L;
    if (!L) return;
    const candle = mode === 'candle';
    L.hemi.color.set(candle ? 0xffb07a : DAY.sky); L.hemi.groundColor.set(candle ? 0x2a1208 : DAY.ground);
    L.hemi.intensity = candle ? 0.22 : DAY.hemi;
    L.key.color.set(candle ? 0xffb27a : DAY.key); L.key.intensity = candle ? 0.35 : DAY.keyI;
    if (L.rim) { L.rim.color.set(candle ? 0xff7a30 : DAY.rim); L.rim.intensity = candle ? 0.5 : DAY.rimI; }
    if (this.snow) this.snow.visible = candle; // сніжок — лише ввечері, на темному
    L.candle.color.set(candle ? 0xff9a42 : 0xffa860);
    L.candle.distance = candle ? 70 : 40;
    if (candle) L.candle.position.set(0, this.starY - 11, STAR_Z + 9);
    else { L.candle.position.set(0, 7, 10); L.candle.intensity = 60; }
    this.renderer.toneMappingExposure = candle ? 1.18 : DAY.exposure;
  }
  applyLook() {
    if (!this.ready) return;
    const painted = this.look === 'painted';
    const setFace = (mat, map, metal) => {
      mat.map = map;
      mat.metalnessMap = mat.roughnessMap = metal || null;
      mat.metalness = metal ? 1 : 0;
      mat.roughness = metal ? 0.62 : painted ? 0.58 : 0.7;
      mat.needsUpdate = true;
    };
    setFace(this.m.starFront, painted ? this.tex.star || this.faceUnit : this.photo.front || this.faceUnit, painted ? this.tex.starM : null);
    setFace(this.m.silFront, painted ? this.tex.vil || this.kitVillage : this.kitVillage, painted ? this.tex.vilM : null);
  }

  /* ---------- ракурси (плавний переліт камери навколо цілі) ---------- */
  setView(name, instant = false) {
    const v = this.views?.[name];
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
  setAuto(on) { this.auto = on; if (on) this.resumeAt = this.t; }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    } else this.controls.autoRotate = this.auto && !this.dragging && !this.tween && this.t > this.resumeAt;
    this.controls.update(dt);
    if (this.light === 'candle') { // живе полум’я: кілька повільних хвиль, без різких спалахів
      const t = this.t;
      this.L.candle.intensity = 260 * (1 + 0.07 * Math.sin(t * 6.3) + 0.045 * Math.sin(t * 11.7 + 1.3) + 0.03 * Math.sin(t * 2.1));
    }
    // сніг
    const p = this.snow.visible ? this.snow.geometry.attributes.position : null;
    if (p) {
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * (0.9 + (i % 5) * 0.25);
      if (y < 0) y += 42;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(this.t * 0.6 + i) * dt * 0.25);
    }
    p.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  }
}
