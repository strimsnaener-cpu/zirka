/* Точка входу: маршрути між екранами, зв’язок майстерні з 3D та фіналом. */
import { BRAND, PAINTS, PAINT } from './config.js';
import { state, set, subscribe } from './store.js';
import { renderWorkshop, setMode, setObject, focusObject, setToast, onFinish, visibleLayers, stepsOf } from './workshop.js';
import { compose, variantOf, starHandmade, svgUrl } from './compose.js';
import { DESIGN, DESIGNS, LEVELS, PRESETS, IDEAS, presetColors, ideaColors } from './ornaments.js';
import { initAmbientBg, initDrum, initScrollFx } from './landing-fx.js';
import { initPlayer } from './player.js';
import { createTour, tourSeen } from './tour.js';
import { renderPNG, downloadBlob } from './export.js';

const $ = (s) => document.querySelector(s);

/* ---------- тост ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
}
setToast(toast);

/* ---------- 3D (ліниве завантаження Three.js) ---------- */
let viewer = null, viewerP = null;
function ensureViewer() {
  if (!viewerP) {
    viewerP = import('./viewer3d.js').then(async ({ Viewer }) => {
      viewer = new Viewer($('#viewer3d'));
      viewer.light = lightMode;
      if (/[?&]debug/.test(location.search)) window.__viewer = viewer; // для налагодження
      await viewer.init();
      viewer.setLook(state.look);
      await viewer.update(state);
      return viewer;
    }).catch((err) => {
      console.error(err);
      $('#viewer3d').innerHTML = '<div class="viewer-loading">3D недоступне на цьому пристрої</div>';
    });
  }
  return viewerP;
}

/* одна 3D-сцена на два місця: вітрина і «3D» у майстерні */
let stage3d = false;
let showView = 'front';
const in3dStage = () => state.view === 'workshop' && stage3d;
let updTimer = 0;
function refresh3d(delay = 120) {
  if (!viewer) return;
  clearTimeout(updTimer);
  updTimer = setTimeout(() => viewer.update(state, in3dStage() ? visibleLayers() : {}), delay);
}
const objView = () => (state.object === 'village' ? 'stand' : 'front');
function setStage3d(on) {
  stage3d = on;
  $('.stage-card').classList.toggle('is-3d', on);
  $('#stage3d').hidden = !on;
  const b = $('[data-stage3d]');
  b.classList.toggle('is-on', on);
  b.setAttribute('aria-pressed', String(on));
  if (!on) { viewer?.setActive(false); return; }
  ensureViewer().then((v) => {
    if (!v || !in3dStage()) return;
    v.attach($('#stage3d'));
    v.setLook('painted');
    v.setView(objView(), true);
    refresh3d(0);
    v.setActive(true);
  });
}

function attachShowcase() {
  if (state.view !== 'showcase') return;
  if (!tryVisible) { viewer?.setActive(false); return; }
  ensureViewer().then((v) => {
    if (!v || state.view !== 'showcase' || !tryVisible) return;
    const fresh = v.host !== $('#viewer3d');
    v.attach($('#viewer3d'));
    v.setLook(state.look);
    if (fresh) v.setView(showView, true);
    refresh3d(0);
    v.setActive(tryInView);
  });
}

