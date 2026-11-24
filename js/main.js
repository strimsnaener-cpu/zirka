/* «Зірка оживає» — один екран без прокрутки:
   шапка (світло «День / Свічка», «?») · 3D-зірка на хатинці · док із двома вкладками:
   «Готові ідеї» (стрічка узорів + «Випадкова ідея») і «Свої кольори» (деталь + 5 фарб). */
import { PAINTS, PAINT } from './config.js';
import { state, set, subscribe } from './store.js';
import { starHandmade, svgUrl } from './compose.js';
import { DESIGN, DESIGNS, IDEAS, presetColors, ideaColors } from './ornaments.js';
import { createTour, tourSeen } from './tour.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stageCard = $('#stageCard');

/* ---------- тост (лише для «Випадкової ідеї» — щоб знати, що випало) ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
}

/* ---------- 3D: одна сцена, працює весь час, поки вкладка відкрита ---------- */
let viewer = null;
let lightMode = 'day';
import('./viewer3d.js').then(async ({ Viewer }) => {
  viewer = new Viewer($('#viewer3d'));
  viewer.light = lightMode;
  if (/[?&]debug/.test(location.search)) window.__viewer = viewer; // для налагодження
  await viewer.init();
  viewer.setLook('painted');
  await viewer.update(state);
  viewer.setActive(true);
}).catch((err) => {
  console.error(err);
  $('#viewer3d').innerHTML = '<div class="viewer-loading">3D недоступне на цьому пристрої</div>';
});
let updTimer = 0;
const refresh3d = () => { if (!viewer) return; clearTimeout(updTimer); updTimer = setTimeout(() => viewer.update(state), 40); };
const faceFront = () => { if (viewer?.ready && !viewer.dragging) viewer.setView('fit'); };
addEventListener('pagehide', (e) => { if (!e.persisted) viewer?.dispose(); });

/* ---------- світло: «День» / «Свічка» ---------- */
function setLightMode(mode) {
  lightMode = mode;
  document.querySelectorAll('[data-light]').forEach((b) => { const on = b.dataset.light === mode; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  stageCard.classList.toggle('is-candle', mode === 'candle');
  viewer?.setLight(mode);
}

/* ---------- вкладки дока ---------- */
let tab = 'ideas';
function setTab(id) {
  tab = id;
  document.querySelectorAll('[role="tab"]').forEach((t) => {
    const on = t.dataset.tab === id;
    t.classList.toggle('is-on', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('[role="tabpanel"]').forEach((p) => (p.hidden = p.dataset.pane !== id));
  if (id === 'ideas') centerActive(false);
}
$('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  setTab(tab === 'ideas' ? 'colors' : 'ideas');
  $(`[data-tab="${tab}"]`).focus();
});

/* ---------- «Готові ідеї»: стрічка карток-узорів ---------- */
const strip = $('#strip');
const cardArt = (d) => d.realPhotoUrl || svgUrl(starHandmade(d.id, presetColors(d, 'classic'), { idp: 'hm', seed: 3 + (d.id.length % 7) }));
strip.innerHTML = DESIGNS.map((d) => `<button class="card" data-design="${d.id}" aria-label="${esc(d.title)}" title="${esc(d.title)}" aria-pressed="false"><img src="${cardArt(d)}" alt="" draggable="false"></button>`).join('');
function markStrip() {
  strip.querySelectorAll('.card').forEach((c) => {
    const on = c.dataset.design === state.star.designId;
    c.classList.toggle('is-on', on);
    c.setAttribute('aria-pressed', String(on));
  });
}
function centerActive(smooth) {
  const c = strip.querySelector('.card.is-on');
  if (!c || !strip.clientWidth) return;
  strip.scrollTo({ left: c.offsetLeft - (strip.clientWidth - c.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
}
// мишка на ПК: колесо гортає стрічку вбік, а перетягування — як пальцем
strip.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  strip.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive: false });
let drag = null, dragMoved = false;
strip.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0) { drag = { x: e.clientX, l: strip.scrollLeft }; dragMoved = false; } });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 6) dragMoved = true;
  if (dragMoved) strip.scrollLeft = drag.l - dx;
});
addEventListener('pointerup', () => { drag = null; });
strip.addEventListener('click', (e) => { if (dragMoved) { e.stopPropagation(); e.preventDefault(); dragMoved = false; } }, true);

const firstOrnament = (d) => d.elements.find((e) => e.layer === 'ornament')?.slot || Object.keys(d.slots)[0];
const curSlot = () => { const d = DESIGN[state.star.designId]; return d.slots[state.selected.star] ? state.selected.star : firstOrnament(d); };

