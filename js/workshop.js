/* Майстерня: сцена з SVG, режим А (створюю) і режим Б (крок за кроком). */
import { PAINTS, PAINT } from './config.js';
import { state, set } from './store.js';
import { DESIGNS, DESIGN, LEVELS, PRESETS, presetColors } from './ornaments.js';
import { VILLAGE, VILLAGE_VARIANTS } from './village.js';
import { compose, starOnly, VIEWS } from './compose.js';
import { defs, renderObject, LAYER_NAMES, slotsInLayers, repCount } from './render.js';

const $ = (s, r = document) => r.querySelector(s);
const stageEl = $('#stage');
const panelEl = $('#panel');
const dockEl = $('#dock');
const chipEl = $('#stageChip');
let toast = () => {};
export const setToast = (fn) => (toast = fn);
export function onFinish(fn) { finishCb = fn; }
let finishCb = () => {};

/* ---------- допоміжне ---------- */
const objOf = (which) => (which === 'village' ? VILLAGE : DESIGN[state.star.designId]);
const colorsOf = (which) => (which === 'village' ? state.village.colors : state.star.colors);
const swatch = (c) => `<span class="sw ${c === 'gold' ? 'sw-gold' : ''}" style="background:${PAINT[c]?.hex || c}"></span>`;
export function stepsOf(obj) {
  return obj.order.map((layer) => ({
    layer,
    title: obj.stepTitles?.[layer] || LAYER_NAMES[layer],
    dry: obj.dry?.[layer] || 0,
    tip: obj.tips?.[layer] || '',
  }));
}
const LAYER_TEXT = {
  outline: 'Олівцем — лінії, пензлем — краї.',
  base: 'Великі площини, тонким шаром.',
  ornament: 'Від центру — до променів.',
  fine: 'Крапочки: пензлик вертикально.',
  gold: 'Золото — завжди фінал.',
};

/* ---------- зум і панорамування (через viewBox) ---------- */
const FULL = VIEWS.full;
const zoom = { base: VIEWS.star, vb: [...VIEWS.star] };
function svgEl() { return stageEl.querySelector('svg'); }
function applyVB() { svgEl()?.setAttribute('viewBox', zoom.vb.map((v) => v.toFixed(2)).join(' ')); }
export function focusObject(which) {
  zoom.base = VIEWS[which] || VIEWS.full;
  zoom.vb = [...zoom.base];
  applyVB();
}
function zoomBy(f, cx, cy) {
  const [x, y, w, h] = zoom.vb;
  const nw = Math.min(FULL[2] * 1.05, Math.max(zoom.base[2] * 0.16, w * f));
  const k = nw / w;
  if (cx == null) { cx = x + w / 2; cy = y + h / 2; }
  zoom.vb = [cx - (cx - x) * k, cy - (cy - y) * k, w * k, h * k];
  clampVB();
  applyVB();
}
function clampVB() {
  const [x, y, w, h] = zoom.vb;
  const cx = Math.min(FULL[2], Math.max(0, x + w / 2));
  const cy = Math.min(FULL[3], Math.max(0, y + h / 2));
  zoom.vb = [cx - w / 2, cy - h / 2, w, h];
}
function toSvg(px, py) {
  const r = stageEl.getBoundingClientRect();
  const [x, y, w, h] = zoom.vb;
  const s = Math.max(w / r.width, h / r.height);
  const ox = (r.width * s - w) / 2, oy = (r.height * s - h) / 2;
  return { x: x + (px - r.left) * s - ox, y: y + (py - r.top) * s - oy, s };
}

