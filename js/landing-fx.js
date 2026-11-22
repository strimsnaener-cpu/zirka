/* Ефекти майстерні: делікатний 3D-фон (теплі пилинки-боке й тонкі контури зірок у глибині, туман),
   3D-барабан узорів з інерцією, м’які скрол-ефекти. Без важких бібліотек — плавно і на телефоні. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

/* ---------- 1. Ambient 3D: «є, але не заважає» ---------- */
export function initAmbientBg(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // м’які спрайти, намальовані один раз
  const sprite = (stops, size) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  };
  // боке: майже рівний диск із розмитим краєм; пилинка: маленька тепла крапка
  const BOKEH = sprite([[0, 'rgba(255,226,170,.9)'], [0.55, 'rgba(240,196,120,.75)'], [0.78, 'rgba(230,184,92,.25)'], [1, 'rgba(230,184,92,0)']], 96);
  const DUST = sprite([[0, 'rgba(255,244,220,1)'], [0.25, 'rgba(240,200,130,.5)'], [1, 'rgba(230,184,92,0)']], 32);

  // контур восьмикутної зірки (вершини в площині XY, радіус 1)
  const STAR = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - Math.PI / 2, r = i % 2 ? 0.52 : 1; STAR.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const RING = [];
  for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; RING.push([Math.cos(a) * 0.36, Math.sin(a) * 0.36]); }

  const FOG = 0.2; // щільність туману (як FogExp2)
  const Z0 = 1.2, Z1 = 10;
  let w = 0, h = 0, dpr = 1, f = 500, motes = [];
  const shapes = [
    { x: -1.5, y: -0.6, z: 6.5, s: 1.5, rx: 0.4, ry: 0.2, vr: 0.035, a: 0.2 },
    { x: 1.7, y: 0.5, z: 8.5, s: 2.1, rx: -0.3, ry: 0.6, vr: -0.025, a: 0.16 },
    { x: 0.2, y: 1.4, z: 9.5, s: 1.2, rx: 0.9, ry: -0.4, vr: 0.03, a: 0.14 },
  ];

  const make = (far) => {
    const bokeh = Math.random() < 0.3;
    return {
      x: (Math.random() * 2 - 1) * 2.6, y: (Math.random() * 2 - 1) * 2, z: far ? Z1 - Math.random() * 1.5 : Z0 + Math.random() * (Z1 - Z0),
      s: bokeh ? 0.05 + Math.random() * 0.06 : 0.012 + Math.random() * 0.016, bokeh,
      vx: (Math.random() - 0.5) * 0.02, vy: -0.015 - Math.random() * 0.025, ph: Math.random() * TAU, tw: 0.25 + Math.random() * 0.4,
    };
  };
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    f = Math.max(w, h) * 0.55;
    const n = Math.round(clamp((w * h) / 16000, 30, 80));
    motes = Array.from({ length: n }, () => make(false));
  }
  resize();
  addEventListener('resize', resize);

  // делікатний паралакс: камера ледь нахиляється за пальцем / курсором
  const aim = { x: 0, y: 0 }, cam = { x: 0, y: 0 };
  const point = (x, y) => { aim.x = (x / w - 0.5) * 0.5; aim.y = (y / h - 0.5) * 0.35; };
  addEventListener('pointermove', (e) => point(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });

  const fogA = (z) => Math.exp(-(FOG * z) * (FOG * z));
  let t = 0;
  function draw(dt) {
    t += dt;
    cam.x += (aim.x + Math.sin(t * 0.05) * 0.08 - cam.x) * Math.min(1, dt * 0.9);
    cam.y += (aim.y + Math.cos(t * 0.04) * 0.05 - cam.y) * Math.min(1, dt * 0.9);
    const sy = scrollY * 0.0009; // при прокрутці глибина повільно «пропливає»
    const cx = w / 2, cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // тонкі 3D-контури в глибині
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    for (const sh of shapes) {
      const rz = t * sh.vr, rx = sh.rx + Math.sin(t * 0.06) * 0.15, ry = sh.ry + t * sh.vr * 0.7;
      const cz = Math.cos(rz), sz = Math.sin(rz), cxr = Math.cos(rx), sxr = Math.sin(rx), cyr = Math.cos(ry), syr = Math.sin(ry);
      const proj = (px, py) => {
        let x = px * sh.s, y = py * sh.s, z = 0;
        [x, y] = [x * cz - y * sz, x * sz + y * cz];
        [y, z] = [y * cxr - z * sxr, y * sxr + z * cxr];
        [x, z] = [x * cyr + z * syr, -x * syr + z * cyr];
        const Z = sh.z + z, k = f / Z;
        return [cx + (sh.x + x - cam.x * Z * 0.12) * k, cy + (sh.y + y - sy * 0.4 - cam.y * Z * 0.12) * k];
      };
      ctx.globalAlpha = sh.a * fogA(sh.z) * (0.75 + 0.25 * Math.sin(t * 0.3 + sh.z));
      ctx.strokeStyle = '#e6b85c';
      for (const pts of [STAR, RING]) {
        ctx.beginPath();
        pts.forEach(([px, py], i) => { const [X, Y] = proj(px, py); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.closePath();
        ctx.stroke();
      }
    }

    // пилинки й боке
    for (const p of motes) {
      p.x += (p.vx + Math.sin(t * 0.2 + p.ph) * 0.01) * dt;
      p.y += p.vy * dt;
      p.z -= 0.04 * dt; // дуже повільно пливуть до глядача
      if (p.z < Z0 || p.y < -2.4) Object.assign(p, make(p.z < Z0));
      let wy = ((p.y - sy - cam.y * p.z * 0.12 + 2.2) % 4.4 + 4.4) % 4.4 - 2.2;
      const k = f / p.z;
      const X = cx + (p.x - cam.x * p.z * 0.12) * k, Y = cy + wy * k;
      const r = Math.max(1.2, p.s * k);
      if (X < -r || X > w + r || Y < -r || Y > h + r) continue;
      const near = clamp((3 - p.z) / 1.8, 0, 1); // ближні — більші, розмитіші й прозоріші
      const a = (p.bokeh ? 0.22 : 0.3) * fogA(p.z) * (1 - near * 0.6) * (0.65 + 0.35 * Math.sin(t * p.tw + p.ph));
      if (a < 0.01) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(p.bokeh ? BOKEH : DUST, X - r, Y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  let last = performance.now(), raf = 0;
  function frame(now) {
    raf = 0;
    draw(Math.min(0.05, (now - last) / 1000)); last = now;
    loop();
  }
  function loop() {
    if (raf || reduced || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); loop(); });
  if (reduced) draw(0.016);
  loop();
  return {};
}

/* ---------- 2. 3D-барабан ---------- */
export function initDrum(drum, ring, { render, onActive, onOpen }) {
  const STEP = 27; // градусів між картками
  let items = [], cards = [], n = 0, pos = 0, vel = 0, target = 0, raf = 0, drag = null, lastActive = -1;
  const R = () => (drum.clientWidth < 700 ? 560 : 720);
  const wrap = (d) => (n ? ((((d + n / 2) % n) + n) % n) - n / 2 : 0);
  const activeIdx = () => (n ? ((Math.round(pos) % n) + n) % n : 0);

  function layout() {
    const r = R();
    cards.forEach((el, i) => {
      const d = wrap(i - pos), a = Math.abs(d), th = d * STEP;
      if (Math.abs(th) > 105) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = '';
      const rad = th * Math.PI / 180;
      el.style.transform = `translate3d(${(Math.sin(rad) * r).toFixed(1)}px,0,${(Math.cos(rad) * r - r).toFixed(1)}px) rotateY(${th.toFixed(2)}deg)`;
      el.style.opacity = String(clamp(1 - a * 0.2, 0.12, 1));
      el.style.filter = a < 0.35 ? 'none' : `brightness(${clamp(1 - a * 0.25, 0.35, 1).toFixed(2)}) blur(${Math.min(a * 1.1, 3.2).toFixed(1)}px)`;
      el.style.zIndex = String(100 - Math.round(a * 10));
    });
    const ai = activeIdx();
    if (ai !== lastActive) {
      lastActive = ai;
      cards.forEach((el, i) => el.classList.toggle('is-active', i === ai));
      if (items[ai]) onActive(items[ai], ai, n);
    }
  }
  function tick() {
    raf = 0;
    if (!drag) {
      if (Math.abs(vel) > 0.004) { pos += vel; vel *= 0.93; target = Math.round(pos + vel * 8); }
      else { vel = 0; pos += (target - pos) * 0.14; if (Math.abs(target - pos) < 0.001) pos = target; }
    }
    layout();
    if (drag || vel || pos !== target) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function to(i) { // повернути картку i у центр найкоротшим шляхом
    vel = 0; target = pos + wrap(i - pos); kick();
  }
  const go = (delta) => { vel = 0; target = Math.round(target) + delta; kick(); };

  drum.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag = { x: e.clientX, t: performance.now(), moved: 0, card: e.target.closest('.dc'), id: e.pointerId, cap: false };
    vel = 0;
    drum.classList.add('is-drag');
    kick();
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, now = performance.now();
    drag.moved += Math.abs(dx);
    if (drag.moved > 6 && !drag.cap) { try { drum.setPointerCapture(drag.id); } catch {} drag.cap = true; }
    const per = drum.clientWidth < 700 ? 170 : 240;
    const dp = -dx / per;
    pos += dp;
    vel = dp / Math.max(1, now - drag.t) * 16;
    drag.x = e.clientX; drag.t = now;
  });
  const end = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { moved, card } = drag;
    drag = null;
    drum.classList.remove('is-drag');
    if (moved < 6 && card && e?.type === 'pointerup') {
      const i = cards.indexOf(card);
      if (i === activeIdx() && Math.abs(wrap(i - pos)) < 0.3) onOpen(items[i]);
      else to(i);
      return;
    }
    vel = clamp(vel, -0.6, 0.6);
    target = Math.round(pos + vel * 8);
    kick();
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  drum.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    pos += e.deltaX / 320; vel = 0; target = Math.round(pos); kick();
  }, { passive: false });
  drum.tabIndex = 0;
  drum.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    if (e.key === 'Enter' && items[activeIdx()]) onOpen(items[activeIdx()]);
  });
  addEventListener('resize', () => layout());

  function setItems(list, start = 0) {
    items = list; n = list.length;
    ring.innerHTML = list.map(render).join('');
    cards = [...ring.children];
    pos = target = start; vel = 0; lastActive = -1;
    layout();
  }
  return { setItems, go, to, get active() { return items[activeIdx()]; } };
}

/* ---------- 3. Скрол-ефекти ---------- */
export function initScrollFx({ isActive = () => true } = {}) {
  const ghosts = [...document.querySelectorAll('[data-ghost]')];

  // плавна поява блоків
  const rv = document.querySelectorAll('.sec .tag, .sec .h-xl, .sec-lead, .try > *, .how-c, .kit, .gallery, .faq details');
  rv.forEach((el) => el.classList.add('rv'));
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px' });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('is-in'));

  let raf = 0;
  function update() {
    raf = 0;
    if (!isActive()) return;
    const H = innerHeight;
    for (const gh of ghosts) {
      const r = gh.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > H + 200) continue;
      const t = (r.top + r.height / 2 - H / 2) / H;
      gh.style.transform = `translate3d(${(t * 18 - 4).toFixed(2)}vw,0,0)`;
    }
  }
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
  return { update: req };
}