/* ---------- екрани ---------- */
const VIEWS = ['showcase', 'workshop', 'finish'];
function show(view) {
  if (!VIEWS.includes(view)) view = 'showcase';
  state.view = view;
  document.querySelectorAll('.view').forEach((s) => (s.hidden = s.dataset.view !== view));
  if (view === 'showcase') attachShowcase();
  else if (view === 'workshop' && stage3d) setStage3d(true);
  else viewer?.setActive(false);
  if (view === 'workshop') renderWorkshop();
  if (view === 'finish') renderFinish();
  document.body.dataset.view = view;
  queueMicrotask(() => bgSync()); // вихор спить, поки працює 3D або відкрито майстерню
  if (view === 'showcase') fx?.update();
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
/* #ideas, #try… — це блоки головної, а не окремі екрани */
const route = (h) => (document.querySelector(`[data-sec][id="${h}"]`) ? goSection(h) : show(h));
window.addEventListener('hashchange', () => route(location.hash.slice(1)));

document.addEventListener('click', (e) => {
  const b = e.target.closest('button, a');
  if (!b) return;
  const d = b.dataset;
  if (d.go) {
    e.preventDefault();
    if (d.mode && d.go === 'workshop') { state.mode = d.mode; state.paint = { ...state.paint, step: -1, dry: null }; }
    if (d.lookGo) setLook(d.lookGo);
    show(d.go);
    return;
  }
  if (b.closest('.ws-bar')) {
    if (d.object) { setObject(d.object); if (stage3d) viewer?.setView(objView()); }
    if (d.mode) setMode(d.mode);
    return;
  }
  if ('stage3d' in d) return setStage3d(!stage3d);
  if (d.view3d) {
    document.querySelectorAll('[data-view3d]').forEach((x) => x.classList.toggle('is-on', x === b));
    showView = d.view3d;
    viewer?.setView(d.view3d);
  }
  if (d.look) setLook(d.look);
});
function setLook(look) {
  state.look = look;
  document.querySelectorAll('[data-look]').forEach((x) => x.classList.toggle('is-on', x.dataset.look === look));
  viewer?.setLook(look);
}
// «Вечір зі свічкою»: як зірка виглядатиме ввечері поруч зі свічкою Lava Aroma Candles
let lightMode = 'day';
function setLightMode(mode, quiet) {
  lightMode = mode;
  const on = mode === 'candle';
  document.querySelectorAll('[data-light]').forEach((b) => { const me = b.dataset.light === mode; b.classList.toggle('is-on', me); b.setAttribute('aria-pressed', String(me)); });
  $('.viewer-card').classList.toggle('is-candle', on);
  viewer?.setLight(mode);
  if (!quiet) toast(on ? 'Вечір зі свічкою 🕯️' : 'Денне світло ☀️');
}
document.querySelectorAll('[data-light]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.light !== lightMode) setLightMode(b.dataset.light); }));
$('#autoRotateBtn').addEventListener('click', (e) => {
  const on = !(viewer ? viewer.auto : true);
  viewer?.setAuto(on);
  const b = e.currentTarget;
  b.querySelector('.pb-i').textContent = on ? '⏸' : '▶';
  b.querySelector('.pb-t').textContent = on ? 'Пауза' : 'Крутити';
  b.setAttribute('aria-pressed', String(on));
});

/* ---------- фінал ---------- */
function renderFinish() {
  const d = DESIGN[state.star.designId];
  $('#finishPreview').innerHTML = compose(state, { idp: 'fin' });
  $('#finishText').textContent = `«${d.title}» · «${variantOf(state.village.variantId).title}»`;
}
let lastBlob = null;
$('#saveBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Готуємо картинку…';
  try {
    lastBlob = await renderPNG(state);
    downloadBlob(lastBlob, `moya-zirka-${state.star.designId}.png`);
    toast('Картинку збережено ✨');
  } catch (err) {
    console.error(err);
    toast('Не вдалося зберегти — спробуй ще раз');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Зберегти для сторіз';
  }
});
// «Поділитися» видно одразу, якщо телефон уміє ділитися файлами (iOS/Android) — одним тапом у сторіз
try { $('#shareBtn').hidden = !navigator.canShare?.({ files: [new File(['x'], 'z.png', { type: 'image/png' })] }); } catch { /* ні — лишається «Зберегти» */ }
$('#shareBtn').addEventListener('click', async () => {
  try {
    const blob = lastBlob || (await renderPNG(state));
    await navigator.share({ files: [new File([blob], 'moya-zirka.png', { type: 'image/png' })], title: 'Моя різдвяна зірка', text: `${BRAND.hashtag} · ${BRAND.name}` });
  } catch { /* скасовано */ }
});
onFinish(() => show('finish'));

/* ---------- головна після QR: барабан узорів, примірка кольорів, набір, поради ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const onShowcase = () => state.view === 'showcase';
const levelTitle = (lvl) => LEVELS.find((l) => l.id === lvl)?.title || '';

// застосувати узор (на 3D-зірці на головній; майстерню не відкриваємо)
function applyDesign(id) {
  const d = DESIGN[id];
  const firstOrn = d.elements.find((e) => e.layer === 'ornament')?.slot || Object.keys(d.slots)[0];
  set({ level: d.level, star: { designId: id, preset: 'classic', colors: presetColors(d, 'classic') }, selected: { ...state.selected, star: firstOrn }, paint: { ...state.paint, step: -1, dry: null } });
  if (state.object !== 'star') setObject('star');
  setLook('painted');
}

// справжнє фото розписаної зірки (якщо вписане в PAINTED_PHOTOS.files), інакше — превʼю «як розписано вручну»
const artHtml = (d) => (d.realPhotoUrl
  ? `<div class="dc-art is-photo"><img src="${d.realPhotoUrl}" alt="${esc(d.title)} — розписано вручну" loading="lazy" draggable="false"><span class="dc-real">Фото</span></div>`
  : `<div class="dc-art"><img src="${svgUrl(starHandmade(d.id, presetColors(d, 'classic'), { idp: 'hm', seed: 3 + (d.id.length % 7) }))}" alt="" draggable="false"></div>`);

// Крок 2 · барабан узорів
const drum = initDrum($('#drum'), $('#drumRing'), {
  render: (d) => `<div class="dc" data-id="${d.id}">
      ${artHtml(d)}
      <div class="dc-meta"><small class="dc-kicker">${esc(d.origin || levelTitle(d.level))}</small><b>${esc(d.title)}</b><small class="dc-tip">${esc(d.masterTip)}</small></div>
      <span class="dc-open" aria-hidden="true">Приміряти на зірці</span></div>`,
  onActive: (d) => {
    $('#drumInfo').innerHTML = `<b>${esc(d.title)}</b><button class="btn btn-gold btn-sm" data-try="${d.id}">Приміряти на зірці ↑</button>`;
  },
  onOpen: (d) => tryDesign(d.id),
});
drum.setItems(DESIGNS, Math.max(0, DESIGNS.findIndex((d) => d.id === state.star.designId)));
function tryDesign(id) {
  applyDesign(id);
  goSection('try');
  toast('Узор на зірці ✨');
}

// Крок 1 · примірка кольорів
const paintBg = (id) => (id === 'gold' ? '' : `background:${PAINT[id]?.hex || id}`);
const DICE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="15.5" cy="8.5" r="1.3"/><circle cx="8.5" cy="15.5" r="1.3"/></svg>';
let tryKey = '';
function renderTry() {
  const d = DESIGN[state.star.designId];
  const colors = state.star.colors;
  const slot = d.slots[state.selected.star] ? state.selected.star : Object.keys(d.slots)[0];
  const key = JSON.stringify([d.id, colors, slot, state.star.preset]);
  if (key === tryKey) return;
  tryKey = key;
  const steps = stepsOf(d);
  $('#tryPanel').innerHTML = `
    <div class="tp-head"><b>${esc(d.title)}</b><button class="linklike" data-scroll="ideas">Інший узор ↓</button></div>
    <div class="tp-block"><span class="tp-label">Готові ідеї</span>
      <div class="presets ideas">${IDEAS.map((p) => `<button data-tidea="${p.id}" class="${state.star.preset === 'idea:' + p.id ? 'is-on' : ''}">${esc(p.title)}</button>`).join('')}</div>
      <button class="btn btn-ghost tp-random" data-trandom>${DICE}Випадкова ідея</button></div>
    <div class="tp-block"><span class="tp-label"><i class="tp-n">1</i>Обери деталь зірки</span>
      <div class="parts">${Object.entries(d.slots).map(([k, v]) => `<button data-tslot="${k}" class="${k === slot ? 'is-on' : ''}"><span class="sw ${colors[k] === 'gold' ? 'sw-gold' : ''}" style="${paintBg(colors[k] || v.def)}"></span>${esc(v.label)}</button>`).join('')}</div></div>
    <div class="tp-block"><span class="tp-label"><i class="tp-n">2</i>Тицьни на колір</span>
      <div class="paints">${PAINTS.map((p) => `<button class="paint ${colors[slot] === p.id ? 'is-on' : ''}" data-tpaint="${p.id}" aria-label="${esc(p.name)}" aria-pressed="${colors[slot] === p.id}"><i class="${p.id === 'gold' ? 'sw-gold' : ''}" style="${paintBg(p.id)}"></i>${colors[slot] === p.id ? '<b class="chk" aria-hidden="true">✓</b>' : ''}${esc(p.name)}</button>`).join('')}</div>
</div>
    <div class="tp-block"><span class="tp-label">Кроки</span>
      <ol class="steps-list">${steps.map((s, i) => `<li><span class="n">${i + 1}</span><div><b>${esc(s.title)}</b><small>${s.dry ? `сохне ${s.dry} хв` : i === steps.length - 1 ? 'фініш ✨' : 'одразу далі'}</small></div></li>`).join('')}</ol></div>
    <button class="btn btn-gold btn-lg tp-go" data-go="workshop" data-mode="paint">Почати розпис</button>`;
}
renderTry();

// переходи по блоках
function goSection(id) {
  if (!onShowcase()) show('showcase');
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-scroll], [data-try], [data-drum], [data-tpreset], [data-tslot], [data-tpaint], [data-trandom], [data-tidea]');
  if (!b) return;
  const d = b.dataset;
  if (d.scroll) { e.preventDefault(); if (d.lookGo) setLook(d.lookGo); return goSection(d.scroll); }
  if (d.try) return tryDesign(d.try);
  if (d.drum) return drum.go(+d.drum);
  const des = DESIGN[state.star.designId];
  if ('trandom' in d) return randomIdea();
  if (d.tidea) return applyIdea(d.tidea);
  if (d.tpreset) return set({ star: { ...state.star, preset: d.tpreset, colors: presetColors(des, d.tpreset) } });
  if (d.tslot) return set({ selected: { ...state.selected, star: d.tslot } });
  if (d.tpaint) {
    const slot = des.slots[state.selected.star] ? state.selected.star : Object.keys(des.slots)[0];
    setLook('painted');
    return set({ star: { ...state.star, preset: null, colors: { ...state.star.colors, [slot]: d.tpaint } } });
  }
});

// «Випадкова ідея»: інше продумане поєднання 5 фарб, щоразу не те саме, що щойно
let lastIdea = 'xmas';
function applyIdea(id, quiet) {
  const idea = IDEAS.find((i) => i.id === id) || IDEAS[0];
  lastIdea = idea.id;
  setLook('painted');
  set({ star: { ...state.star, preset: 'idea:' + idea.id, colors: ideaColors(DESIGN[state.star.designId], idea.id) } });
  const card = $('.viewer-card');
  card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash');
  if (!quiet) toast(`${idea.title} ✨`);
}
function randomIdea() {
  const pool = IDEAS.filter((i) => i.id !== lastIdea);
  applyIdea(pool[Math.floor(Math.random() * pool.length)].id);
}

// 3D на головній вантажиться лише коли користувач догортав до примірки (швидкий старт на мобільному)
// заздалегідь (за 400px) — вантажимо; рендеримо — лише поки 3D-блок справді на екрані
let tryVisible = false, tryInView = false;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => { tryVisible = en.isIntersecting; attachShowcase(); }, { rootMargin: '400px 0px' }).observe($('#try'));
  new IntersectionObserver(([en]) => {
    tryInView = en.isIntersecting;
    if (state.view === 'showcase' && viewer) viewer.setActive(tryInView);
    bgSync();
  }).observe($('#viewer3d'));
} else tryVisible = tryInView = true;
// сторінку закрили — звільняємо пам’ять GPU (але не при поверненні «Назад» із кешу)
addEventListener('pagehide', (e) => { if (!e.persisted) viewer?.dispose(); });

// фон і скрол-ефекти
// «Зоряний пил»: 3D-вихор вантажиться, коли сторінка вже відкрилась; без WebGL — легкий 2D-фон
const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 400));
var bg = null;
function bgSync() { bg?.pause?.(state.view !== 'showcase' || tryInView); }
const startBg = () => import('./vortex-bg.js').then((m) => m.initVortexBg($('#bgfx'))).then((b) => { bg = b; bgSync(); }).catch((err) => {
  console.warn('vortex bg off:', err?.message);
  initAmbientBg($('#bgfx'));
  $('#bgfx').classList.add('is-on');
});
if (document.readyState === 'complete') idle(startBg); else addEventListener('load', () => idle(startBg), { once: true });
const fx = initScrollFx({ isActive: onShowcase });

/* ---------- реактивність ---------- */
subscribe(() => {
  if (state.view === 'workshop') renderWorkshop();
  if (state.view === 'showcase' || in3dStage()) refresh3d();
  renderTry();
});

const player = initPlayer($('#player'), {
  onChange: (playing, started) => {
    const b = $('#musicBtn');
    b.classList.toggle('is-on', playing);
    b.setAttribute('aria-pressed', String(playing));
    b.setAttribute('aria-label', playing ? 'Вимкнути колядки' : 'Увімкнути колядки');
    document.body.classList.toggle('has-player', started);
  },
});
$('#musicBtn').addEventListener('click', () => player.toggle());
focusObject(state.object);
route(location.hash.slice(1) || 'showcase');

/* ---------- свічка-хук на першому екрані: світло свічки → одразу 3D-зірка ---------- */
$('#candleGo').addEventListener('click', (e) => {
  const b = e.currentTarget;
  b.classList.add('is-lit');
  setLightMode('candle', true);
  setTimeout(() => { goSection('try'); toast('Вечір зі свічкою 🕯️ Покрути зірку'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
});

/* ---------- міні-гід із 3 кроків (раз при першому відкритті; знову — кнопка «?») ---------- */
const mob = () => matchMedia('(max-width: 768px)').matches;
const tourSteps = [
  { anchor: '.viewer-stage', holes: [['.viewer-stage']], hand: true, delay: 300,
    text: 'Покрути зірку пальцем, щоб роздивитися з усіх боків' },
  { anchor: '#drum', holes: [['#drum']],
    text: 'Гортай та обери готовий візерунок для натхнення' },
  { anchor: '#tryPanel .paints', holes: [['#tryPanel .paints'], ['.light-row']],
    minTop: () => $('.topbar').offsetHeight + (mob() ? $('.viewer-card').offsetHeight : 0),
    text: 'Тицяй на кольори з набору та приміряй розпис' },
];
const tour = createTour(tourSteps);
$('#helpBtn').addEventListener('click', () => {
  if (state.view !== 'showcase') { show('showcase'); setTimeout(() => tour.start(), 450); } else tour.start();
});
$('#viewer3d').addEventListener('pointerdown', () => $('.viewer-card').classList.add('was-touched'), { once: true });
if (!tourSeen()) {
  setTimeout(() => { if (!tourSeen() && state.view === 'showcase' && !tour.active) tour.start(); }, 1400);
}
