/* Простий стан застосунку + збереження вибору в localStorage (якщо дозволено). */
import { DESIGN, DESIGNS, presetColors } from './ornaments.js';
import { VILLAGE } from './village.js';

const KEY = 'lava-star-v3'; // v3: одна справжня різьба зірки, ідеї — поєднання фарб
const listeners = new Set();

function defaults() {
  const d = DESIGNS[0];
  return {
    view: 'showcase',
    object: 'star',
    mode: 'create',
    level: d.level,
    star: { designId: d.id, preset: 'classic', colors: presetColors(d, 'classic') },
    village: { variantId: 'bare', colors: Object.fromEntries(Object.keys(VILLAGE.slots).map((k) => [k, 'white'])) },
    selected: { star: 'edge', village: 'walls' },
    paint: { step: -1, guides: true, dry: null, target: 'star' },
    look: 'painted',
  };
}

function load() {
  const s = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return s;
    const saved = JSON.parse(raw);
    if (saved.star && DESIGN[saved.star.designId]) {
      const d = DESIGN[saved.star.designId];
      s.star = { ...s.star, ...saved.star, colors: { ...presetColors(d, 'classic'), ...saved.star.colors } };
      s.level = d.level;
      s.selected.star = Object.keys(d.slots)[0];
    }
    if (saved.village?.colors) s.village = { ...s.village, colors: { ...s.village.colors, ...saved.village.colors } };
  } catch { /* приватний режим — просто без збереження */ }
  return s;
}

export const state = load();

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ star: state.star, village: state.village })); } catch { /* ignore */ }
}

export function set(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  persist();
  for (const fn of listeners) fn(state);
}
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
