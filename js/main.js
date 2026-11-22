/* Точка входу: маршрути між екранами, зв’язок майстерні з 3D та фіналом. */
import { ASSETS, LANDING, BRAND, PAINTS, PAINT } from './config.js';
import { state, set, subscribe } from './store.js';
import { renderWorkshop, setMode, setObject, focusObject, setToast, onFinish, visibleLayers, stepsOf } from './workshop.js';
import { compose, variantOf, starHandmade, svgUrl } from './compose.js';
import { DESIGN, DESIGNS, LEVELS, PRESETS, presetColors } from './ornaments.js';
import { initAmbientBg, initDrum, initScrollFx } from './landing-fx.js';
import { initPlayer } from './player.js';
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
    v.attach($('#viewer3d'));
    v.setLook(state.look);
    v.setView(showView, true);
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
  document.querySelectorAll('.tabs [data-go]').forEach((b) => b.classList.toggle('is-on', b.dataset.go === view));
  if (view === 'showcase') attachShowcase();
  else if (view === 'workshop' && stage3d) setStage3d(true);
  else viewer?.setActive(false);
  if (view === 'workshop') renderWorkshop();
  if (view === 'finish') renderFinish();
  document.body.dataset.view = view;
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
$('#autoRotateBtn').addEventListener('click', (e) => {
  const on = !(viewer?.auto ?? true);
  viewer?.setAuto(on);
  e.currentTarget.textContent = on ? '⏸' : '▶';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.setAttribute('aria-label', on ? 'Зупинити обертання' : 'Обертати зірку');
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
    const file = new File([lastBlob], 'moya-zirka.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) $('#shareBtn').hidden = false;
  } catch (err) {
    console.error(err);
    toast('Не вдалося зберегти — спробуй ще раз');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Зберегти мою зірку';
  }
});
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

// справжні фото розписаних зірок: перевіряємо тихо (без «битих» картинок) і лише для карток поруч
const photoOk = new Map(); // id → true | false | 'loading'
const artHtml = (d) => (photoOk.get(d.id) === true
  ? `<div class="dc-art is-photo"><img src="${d.realPhotoUrl}" alt="${esc(d.title)} — розписано вручну" draggable="false"><span class="dc-real">Фото</span></div>`
  : `<div class="dc-art"><img src="${svgUrl(starHandmade(d.id, presetColors(d, 'classic'), { idp: 'hm', seed: 3 + (d.id.length % 7) }))}" alt="" draggable="false"></div>`);
function probePhoto(d) {
  if (!d?.realPhotoUrl || photoOk.has(d.id)) return;
  photoOk.set(d.id, 'loading');
  const im = new Image();
  im.decoding = 'async';
  im.onload = () => {
    photoOk.set(d.id, true);
    document.querySelectorAll(`.dc[data-id="${d.id}"] .dc-art`).forEach((a) => (a.outerHTML = artHtml(d)));
  };
  im.onerror = () => photoOk.set(d.id, false);
  im.src = d.realPhotoUrl;
}

// Крок 1 · барабан узорів
const drum = initDrum($('#drum'), $('#drumRing'), {
  render: (d) => `<div class="dc" data-id="${d.id}">
      ${artHtml(d)}
      <div class="dc-meta"><b>${esc(d.title)}</b><small>${esc(d.origin || levelTitle(d.level))}</small></div>
      <span class="dc-open" aria-hidden="true">Обрати</span></div>`,
  onActive: (d) => {
    const i = DESIGNS.indexOf(d), n = DESIGNS.length;
    for (let k = -2; k <= 2; k++) probePhoto(DESIGNS[(i + k + n) % n]);
    $('#drumInfo').innerHTML = `<b>${esc(d.title)}</b><button class="btn btn-gold btn-sm" data-try="${d.id}">Обрати ↓</button>`;
  },
  onOpen: (d) => tryDesign(d.id),
});
drum.setItems(DESIGNS, Math.max(0, DESIGNS.findIndex((d) => d.id === state.star.designId)));
function tryDesign(id) {
  applyDesign(id);
  goSection('try');
  toast('Узор на зірці ✨');
}

// Крок 2 · примірка кольорів
const dryOf = (d) => Object.values(d.dry || {}).reduce((a, b) => a + b, 0);
const paintBg = (id) => (id === 'gold' ? '' : `background:${PAINT[id]?.hex || id}`);
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
    <div class="tp-head"><b>${esc(d.title)}</b><button class="linklike" data-scroll="ideas">Інший узор</button></div>
    <div class="tp-block"><span class="tp-label">Палітри</span>
      <div class="presets">${PRESETS.map((p) => `<button data-tpreset="${p.id}" class="${state.star.preset === p.id ? 'is-on' : ''}">${esc(p.title)}</button>`).join('')}</div></div>
    <div class="tp-block"><span class="tp-label">Що фарбуємо</span>
      <div class="parts">${Object.entries(d.slots).map(([k, v]) => `<button data-tslot="${k}" class="${k === slot ? 'is-on' : ''}"><span class="sw ${colors[k] === 'gold' ? 'sw-gold' : ''}" style="${paintBg(colors[k] || v.def)}"></span>${esc(v.label)}</button>`).join('')}</div></div>
    <div class="tp-block"><span class="tp-label">Фарба</span>
      <div class="paints">${PAINTS.map((p) => `<button class="paint ${colors[slot] === p.id ? 'is-on' : ''}" data-tpaint="${p.id}" aria-label="${esc(p.name)}"><i class="${p.id === 'gold' ? 'sw-gold' : ''}" style="${paintBg(p.id)}"></i>${esc(p.name)}</button>`).join('')}</div></div>
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
  const b = e.target.closest('[data-scroll], [data-try], [data-drum], [data-tpreset], [data-tslot], [data-tpaint]');
  if (!b) return;
  const d = b.dataset;
  if (d.scroll) { e.preventDefault(); if (d.lookGo) setLook(d.lookGo); return goSection(d.scroll); }
  if (d.try) return tryDesign(d.try);
  if (d.drum) return drum.go(+d.drum);
  const des = DESIGN[state.star.designId];
  if (d.tpreset) return set({ star: { ...state.star, preset: d.tpreset, colors: presetColors(des, d.tpreset) } });
  if (d.tslot) return set({ selected: { ...state.selected, star: d.tslot } });
  if (d.tpaint) {
    const slot = des.slots[state.selected.star] ? state.selected.star : Object.keys(des.slots)[0];
    setLook('painted');
    return set({ star: { ...state.star, preset: null, colors: { ...state.star.colors, [slot]: d.tpaint } } });
  }
});

// 3D на головній вантажиться лише коли користувач догортав до примірки (швидкий старт на мобільному)
// заздалегідь (за 400px) — вантажимо; рендеримо — лише поки 3D-блок справді на екрані
let tryVisible = false, tryInView = false;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => { tryVisible = en.isIntersecting; attachShowcase(); }, { rootMargin: '400px 0px' }).observe($('#try'));
  new IntersectionObserver(([en]) => {
    tryInView = en.isIntersecting;
    if (state.view === 'showcase' && viewer) viewer.setActive(tryInView);
  }).observe($('#viewer3d'));
} else tryVisible = tryInView = true;
// сторінку закрили — звільняємо пам’ять GPU (але не при поверненні «Назад» із кешу)
addEventListener('pagehide', (e) => { if (!e.persisted) viewer?.dispose(); });

// фон і скрол-ефекти
initAmbientBg($('#bgfx'));
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
