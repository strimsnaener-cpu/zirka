/* Фон «Зоряний пил»: невагомий спіральний 3D-вихор із теплих золотих і кремових іскор.
   Один THREE.Points-буфер (≈150 частинок на телефоні, 250 на ПК), один draw call, адитивне змішування.
   Сам повільно крутиться; за пальцем / мишкою потік м’яко тягнеться й закручується.
   Three.js підвантажується, коли сторінка вже відкрилася (його потім бере й 3D-зірка — з кешу). */

const MOBILE = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function initVortexBg(canvas) {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power', premultipliedAlpha: true });
  renderer.setPixelRatio(MOBILE ? 1 : Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // м’яка кругла «іскра»
  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.7)');
    gr.addColorStop(0.55, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const N = MOBILE ? 150 : 250;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.PointsMaterial({
    size: MOBILE ? 0.34 : 0.24, map: dot, vertexColors: true, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geo, mat));

  // золото #E6B85C і крем #F5EFE6
  const GOLD = [0.9, 0.72, 0.36], CREAM = [0.96, 0.94, 0.9];
  const ARMS = 3;
  const P = Array.from({ length: N }, () => spawn({}, Math.random()));
  function spawn(p, r = 1) {
    p.arm = Math.floor(Math.random() * ARMS);
    p.j = (Math.random() - 0.5) * 0.55; // розкид навколо рукава
    p.r = r;
    p.v = 0.018 + Math.random() * 0.03; // повільне затягування до центру
    p.h = (Math.random() - 0.5) * 0.5; // товщина диска
    p.tw = 0.6 + Math.random() * 1.6; p.ph = Math.random() * 6.28;
    p.c = Math.random() < 0.6 ? GOLD : CREAM;
    p.ox = p.oy = 0;
    return p;
  }

  let w = 1, h = 1, R = 5, halfW = 3, halfH = 5;
  function resize() {
    if (!innerWidth || !innerHeight) return; // згорнуте/0×0 вікно — не рахуємо NaN
    w = innerWidth; h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    halfH = Math.tan((camera.fov / 2) * Math.PI / 180) * camera.position.z;
    halfW = halfH * camera.aspect;
    R = Math.max(halfW, halfH) * (MOBILE ? 1.05 : 0.95);
  }
  resize();
  // адресний рядок iOS змінює лише висоту — не перестворюємо буфер (CSS просто розтягує полотно)
  let lastW = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 2) { lastW = innerWidth; resize(); } });

  // палець / мишка → точка у світі вихору (площина z = 0)
  const ptr = { x: 0, y: 0, on: false, e: 0, last: 0 };
  const move = (cx, cy) => {
    const x = (cx / w * 2 - 1) * halfW, y = -(cy / h * 2 - 1) * halfH;
    if (ptr.on) ptr.e = Math.min(1.5, ptr.e + Math.hypot(x - ptr.x, y - ptr.y) * 0.35);
    ptr.x = x; ptr.y = y; ptr.on = true; ptr.last = performance.now();
  };
  addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') ptr.on = false; }, { passive: true });

  const TILT = 1.02, ct = Math.cos(TILT), st = Math.sin(TILT);
  const cen = { x: 0, y: 0.35 * halfH };
  let rot = 0, t = 0, lastScroll = scrollY;

  function step(dt) {
    t += dt;
    if (performance.now() - ptr.last > 1500) ptr.on = false;
    ptr.e *= Math.pow(0.4, dt);
    const ds = scrollY - lastScroll; lastScroll = scrollY;
    rot += dt * (0.12 + ptr.e * 0.25) + Math.max(-60, Math.min(60, ds)) * 0.0012;
    // центр вихору ледь тягнеться до пальця
    const tx = ptr.on ? ptr.x * 0.18 : 0, ty = (ptr.on ? ptr.y * 0.12 : 0) + 0.3 * halfH;
    cen.x += (tx - cen.x) * Math.min(1, dt * 1.5); cen.y += (ty - cen.y) * Math.min(1, dt * 1.5);
    const reach = Math.max(1.6, halfW * 0.7);

    for (let i = 0; i < N; i++) {
      const p = P[i];
      p.r -= p.v * dt * (0.5 + p.r);
      if (p.r < 0.06) spawn(p, 1);
      const r = p.r;
      const a = (p.arm / ARMS) * Math.PI * 2 + p.j + 2.8 * (1 - r) + rot * (1 + (1 - r) * 0.9);
      const lx = Math.cos(a) * r * R, ly = Math.sin(a) * r * R, lz = -Math.pow(1 - r, 2) * 2.4 + p.h; // воронка
      let x = cen.x + lx, y = cen.y + ly * ct - lz * st, z = ly * st + lz * ct;
      // м’яко тягнуться й закручуються за пальцем
      let gx = 0, gy = 0;
      if (ptr.on) {
        const dx = ptr.x - x, dy = ptr.y - y, d = Math.hypot(dx, dy);
        if (d < reach) { const f = (1 - d / reach) ** 2; gx = (dx * 0.45 - dy * 0.35) * f; gy = (dy * 0.45 + dx * 0.35) * f; }
      }
      p.ox += (gx - p.ox) * Math.min(1, dt * 3); p.oy += (gy - p.oy) * Math.min(1, dt * 3);
      x += p.ox; y += p.oy;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      // яскравість: згасання до країв і в самому центрі + м’яке мерехтіння
      const edge = Math.min(1, (1 - r) * 3.2) * Math.min(1, r * 5);
      const b = edge * (0.55 + 0.45 * Math.sin(t * p.tw + p.ph));
      col[i * 3] = p.c[0] * b; col[i * 3 + 1] = p.c[1] * b; col[i * 3 + 2] = p.c[2] * b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
  }

  let raf = 0, last = performance.now(), paused = false;
  const frame = (now) => { raf = 0; step(Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now; loop(); };
  const loop = () => { if (!raf && !reduced && !paused && !document.hidden) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', () => { last = performance.now(); loop(); });
  step(0.016);
  canvas.classList.add('is-on');
  loop();
  addEventListener('pagehide', (e) => { if (e.persisted) return; geo.dispose(); mat.dispose(); dot.dispose(); renderer.dispose(); });
  return {
    renderer,
    /** поки на екрані 3D-зірка (своя WebGL-сцена) — фон стоїть: один GPU-контекст за раз */
    pause(on) { paused = !!on; if (paused && raf) { cancelAnimationFrame(raf); raf = 0; } else if (!paused) { last = performance.now(); loop(); } },
  };
}
