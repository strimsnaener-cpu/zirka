/* Міні-гід із 3 кроків: затемнення довкола потрібного місця (spotlight), золота пульсуюча рамка
   і коротка картка «Далі / Пропустити». Підсвічене місце лишається живим — його можна одразу торкнутися.
   Показується раз (localStorage), знову — кнопкою «?». */

const KEY = 'zirka-tour-v1';
const NS = 'http://www.w3.org/2000/svg';
const MOBILE = () => matchMedia('(max-width: 768px)').matches;

export const tourSeen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch { /* приватний режим — не страшно */ } };

/**
 * steps: [{ holes: [[selector, ...], ...], anchor: selector, text, hand?, minTop?: () => px }]
 * кожна «дірка» — об’єднання прямокутників своїх селекторів
 */
export function createTour(steps) {
  let root = null, i = 0, raf = 0, onKey = null, onMove = null;

  const els = (sel) => [].concat(sel).map((s) => document.querySelector(s)).filter(Boolean);
  const rectOf = (sel) => {
    const rs = els(sel).map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
    if (!rs.length) return null;
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
    const r = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom));
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  };
  const topbarH = () => document.querySelector('.topbar')?.offsetHeight || 64;

  function build() {
    root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = `
      <svg class="tour-dim" aria-hidden="true"><path fill-rule="evenodd"/></svg>
      <div class="tour-rings"></div>
      <div class="tour-hand" aria-hidden="true"><span>👆</span></div>
      <div class="tour-card" role="dialog" aria-modal="false" aria-live="polite" aria-label="Коротка підказка">
        <button class="tour-skip" type="button">Пропустити</button>
        <div class="tour-dots"></div>
        <p class="tour-text"></p>
        <button class="btn btn-gold tour-next" type="button"></button>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add('tour-on');
    root.querySelector('.tour-skip').addEventListener('click', () => end());
    root.querySelector('.tour-next').addEventListener('click', () => go(i + 1));
    onKey = (e) => { if (e.key === 'Escape') end(); };
    onMove = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };
    addEventListener('keydown', onKey);
    addEventListener('scroll', onMove, { passive: true });
    addEventListener('resize', onMove);
  }

  // прокрутити так, щоб підсвічене + картка вмістилися на екрані
  function scrollFor(st) {
    const a = rectOf(st.anchor);
    if (!a) return;
    const cardH = root.querySelector('.tour-card').offsetHeight || 170;
    const minTop = (st.minTop ? st.minTop() : topbarH()) + 12;
    const want = Math.max(minTop, (innerHeight - (a.height + cardH + 24)) / 2);
    const dy = a.top - want;
    if (Math.abs(dy) > 4) scrollTo({ top: scrollY + dy, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function layout() {
    if (!root) return;
    const st = steps[i];
    const pad = 8;
    const holes = st.holes.map(rectOf).filter(Boolean).map((r) => ({
      x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2,
    }));
    const W = innerWidth, H = innerHeight;
    const svg = root.querySelector('.tour-dim');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const rr = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
    svg.querySelector('path').setAttribute('d', `M0 0H${W}V${H}H0Z ` + holes.map((h) => rr(h.x, h.y, h.w, h.h, Math.min(22, h.h / 2, h.w / 2))).join(' '));

    const rings = root.querySelector('.tour-rings');
    while (rings.children.length < holes.length) rings.appendChild(document.createElement('i'));
    while (rings.children.length > holes.length) rings.lastChild.remove();
    holes.forEach((h, k) => Object.assign(rings.children[k].style, { transform: `translate(${h.x}px, ${h.y}px)`, width: `${h.w}px`, height: `${h.h}px` }));

    // рука-підказка по центру першої «дірки»
    const hand = root.querySelector('.tour-hand');
    hand.hidden = !st.hand || !holes[0];
    if (st.hand && holes[0]) hand.style.transform = `translate(${holes[0].x + holes[0].w / 2 - 30}px, ${holes[0].y + holes[0].h * 0.52 - 30}px)`;

    // картка: під якорем → над ним → унизу всередині підсвічення
    const card = root.querySelector('.tour-card');
    const a = rectOf(st.anchor) || { left: 0, right: W, top: H / 2, bottom: H / 2 };
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 18;
    let x = Math.min(W - cw - 12, Math.max(12, (a.left + a.right) / 2 - cw / 2));
    let y;
    const below = Math.max(...holes.map((h) => h.y + h.h)) + gap;
    if (a.bottom + pad + gap + ch < H - 8) y = Math.max(a.bottom + pad + gap, Math.min(below, H - ch - 8));
    else if (W - a.right - pad - gap - 12 >= cw) { x = a.right + pad + gap; y = Math.min(H - ch - 8, Math.max(topbarH() + 8, (Math.max(a.top, 0) + Math.min(a.bottom, H)) / 2 - ch / 2)); }
    else if (a.top - pad - gap - ch > topbarH()) y = a.top - pad - gap - ch;
    else y = Math.min(H, a.bottom) - ch - 16;
    if (y + ch > H - 8) y = H - ch - 8;
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(8, y))}px)`;
  }

  function go(n) {
    if (n >= steps.length) return end(true);
    i = n;
    const st = steps[i];
    st.before?.();
    const card = root.querySelector('.tour-card');
    root.querySelector('.tour-dots').innerHTML = `<b>${i + 1}</b> / ${steps.length}` + steps.map((_, k) => `<i class="${k === i ? 'is-on' : ''}"></i>`).join('');
    root.querySelector('.tour-text').textContent = st.text;
    root.querySelector('.tour-next').textContent = i === steps.length - 1 ? 'Готово ✨' : 'Далі →';
    card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
    // спершу трохи даємо розкластися сторінці (3D, барабан), потім прокручуємо й міряємо
    setTimeout(() => { if (!root) return; scrollFor(st); layout(); }, st.delay ?? 60);
    // плавна прокрутка — догнати положення кілька разів
    [250, 500, 800, 1200].forEach((t) => setTimeout(layout, t + (st.delay ?? 60)));
    root.querySelector('.tour-next').focus({ preventScroll: true });
  }

  function end(done) {
    markSeen();
    if (!root) return;
    removeEventListener('keydown', onKey);
    removeEventListener('scroll', onMove);
    removeEventListener('resize', onMove);
    const r = root; root = null;
    document.body.classList.remove('tour-on');
    r.classList.add('is-out');
    setTimeout(() => r.remove(), 300);
    steps.onEnd?.(done);
  }

  return {
    start() { if (root) return; build(); requestAnimationFrame(() => go(0)); },
    get active() { return !!root; },
    end,
  };
}
export const isMobileTour = MOBILE;