function applyDesign(id, ideaId) {
  const d = DESIGN[id];
  set({
    level: d.level,
    star: { designId: id, preset: ideaId ? 'idea:' + ideaId : 'classic', colors: ideaId ? ideaColors(d, ideaId) : presetColors(d, 'classic') },
    selected: { ...state.selected, star: d.slots[state.selected.star] ? state.selected.star : firstOrnament(d) },
  });
  flash();
  faceFront();
}
function flash() { stageCard.classList.remove('is-flash'); void stageCard.offsetWidth; stageCard.classList.add('is-flash'); }

// «Випадкова ідея»: інший узор + інше продумане поєднання 5 фарб, щоразу не те, що щойно
let lastIdea = 'xmas';
function randomIdea() {
  const others = DESIGNS.filter((d) => d.id !== state.star.designId);
  const d = others[Math.floor(Math.random() * others.length)];
  const pool = IDEAS.filter((i) => i.id !== lastIdea);
  const idea = pool[Math.floor(Math.random() * pool.length)];
  lastIdea = idea.id;
  applyDesign(d.id, idea.id);
  centerActive(true);
  toast(`${d.title} · ${idea.title}`);
}

/* ---------- «Свої кольори»: деталь зірки + 5 фарб ---------- */
const paintBg = (id) => (id === 'gold' ? '' : `background:${PAINT[id]?.hex || id}`);
let colorsKey = '';
function renderColors() {
  const d = DESIGN[state.star.designId];
  const colors = state.star.colors;
  const slot = curSlot();
  const key = JSON.stringify([d.id, colors, slot]);
  if (key === colorsKey) return;
  colorsKey = key;
  const parts = $('#parts'), keep = parts.scrollLeft;
  parts.innerHTML = Object.entries(d.slots).map(([k, v]) => {
    const c = colors[k] || v.def;
    return `<button class="part${k === slot ? ' is-on' : ''}" data-slot="${k}" aria-pressed="${k === slot}"><span class="sw${c === 'gold' ? ' sw-gold' : ''}" style="${paintBg(c)}"></span>${esc(v.label)}</button>`;
  }).join('');
  parts.scrollLeft = keep;
  $('#paints').innerHTML = PAINTS.map((p) => {
    const on = colors[slot] === p.id;
    return `<button class="paint${on ? ' is-on' : ''}" data-paint="${p.id}" aria-label="${esc(p.name)}" title="${esc(p.name)}" aria-pressed="${on}"><i class="${p.id === 'gold' ? 'sw-gold' : ''}" style="${paintBg(p.id)}"></i>${on ? '<b class="chk" aria-hidden="true">✓</b>' : ''}</button>`;
  }).join('');
}

/* ---------- кліки ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.tab) return setTab(d.tab);
  if (d.light) { if (d.light !== lightMode) setLightMode(d.light); return; }
  if (d.design) { if (d.design !== state.star.designId) applyDesign(d.design); else faceFront(); return; }
  if ('random' in d) return randomIdea();
  if (d.slot) {
    set({ selected: { ...state.selected, star: d.slot } });
    b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    return;
  }
  if (d.paint) {
    set({ star: { ...state.star, preset: null, colors: { ...state.star.colors, [curSlot()]: d.paint } } });
    faceFront();
  }
});

/* ---------- реактивність ---------- */
subscribe(() => { refresh3d(); markStrip(); renderColors(); });
markStrip();
renderColors();
requestAnimationFrame(() => centerActive(false));

/* ---------- міні-гід із 3 кроків (раз при першому відкритті; знову — кнопка «?») ---------- */
const tourSteps = [
  { anchor: '#stageCard', holes: [['#stageCard']], hand: true, delay: 200,
    text: 'Свайп по зірці — вона крутиться. Свайп по фону — оглянь з усіх боків' },
  { anchor: '.dock', holes: [['.dock']], before: () => setTab('ideas'),
    text: 'Гортай картки й тапни узор — зірка одразу перефарбується' },
  { anchor: '.dock', holes: [['.dock']], before: () => setTab('colors'),
    text: 'Або обери деталь і тицьни на фарбу з набору' },
];
tourSteps.onEnd = () => setTab('ideas');
const tour = createTour(tourSteps);
$('#helpBtn').addEventListener('click', () => tour.start());
if (!tourSeen()) setTimeout(() => { if (!tourSeen() && !tour.active) tour.start(); }, 1400);