const ptrs = new Map();
let gesture = null;
stageEl.addEventListener('pointerdown', (e) => {
  stageEl.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) gesture = { moved: false, sx: e.clientX, sy: e.clientY, slot: e.target.closest?.('[data-slot]')?.dataset.slot, vb: [...zoom.vb] };
  else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    gesture = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), vb: [...zoom.vb], moved: true };
  }
});
stageEl.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId) || !gesture) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gesture.pinch && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
    zoom.vb = [...gesture.vb];
    zoomBy(gesture.d / d, mid.x, mid.y);
    return;
  }
  const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
  if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
  gesture.moved = true;
  if (zoom.vb[2] >= zoom.base[2] * 0.999) return; // на базовому масштабі не тягаємо
  const { s } = toSvg(0, 0);
  zoom.vb = [gesture.vb[0] - dx * s, gesture.vb[1] - dy * s, zoom.vb[2], zoom.vb[3]];
  clampVB();
  applyVB();
});
const endPtr = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (gesture && !gesture.moved && !gesture.pinch && e.type === 'pointerup' && gesture.slot && state.mode === 'create') selectSlot(gesture.slot);
  if (ptrs.size === 0) gesture = null;
};
stageEl.addEventListener('pointerup', endPtr);
stageEl.addEventListener('pointercancel', endPtr);
stageEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = toSvg(e.clientX, e.clientY);
  zoomBy(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
}, { passive: false });
document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
  const z = b.dataset.zoom;
  if (z === 'reset') { zoom.vb = [...(zoom.vb[2] < zoom.base[2] * 0.99 ? zoom.base : FULL)]; applyVB(); }
  else zoomBy(z === 'in' ? 1 / 1.4 : 1.4);
}));

/* ---------- дії ---------- */
function selectSlot(slot) {
  set({ selected: { ...state.selected, [state.object]: slot } });
}
function applyPaint(colorId) {
  const which = state.object;
  const slot = state.selected[which];
  if (!slot) return;
  if (which === 'village') set({ village: { ...state.village, colors: { ...state.village.colors, [slot]: colorId } } });
  else set({ star: { ...state.star, preset: null, colors: { ...state.star.colors, [slot]: colorId } } });
}
function chooseDesign(id) {
  const d = DESIGN[id];
  const preset = state.star.preset || 'classic';
  const firstOrn = d.elements.find((e) => e.layer === 'ornament')?.slot || Object.keys(d.slots)[0];
  set({ level: d.level, star: { designId: id, preset, colors: presetColors(d, preset) }, selected: { ...state.selected, star: firstOrn }, paint: { ...state.paint, step: -1, dry: null } });
}
function startDry(minutes) {
  set({ paint: { ...state.paint, dry: { endsAt: Date.now() + minutes * 60000, total: minutes } } });
}
function gotoStep(i) {
  const n = stepsOf(objOf(state.object)).length;
  set({ paint: { ...state.paint, step: Math.max(-1, Math.min(n, i)), dry: null } });
  if (i >= 0 && i < n) toast(`Крок ${i + 1}: ${stepsOf(objOf(state.object))[i].title}`);
}
function nextStep() {
  const steps = stepsOf(objOf(state.object));
  const i = state.paint.step;
  if (state.paint.dry) return gotoStep(i + 1); // пропуск очікування
  if (i >= 0 && i < steps.length && steps[i].dry > 0) return startDry(steps[i].dry);
  if (i >= steps.length) return finishCb();
  gotoStep(i + 1);
}

/* таймер висихання */
setInterval(() => {
  const dry = state.paint.dry;
  if (!dry) return;
  const left = Math.max(0, dry.endsAt - Date.now());
  const el = document.getElementById('dryClock');
  if (el) el.textContent = fmt(left);
  if (left <= 0) { toast('Фарба висохла — можна продовжувати!'); gotoStep(state.paint.step + 1); }
}, 1000);
const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/* ---------- рендер ---------- */
function layersAt(obj, step) {
  return new Set(stepsOf(obj).slice(0, step + 1).map((s) => s.layer));
}
/** які шари видно зараз (для 3D): у режимі «крок за кроком» — лише вже розписані */
export function visibleLayers() {
  if (state.mode !== 'paint') return {};
  const obj = objOf(state.object);
  const step = state.paint.step;
  const layers = step >= stepsOf(obj).length ? null : layersAt(obj, step);
  return { [state.object + 'Layers']: layers };
}

function renderStage() {
  const paintMode = state.mode === 'paint';
  const which = state.object;
  const opts = { idp: 'st', interactive: paintMode ? null : which, selected: state.selected[which], view: zoom.vb };
  if (paintMode) {
    const obj = objOf(which);
    const step = state.paint.step;
    const steps = stepsOf(obj);
    const layers = step >= steps.length ? null : layersAt(obj, step);
    const focus = step >= 0 && step < steps.length ? new Set([steps[step].layer]) : null;
    opts.guidesFor = state.paint.guides && step < steps.length ? which : null;
    opts[which + 'Layers'] = layers || null;
    opts.focus = { [which]: focus };
    opts.dim = which;
  }
  stageEl.innerHTML = compose(state, opts);
  applyVB();
}

