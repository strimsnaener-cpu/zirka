/* Атмосферний плеєр. Звук — лише після кліку (політики мобільних браузерів).
   Спершу пробує ваш .mp3 з config.PLAYLIST; якщо файлу немає — грає синтезовану
   «музичну скриньку» (заглушка), щоб плеєр працював одразу. */
import { PLAYLIST } from './config.js';

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h10v2H4z"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3z"/></svg>',
};

/* ---------- синтезатор-заглушка ---------- */
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const PROG = { major: [0, 4, 5, 3], minor: [0, 5, 2, 6] };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

class MusicBox {
  constructor(ctx, out) { this.ctx = ctx; this.out = out; this.timer = null; }
  start(cfg) {
    this.stop();
    const rnd = mulberry(cfg.seed);
    const scale = SCALES[cfg.mode];
    const deg = (d) => cfg.root + Math.floor(d / 7) * 12 + scale[((d % 7) + 7) % 7];
    // мотив із 8 нот, що повторюється з варіаціями (AABA) — так звучить «мелодійно»
    const motif = []; let d = 4;
    for (let i = 0; i < 8; i++) { d = Math.max(0, Math.min(9, d + Math.round((rnd() - 0.5) * 4))); motif.push(rnd() < 0.18 ? null : d); }
    const variant = motif.map((x, i) => (x == null || i % 3 ? x : x + (rnd() < 0.5 ? 2 : -1)));
    const beat = 60 / cfg.bpm / 2; // восьмі
    let step = 0, t = this.ctx.currentTime + 0.1;
    const tick = () => {
      while (t < this.ctx.currentTime + 0.6) {
        const bar = Math.floor(step / 8), pos = step % 8;
        const phrase = [motif, motif, variant, motif][bar % 4];
        const chordRoot = PROG[cfg.mode][bar % 4];
        if (pos === 0) {
          this.pad([chordRoot, chordRoot + 2, chordRoot + 4].map((x) => deg(x) - 12), t, beat * 8);
          this.bell(deg(chordRoot) - 24, t, 0.09, 2.6);
        }
        const note = phrase[pos];
        if (note != null) this.bell(deg(note), t, 0.11, 1.7);
        if (pos === 4 && rnd() < 0.5) this.bell(deg(note ?? 4) + 12, t + beat / 2, 0.04, 1.2);
        step++; t += beat;
      }
    };
    tick();
    this.timer = setInterval(tick, 120);
  }
  bell(m, t, vol, dur) {
    const { ctx } = this;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out);
    [[1, 1], [2.0, 0.35], [3.01, 0.12]].forEach(([r, a]) => {
      const o = ctx.createOscillator(); const og = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(m) * r; og.gain.value = a;
      o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  pad(notes, t, dur) {
    const { ctx } = this;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.022, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    g.connect(f).connect(this.out);
    for (const m of notes) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.connect(g); o.start(t); o.stop(t + dur * 1.1); }
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}

/* ---------- плеєр ---------- */
export function initPlayer(root, { onChange } = {}) {
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.55;
  let ctx = null, box = null, master = null;
  let idx = 0, playing = false, started = false, usingSynth = false, listOpen = false;
  const missing = new Set();

  function ensureCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    box = new MusicBox(ctx, master);
  }

  async function playCurrent() {
    const tr = PLAYLIST[idx];
    box?.stop(); audio.pause();
    usingSynth = false;
    if (!missing.has(idx)) {
      try {
        if (!audio.src.endsWith(tr.src)) audio.src = tr.src;
        await audio.play();
        playing = true; render(); return;
      } catch (err) {
        if (err?.name === 'NotAllowedError') { playing = false; render(); return; }
        missing.add(idx);
      }
    }
    if (box) { usingSynth = true; box.start(tr.synth); playing = true; }
    render();
  }
  function pause() { audio.pause(); box?.stop(); playing = false; render(); }
  function go(d) { idx = (idx + d + PLAYLIST.length) % PLAYLIST.length; audio.removeAttribute('src'); if (playing) playCurrent(); else render(); }
  audio.addEventListener('ended', () => go(1));

  function render() {
    const tr = PLAYLIST[idx];
    root.classList.toggle('is-idle', !started);
    onChange?.(playing, started);
    if (!started) {
      root.innerHTML = `<button class="play" aria-label="Увімкнути музику">${ICON.note}</button><div class="meta"><b>Увімкнути різдвяний настрій</b><small>колядки та щедрівки</small></div>`;
      return;
    }
    const sub = usingSynth ? `${tr.note} · демо-звучання (додайте mp3)` : tr.note;
    root.innerHTML = `
      <button class="play" data-p="toggle" aria-label="${playing ? 'Пауза' : 'Грати'}">${playing ? ICON.pause : ICON.play}</button>
      <div class="meta"><b>${tr.title}</b><small>${sub}</small></div>
      ${playing ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}
      <button class="pbtn" data-p="prev" aria-label="Попередній">${ICON.prev}</button>
      <button class="pbtn" data-p="next" aria-label="Наступний">${ICON.next}</button>
      <button class="pbtn" data-p="list" aria-label="Плейлист" aria-expanded="${listOpen}">${ICON.list}</button>
      ${listOpen ? `<div class="player-list">${PLAYLIST.map((t, i) => `<button data-p="pick" data-i="${i}" class="${i === idx ? 'is-on' : ''}"><span>${t.title}</span><small>${t.note}</small></button>`).join('')}</div>` : ''}`;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!started) { started = true; ensureCtx(); playCurrent(); return; }
    if (!b) return;
    ensureCtx();
    const a = b.dataset.p;
    if (a === 'toggle') playing ? pause() : playCurrent();
    if (a === 'prev') go(-1);
    if (a === 'next') go(1);
    if (a === 'list') { listOpen = !listOpen; render(); }
    if (a === 'pick') { idx = +b.dataset.i; listOpen = false; audio.removeAttribute('src'); playCurrent(); }
  });
  render();
  return {
    toggle() {
      ensureCtx();
      if (!started) { started = true; playCurrent(); return; }
      playing ? pause() : playCurrent();
    },
  };
}
