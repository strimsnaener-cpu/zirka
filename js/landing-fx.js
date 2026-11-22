/* Ефекти майстерні: живий «різьблений» вихор на фоні (Canvas 2D, реагує на палець і курсор),
   3D-барабан узорів з інерцією, м’які скрол-ефекти. Без важких бібліотек — плавно і на телефоні. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

/* ---------- 1. Різьблений різдвяний вихор ---------- */
export function initCarvedBg(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // світлові «іскри»-спрайти, намальовані один раз
  const sprite = (inner, mid, size = 64) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, inner); gr.addColorStop(0.22, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  };
  const GOLD = sprite('rgba(255,240,205,1)', 'rgba(230,184,92,.55)');
  const CREAM = sprite('rgba(255,250,242,1)', 'rgba(245,239,230,.35)');
  const EMBER = sprite('rgba(255,215,170,1)', 'rgba(190,70,50,.45)');
  const HALO = sprite('rgba(230,184,92,.32)', 'rgba(230,184,92,.1)', 256);

  // «різьблені» контури: розетки з 8 променями (як у восьмикутної зірки й сніжинки)
  const shapes = [
    (a) => 0.78 + 0.22 * Math.cos(8 * a), // м’яка восьмикутна зірка
    (a) => 0.55 + 0.45 * Math.pow(Math.abs(Math.cos(4 * a)), 0.6), // пелюстки
    (a) => 0.86 + 0.08 * Math.cos(16 * a) + 0.06 * Math.cos(8 * a), // мереживо по краю
    (a) => 0.62 + 0.38 * Math.pow(Math.abs(Math.sin(4 * a + Math.PI / 8)), 1.4), // гострі промені
  ];
  const rings = [
    { k: 0.2, shape: 1, dir: 1, sp: 0.09, a: 0.16 },
    { k: 0.36, shape: 3, dir: -1, sp: 0.06, a: 0.12 },
    { k: 0.54, shape: 0, dir: 1, sp: 0.045, a: 0.11 },
    { k: 0.74, shape: 2, dir: -1, sp: 0.03, a: 0.06 },
    { k: 0.98, shape: 0, dir: 1, sp: 0.02, a: 0.04 },
  ];
  const N = 192;
  const pathOf = (fn, twist) => {
    const p = new Path2D();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const r = fn(a);
      const aa = a + twist * (1 - r); // закрутка до центру — ефект воронки
      i ? p.lineTo(Math.cos(aa) * r, Math.sin(aa) * r) : p.moveTo(Math.cos(aa) * r, Math.sin(aa) * r);
    }
    return p;
  };
  const paths = rings.map((r, i) => pathOf(shapes[r.shape], i % 2 ? -0.22 : 0.22));
  // спиці-«різьба»: 16 тонких дуг від центру назовні
  const spokes = new Path2D();
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * TAU;
    for (let j = 0; j <= 40; j++) {
      const t = j / 40, r = 0.08 + t * 0.92, a = a0 + Math.sin(t * Math.PI) * 0.35 * (i % 2 ? 1 : -1) + t * 0.6;
      j ? spokes.lineTo(Math.cos(a) * r, Math.sin(a) * r) : spokes.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }

  let w = 0, h = 0, dpr = 1, R = 300, parts = [];
  const cx = { x: 0, y: 0 }; // центр вихору (м’яко тягнеться до пальця)
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, on: 0, energy: 0, last: 0 };
  const bursts = [];

  const make = (fresh) => {
    const k = Math.random();
    return {
      a: Math.random() * TAU,
      r: fresh ? 0.9 + Math.random() * 0.25 : 0.05 + Math.random() * 1.1,
      v: 0.025 + Math.random() * 0.05, // швидкість затягування у воронку
      sp: (0.12 + Math.random() * 0.2) * (Math.random() < 0.82 ? 1 : -1),
      s: 1.6 + Math.random() * 3.6,
      img: k < 0.55 ? GOLD : k < 0.9 ? CREAM : EMBER,
      tw: 1 + Math.random() * 3, ph: Math.random() * TAU,
      ox: 0, oy: 0,
    };
  };
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.max(w, h) * 0.62;
    const n = Math.round(clamp((w * h) / 4200, 110, 240));
    parts = Array.from({ length: n }, () => make(false));
    if (!cx.x) { cx.x = w / 2; cx.y = h * 0.42; ptr.sx = cx.x; ptr.sy = cx.y; }
  }
  resize();
  addEventListener('resize', resize);

  // палець і курсор: пасивні слухачі, скрол і барабан не блокуються
  const move = (x, y) => {
    const now = performance.now();
    const d = Math.hypot(x - ptr.x, y - ptr.y);
    ptr.energy = Math.min(1.6, ptr.energy + d / 260);
    ptr.x = x; ptr.y = y; ptr.on = 1; ptr.last = now;
    if (!ptr.sx) { ptr.sx = x; ptr.sy = y; }
    loop();
  };
  const burst = (x, y) => {
    bursts.push({ x, y, t: 0, rot: Math.random() * TAU });
    if (bursts.length > 6) bursts.shift();
    ptr.energy = Math.min(1.6, ptr.energy + 0.6);
  };
  addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', (e) => { move(e.clientX, e.clientY); burst(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchend', () => { ptr.on = 0; }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.on = 0; });

  let t = 0, rot = 0, lastScroll = scrollY;
  function draw(dt) {
    t += dt;
    const ds = scrollY - lastScroll; lastScroll = scrollY;
    rot += dt * 0.12 + clamp(ds, -80, 80) * 0.0016; // прокрутка «підкручує» вихор
    if (performance.now() - ptr.last > 1800) ptr.on = 0;
    ptr.energy *= Math.pow(0.35, dt);
    const en = ptr.energy;

    // центр: базова точка + легкий нахил до пальця
    const bx = w / 2, by = h * 0.42;
    const tx = ptr.on ? bx + (ptr.x - bx) * 0.22 : bx, ty = ptr.on ? by + (ptr.y - by) * 0.22 : by;
    cx.x += (tx - cx.x) * Math.min(1, dt * 2.2); cx.y += (ty - cx.y) * Math.min(1, dt * 2.2);
    ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 7); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 7);

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // м’яке сяйво в центрі вихору і під пальцем
    const breathe = 1 + 0.04 * Math.sin(t * 0.9);
    const hs = R * 1.1 * breathe;
    ctx.globalAlpha = 0.55 + en * 0.15;
    ctx.drawImage(HALO, cx.x - hs / 2, cx.y - hs / 2, hs, hs);
    if (ptr.on) { const ps = 220 + en * 140; ctx.globalAlpha = 0.25 + en * 0.3; ctx.drawImage(HALO, ptr.sx - ps / 2, ptr.sy - ps / 2, ps, ps); }

    // різьблені контури
    ctx.save();
    ctx.translate(cx.x, cx.y);
    ctx.lineJoin = 'round';
    for (let i = 0; i < rings.length; i++) {
      const rg = rings[i];
      const s = R * rg.k * breathe * (1 + 0.02 * Math.sin(t * 1.3 + i));
      ctx.save();
      ctx.rotate(rot * rg.dir * (rg.sp / 0.05) + i * 0.2);
      ctx.scale(s, s * 0.94);
      ctx.lineWidth = 1.2 / s;
      const shimmer = 0.5 + 0.5 * Math.sin(t * 1.1 - i * 0.9);
      ctx.globalAlpha = rg.a * (0.7 + 0.6 * shimmer) * (1 + en * 0.8);
      ctx.strokeStyle = i % 2 ? '#f5efe6' : '#e6b85c';
      ctx.stroke(paths[i]);
      ctx.restore();
    }
    ctx.save();
    ctx.rotate(-rot * 0.6);
    ctx.scale(R * 0.9, R * 0.9 * 0.94);
    ctx.lineWidth = 1 / (R * 0.9);
    ctx.globalAlpha = 0.05 + en * 0.05;
    ctx.strokeStyle = '#e6b85c';
    ctx.stroke(spokes);
    ctx.restore();
    ctx.restore();

    // частинки, що затягує у воронку
    const reach = 150 + en * 70;
    for (const p of parts) {
      p.r -= p.v * dt * (0.6 + p.r);
      p.a += p.sp * dt * (0.6 + 1.6 * (1 - Math.min(1, p.r)));
      if (p.r < 0.035) Object.assign(p, make(true));
      const star = 0.8 + 0.2 * Math.cos(8 * (p.a - rot * 0.5)); // траєкторії складаються у восьмикутну зірку
      const rr = p.r * R * star;
      let x = cx.x + Math.cos(p.a + rot * 0.3) * rr;
      let y = cx.y + Math.sin(p.a + rot * 0.3) * rr * 0.94;
      // тягнуться за пальцем
      let tox = 0, toy = 0, glow = 0;
      if (ptr.on) {
        const dx = ptr.sx - x, dy = ptr.sy - y, d = Math.hypot(dx, dy);
        if (d < reach) {
          const f = 1 - d / reach;
          glow = f;
          tox = dx * f * 0.45 - dy * f * 0.25; // притягування + легке закручування навколо пальця
          toy = dy * f * 0.45 + dx * f * 0.25;
        }
      }
      p.ox += (tox - p.ox) * Math.min(1, dt * 5);
      p.oy += (toy - p.oy) * Math.min(1, dt * 5);
      x += p.ox; y += p.oy;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      const fade = Math.min(1, p.r * 6) * Math.min(1, (1.25 - p.r) * 4);
      const tw = 0.55 + 0.45 * Math.sin(t * p.tw + p.ph);
      ctx.globalAlpha = clamp((0.28 + 0.5 * tw + glow * 0.8) * fade, 0, 1);
      const s = p.s * (1 + glow * 1.2);
      ctx.drawImage(p.img, x - s * 2, y - s * 2, s * 4, s * 4);
    }

    // кільця-сніжинки від дотику
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      const k = b.t / 1.3;
      if (k >= 1) { bursts.splice(i, 1); continue; }
      const s = 20 + 170 * (1 - Math.pow(1 - k, 3));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot + k * 0.8);
      ctx.scale(s, s);
      ctx.lineWidth = 1.5 / s;
      ctx.globalAlpha = 0.55 * (1 - k);
      ctx.strokeStyle = '#ffe2a6';
      ctx.stroke(paths[0]);
      ctx.globalAlpha = 0.35 * (1 - k);
      ctx.scale(0.55, 0.55);
      ctx.lineWidth = 1.5 / (s * 0.55);
      ctx.stroke(paths[1]);
      ctx.restore();
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