function renderChip() {
  if (state.mode === 'create') {
    const obj = objOf(state.object);
    const slot = state.selected[state.object];
    chipEl.textContent = slot ? `✎ ${obj.slots[slot]?.label || ''}` : '';
  } else {
    const steps = stepsOf(objOf(state.object));
    const i = state.paint.step;
    chipEl.textContent = i < 0 ? 'Чиста заготовка' : i >= steps.length ? '✓ Розпис завершено' : `Крок ${i + 1} · ${steps[i].title}`;
  }
}

function renderDock() {
  if (state.mode === 'create') {
    const obj = objOf(state.object);
    const slot = state.selected[state.object];
    const cur = colorsOf(state.object)[slot];
    const count = obj.elements.filter((e) => e.slot === slot).reduce((a, e) => a + repCount(e.rep), 0);
    dockEl.innerHTML = `<p class="dock-label"><span>Фарбуємо: <b>${obj.slots[slot]?.label || '—'}</b></span><span>${count > 1 ? `${count} елем.` : ''}</span></p>
      <div class="palette" role="group" aria-label="Фарби набору">${PAINTS.map((p) => `
        <button class="pot pot-${p.id} ${cur === p.id ? 'is-on' : ''}" data-paint="${p.id}" aria-label="${p.name}">
          <span class="pot-jar"><span class="pot-paint" style="background:${p.hex}"></span></span>${p.name}</button>`).join('')}</div>`;
    return;
  }
  const steps = stepsOf(objOf(state.object));
  const i = state.paint.step;
  const dry = state.paint.dry;
  let next = 'Наступний крок →';
  if (i < 0) next = 'Почати розпис';
  else if (dry) next = 'Пропустити ⏭';
  else if (i === steps.length - 1) next = 'Завершити ✓';
  else if (i >= steps.length) next = 'Зберегти зірку';
  const mid = i < 0 ? `<b>Підготовка</b>${steps.length} кроки` : i >= steps.length ? '<b>Готово!</b>усі кроки' : `<b>Крок ${i + 1} з ${steps.length}</b>${steps[i].title}`;
  dockEl.innerHTML = `<div class="nav-steps">
    <button class="btn btn-ghost" data-step="prev" ${i < 0 ? 'disabled' : ''}>← Назад</button>
    <div class="mid">${mid}</div>
    <button class="btn btn-gold" data-step="next">${next}</button></div>`;
}

function designCard(d) {
  const on = d.id === state.star.designId;
  const colors = on ? state.star.colors : presetColors(d, state.star.preset || 'classic');
  return `<button class="card ${on ? 'is-on' : ''}" data-design="${d.id}">${starOnly(d.id, colors, { idp: 'th-' + d.id, bare: false })}<b>${d.title}</b>${d.origin ? `<small>${d.origin}</small>` : ''}</button>`;
}
function villageThumb(colors, idp) {
  const body = renderObject(VILLAGE, { idp, colors, zone: 'back' }) + renderObject(VILLAGE, { idp, colors, zone: 'front' });
  return `<svg class="thumb-v" viewBox="0 24 220 130">${defs(idp)}${body}</svg>`;
}
function slotChips(which) {
  const obj = objOf(which);
  const colors = colorsOf(which);
  return `<div class="chips">${Object.entries(obj.slots).map(([k, v]) => `
    <button class="chip ${state.selected[which] === k ? 'is-on' : ''}" data-slot-pick="${k}">${swatch(colors[k] || v.def)}${v.label}</button>`).join('')}</div>`;
}

