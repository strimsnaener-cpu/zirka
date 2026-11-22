/* «Зберегти мою зірку» — PNG 1080×1350 (формат постів/сторіз). */
import { BRAND } from './config.js';
import { compose, variantOf } from './compose.js';
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

export async function renderPNG(state) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12284a'); g.addColorStop(0.55, '#0a1424'); g.addColorStop(1, '#0d2a23');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.25 + ((i * 37) % 50) / 100;
    ctx.fillStyle = i % 5 ? '#ffffff' : '#f2d97c';
    ctx.beginPath(); ctx.arc((i * 241) % W, (i * 157) % H, 1 + (i % 3) * 0.7, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const cw = 960, ch = Math.round((960 * 430) / 400), cx = 60, cy = 168;
  const img = await svgToImage(compose(state, { idp: 'ex' }), cw, ch);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  roundRect(ctx, cx, cy, cw, ch, 38); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  ctx.save(); roundRect(ctx, cx, cy, cw, ch, 38); ctx.clip(); ctx.drawImage(img, cx, cy, cw, ch); ctx.restore();
  ctx.strokeStyle = 'rgba(232,208,150,.45)'; ctx.lineWidth = 2; roundRect(ctx, cx, cy, cw, ch, 38); ctx.stroke();

  try { await document.fonts?.ready; } catch { /* ignore */ }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4af37';
  ctx.font = '600 22px Manrope, system-ui, sans-serif';
  ctx.fillText('LAVA CANDLES · РІЗДВЯНА МАЙСТЕРНЯ', W / 2, 70);
  ctx.fillStyle = '#f5efe0';
  ctx.font = '600 70px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Моя різдвяна зірка', W / 2, 138);

  const d = DESIGN[state.star.designId];
  ctx.font = '500 30px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#d9d2bf';
  ctx.fillText(`«${d.title}» · ${variantOf(state.village.variantId).title}`, W / 2, cy + ch + 62);
  ctx.font = '600 26px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#f2d97c';
  ctx.fillText(`${BRAND.name} · ${BRAND.product} · ${BRAND.hashtag}`, W / 2, cy + ch + 110);

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
