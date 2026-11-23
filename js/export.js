/* «Зберегти для сторіз» — PNG 1080×1920 (9:16). */
import { BRAND } from './config.js';
import { compose } from './compose.js';
import { DESIGN } from './ornaments.js';

function svgToImage(svg, w, h) {
  const sized = svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml;charset=utf-8' }));
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Картинка для сторіз 1080×1920 (9:16): тепла ніч, світло свічки, зірка по центру, бренд і хештег */
export async function renderPNG(state) {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1c120e'); g.addColorStop(0.6, '#110c0a'); g.addColorStop(1, '#170d0b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // світло свічки знизу + ледь бордовий відблиск
  const glow = (x, y, r, col) => { const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); };
  glow(W / 2, 1060, 760, 'rgba(230,184,92,.20)');
  glow(W / 2, H + 120, 900, 'rgba(140,35,35,.35)');
  // золоті іскри (детерміновано — однаково щоразу)
  for (let i = 0; i < 90; i++) {
    const x = (i * 241) % W, y = (i * 157 + 40) % H, r = 1.2 + (i % 4) * 0.8;
    ctx.globalAlpha = 0.18 + ((i * 37) % 50) / 120;
    ctx.fillStyle = i % 3 ? '#e6b85c' : '#f5efe6';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  try { await document.fonts?.ready; } catch { /* ignore */ }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e6b85c';
  ctx.font = '800 26px Manrope, system-ui, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText(BRAND.name.toUpperCase(), W / 2, 190);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#f5efe6';
  ctx.font = '600 92px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Моя різдвяна зірка', W / 2, 300);

  const cw = 940, ch = Math.round((940 * 430) / 400), cx = (W - cw) / 2, cy = 380;
  const img = await svgToImage(compose(state, { idp: 'ex' }), cw, ch);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  roundRect(ctx, cx, cy, cw, ch, 44); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  ctx.save(); roundRect(ctx, cx, cy, cw, ch, 44); ctx.clip(); ctx.drawImage(img, cx, cy, cw, ch); ctx.restore();
  ctx.strokeStyle = 'rgba(230,184,92,.6)'; ctx.lineWidth = 3; roundRect(ctx, cx, cy, cw, ch, 44); ctx.stroke();

  const d = DESIGN[state.star.designId];
  ctx.font = '600 40px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#f5efe6';
  ctx.fillText(`«${d.title}»`, W / 2, cy + ch + 96);
  ctx.font = '500 30px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#ddd1c1';
  ctx.fillText('розписала власноруч · 5 фарб набору', W / 2, cy + ch + 150);
  ctx.font = '800 54px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#e6b85c';
  ctx.fillText(BRAND.hashtag, W / 2, H - 230);
  ctx.font = '600 28px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#ddd1c1';
  ctx.fillText(`${BRAND.name} · ${BRAND.product}`, W / 2, H - 170);

  return new Promise((res) => c.toBlob(res, 'image/png'));
}

export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