function renderCreatePanel() {
  if (state.object === 'village') {
    panelEl.innerHTML = `
      <div class="box"><h3>Моє різдвяне село</h3><p class="sub">Обери настрій села</p>
        <div class="cards">${VILLAGE_VARIANTS.map((v) => `<button class="card ${state.village.variantId === v.id ? 'is-on' : ''}" data-variant="${v.id}">${villageThumb(v.colors, 'vt-' + v.id)}<b>${v.title}</b><small>${v.blurb}</small></button>`).join('')}</div></div>
      <div class="box"><h3>Що розфарбовуємо</h3><p class="sub">Торкнись деталі, потім фарби</p>${slotChips('village')}</div>
      <div class="box row"><button class="btn btn-ghost" data-object-go="star">← До зірки</button><button class="btn btn-gold" data-finish>Готово — зберегти</button></div>`;
    return;
  }
  const d = DESIGN[state.star.designId];
  panelEl.innerHTML = `
    <div class="box"><h3>Обери орнамент</h3><p class="sub">${LEVELS[state.level - 1].sub}</p>
      <div class="levels">${LEVELS.map((l) => `<button class="${state.level === l.id ? 'is-on' : ''}" data-level="${l.id}"><b>Рівень ${l.id}</b>${l.title}</button>`).join('')}</div>
      <div class="cards">${DESIGNS.filter((x) => x.level === state.level).map(designCard).join('')}</div>
      <p class="tip">${d.title}: ${d.blurb}</p></div>
    <div class="box"><h3>Готові поєднання</h3><p class="sub">5 фарб — різний настрій</p>
      <div class="chips">${PRESETS.map((p) => `<button class="chip plain ${state.star.preset === p.id ? 'is-on' : ''}" data-preset="${p.id}">${p.title}</button>`).join('')}</div></div>
    <div class="box"><h3>Що розфарбовуємо</h3><p class="sub">Торкнись деталі, потім фарби</p>${slotChips('star')}</div>
    <div class="box row"><button class="btn btn-ghost" data-mode-go="paint">Розфарбувати крок за кроком</button><button class="btn btn-gold" data-finish>Готово — зберегти</button></div>`;
}

function paintsNeeded(obj, colors) {
  const by = new Map();
  for (const e of obj.elements) {
    const c = colors[e.slot] || obj.slots[e.slot].def;
    if (!by.has(c)) by.set(c, new Set());
    by.get(c).add(obj.slots[e.slot].label);
  }
  return [...by.entries()];
}

function renderPaintPanel() {
  const which = state.object;
  const obj = objOf(which);
  const colors = colorsOf(which);
  const steps = stepsOf(obj);
  const i = state.paint.step;
  const name = which === 'village' ? 'Моє різдвяне село' : `зірка «${obj.title}»`;
  const bar = `<div class="steps-bar">${steps.map((_, k) => `<span class="${k < i ? 'done' : k === i ? 'now' : ''}"></span>`).join('')}</div>`;
  const guides = `<label class="toggle"><input type="checkbox" data-guides ${state.paint.guides ? 'checked' : ''}> Показати допоміжні контури <small class="tiny">(олівцем)</small></label>`;

  if (i < 0) {
    const totalDry = steps.reduce((a, s) => a + s.dry, 0);
    const order = steps.map((s, k) => `${k + 1}. ${s.title}${s.dry ? ` <small>(+${s.dry} хв сохне)</small>` : ''}`).join('<br>');
    panelEl.innerHTML = `
      <div class="box"><p class="eyebrow">Режим Б · крок за кроком</p><h3>Розписуємо: ${name}</h3>
        <p class="sub">Крок за кроком, з таймером</p>
        <p class="tip">${order}</p>
        <ul class="need">${paintsNeeded(obj, colors).map(([c, labels]) => `<li>${swatch(c)}<span><b>${PAINT[c].name}</b> — ${[...labels].slice(0, 3).join(', ')}${labels.size > 3 ? '…' : ''}</span></li>`).join('')}</ul>
        <p class="sub" style="margin-top:12px">Візьми воду й серветку · ~${30 + steps.length * 10 + totalDry} хв</p>
        <div class="row" style="margin-top:6px"><button class="btn btn-gold" data-step="next">Почати розпис</button>${which === 'star' ? `<button class="btn btn-ghost" data-mode-go="create">Змінити орнамент</button>` : ''}</div>
      </div>
      <div class="box">${guides}</div>`;
    return;
  }
  if (i >= steps.length) {
    panelEl.innerHTML = `<div class="box">${bar}<p class="eyebrow">Готово</p><h3>Ти розписала(-в) ${which === 'village' ? 'своє село' : 'свою зірку'}! ✨</h3>
      <p class="sub">Дай висохнути 1–2 години</p>
      <div class="row"><button class="btn btn-gold" data-finish>Зберегти картинку</button>${which === 'star' ? `<button class="btn btn-ghost" data-object-go="village">Розписати село</button>` : `<button class="btn btn-ghost" data-object-go="star">До зірки</button>`}<button class="btn btn-ghost" data-step-go="-1">Почати знову</button></div></div>`;
    return;
  }
  const s = steps[i];
  const need = slotsInLayers(obj, new Set([s.layer]));
  const dry = state.paint.dry;
  const dryBox = dry ? `<div class="dry"><svg class="dry-drop" viewBox="0 0 24 24"><path d="M12 2C9 7 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-4-8-7-13Z" fill="#d4af37"/></svg>
      <p class="eyebrow" style="margin:6px 0 0">Фарба сохне</p><div class="clock" id="dryClock">${fmt(dry.endsAt - Date.now())}</div>
      <p class="sub">Чекаємо — і слухаємо колядки 🎶</p>
      <div class="row"><button class="btn btn-ghost" data-step="next">Вже висохло — далі</button></div></div>` : '';
  panelEl.innerHTML = `
    <div class="box">${bar}
      <div class="step-head"><span class="step-num">${i + 1}</span><div><p class="eyebrow" style="margin:0">Крок ${i + 1} з ${steps.length}</p><h3>${s.title}</h3></div></div>
      <p class="sub" style="margin-top:8px">${LAYER_TEXT[s.layer]}</p>
      ${s.tip ? `<p class="tip">💡 ${s.tip}</p>` : ''}
      <ul class="need">${need.map(({ slot, count }) => { const c = colors[slot] || obj.slots[slot].def; return `<li>${swatch(c)}<span><b>${PAINT[c].name}</b> · ${obj.slots[slot].label}</span><small>×${count}</small></li>`; }).join('')}</ul>
      ${s.dry && !dry ? `<p class="sub" style="margin:10px 0 0">⏳ Після цього кроку — ${s.dry} хв на висихання.</p>` : ''}
    </div>
    ${dryBox}
    <div class="box" style="display:grid;gap:10px">${guides}<p class="tiny" style="margin:0">Дрібне — збільшуй «+»</p></div>`;
}

export function renderWorkshop() {
  document.querySelectorAll('[data-object]').forEach((b) => b.classList.toggle('is-on', b.dataset.object === state.object));
  document.querySelectorAll('.ws-bar [data-mode]').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === state.mode));
  renderStage();
  renderChip();
  renderDock();
  if (state.mode === 'create') renderCreatePanel();
  else renderPaintPanel();
}

/* ---------- події панелі та доку ---------- */
function onClick(e) {
  const t = e.target.closest('button, input');
  if (!t) return;
  const ds = t.dataset;
  if (ds.paint) return applyPaint(ds.paint);
  if (ds.design) return chooseDesign(ds.design);
  if (ds.level) return set({ level: +ds.level });
  if (ds.preset) { const d = DESIGN[state.star.designId]; return set({ star: { ...state.star, preset: ds.preset, colors: presetColors(d, ds.preset) } }); }
  if (ds.slotPick) return selectSlot(ds.slotPick);
  if (ds.variant) { const v = VILLAGE_VARIANTS.find((x) => x.id === ds.variant); return set({ village: { variantId: v.id, colors: { ...v.colors } } }); }
  if (ds.step === 'next') return nextStep();
  if (ds.step === 'prev') return gotoStep(state.paint.step - 1);
  if (ds.stepGo) return gotoStep(+ds.stepGo);
  if ('guides' in ds) return set({ paint: { ...state.paint, guides: t.checked } });
  if (ds.modeGo) return setMode(ds.modeGo);
  if (ds.objectGo) return setObject(ds.objectGo);
  if ('finish' in ds) return finishCb();
}
panelEl.addEventListener('click', onClick);
dockEl.addEventListener('click', onClick);

export function setMode(mode) {
  set({ mode, paint: { ...state.paint, step: -1, dry: null } });
}
export function setObject(object) {
  set({ object, paint: { ...state.paint, step: -1, dry: null } });
  focusObject(object);
  renderWorkshop();
}
