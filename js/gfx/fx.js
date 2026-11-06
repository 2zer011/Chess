// Pixel particles (2 layers), rings, flashes, floating text, limited screen shake, hit-stop, ambient dust.
import { W, H } from '../art/palette.js';
import { rect, BAYER, mk } from './pixel.js';
import { text } from '../art/font.js';

export const fx = {
  parts: [], floats: [], rings: [], flashes: [], motes: [],
  shakeAmp: 0, ox: 0, oy: 0, hit: 0, q: 1, on: { shake: true, ambient: true },
};
const CAP = 220; // particle budget for low-end phones

export function reset() { fx.parts.length = 0; fx.floats.length = 0; fx.rings.length = 0; fx.flashes.length = 0; fx.shakeAmp = 0; fx.hit = 0; }

const add = p => { if (fx.parts.length < CAP) fx.parts.push(p); };
// z: 0 = under sprites (dust, ground), 1 = over sprites
export function burst(x, y, n, cols, o = {}) {
  const { spd = 45, life = 0.5, g = 90, up = 0, z = 1 } = o;
  n = Math.max(1, Math.round(n * fx.q));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = spd * (0.3 + Math.random() * 0.7), l = life * (0.6 + Math.random() * 0.6);
    add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, g, life: l, max: l, col: cols[i % cols.length], z });
  }
}
export const spark = (x, y, vx, vy, col, life = 0.4, g = 0, z = 1) => add({ x, y, vx, vy, g, life, max: life, col, z });
// particle that flies from (x,y) to (tx,ty) and lands exactly there (pixel gather)
export const fly = (x, y, tx, ty, col, life) => add({ x, y, sx: x, sy: y, tx, ty, vx: 0, vy: 0, g: 0, life, max: life, col, z: 1 });
export const ring = (x, y, r, life, col, z = 1) => fx.rings.push({ x, y, r, t: 0, life, col, z });
export const flash = (x, y, r, life) => fx.flashes.push({ x, y, r, t: 0, life });
export const hitstop = s => { fx.hit = Math.max(fx.hit, s); };
export const shake = a => { if (fx.on.shake) fx.shakeAmp = Math.max(fx.shakeAmp, Math.min(a, 4)); };
export const floatText = (x, y, s, col = '5') => fx.floats.push({ x, y, s, col, t: 0 });

export function update(dt) {
  for (const p of fx.parts) {
    p.life -= dt;
    if (p.tx !== undefined) { const k = 1 - Math.max(0, p.life) / p.max, e = k * k; p.x = p.sx + (p.tx - p.sx) * e; p.y = p.sy + (p.ty - p.sy) * e; }
    else { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  if (fx.parts.length) fx.parts = fx.parts.filter(p => p.life > 0);
  for (const f of fx.floats) { f.t += dt; f.y -= dt * 12; }
  fx.floats = fx.floats.filter(f => f.t < 0.9);
  for (const r of fx.rings) r.t += dt;
  fx.rings = fx.rings.filter(r => r.t < r.life);
  for (const f of fx.flashes) f.t += dt;
  fx.flashes = fx.flashes.filter(f => f.t < f.life);
  fx.shakeAmp = Math.max(0, fx.shakeAmp - dt * 20); // short decay: never a constant rumble
  fx.ox = fx.shakeAmp > 0.3 ? Math.round((Math.random() * 2 - 1) * fx.shakeAmp) : 0;
  fx.oy = fx.shakeAmp > 0.3 ? Math.round((Math.random() * 2 - 1) * fx.shakeAmp) : 0;
  if (!fx.motes.length) for (let i = 0; i < 22; i++) fx.motes.push({ x: Math.random() * W, y: Math.random() * H, vy: -(2 + Math.random() * 5), vx: Math.random() * 3 - 1.5, k: i % 3 ? '2' : '3' });
  for (const m of fx.motes) { m.y += m.vy * dt; m.x += m.vx * dt; if (m.y < -2) { m.y = H + 2; m.x = Math.random() * W; } }
}

function disc(c, x, y, r, k) {
  c.fillStyle = k === 'w' ? '#f2f5ff' : '#cfd7f0';
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); c.fillRect(Math.round(x) - w, Math.round(y) + dy, 2 * w + 1, 1); }
}

// layer 0 = ground effects (under sprites), layer 1 = everything above sprites
export function drawLayer(c, z) {
  for (const p of fx.parts) {
    if (p.z !== z) continue;
    if (p.life < p.max * 0.25 && ((p.life * 40) | 0) % 2) continue; // fade by blinking
    rect(c, p.x, p.y, 1, 1, p.col);
  }
  for (const r of fx.rings) {
    if (r.z !== z) continue;
    const k = r.t / r.life, rr = r.r * (1 - (1 - k) * (1 - k));
    c.fillStyle = k > 0.6 ? '#7f90c0' : r.col === 'w' ? '#f2f5ff' : '#cfd7f0';
    const n = Math.max(10, Math.round(rr * 5));
    for (let i = 0; i < n; i++) { const a = i / n * 6.283; c.fillRect(Math.round(r.x + Math.cos(a) * rr), Math.round(r.y + Math.sin(a) * rr * 0.75), 1, 1); }
  }
  if (z === 1) {
    for (const f of fx.flashes) { // bright core first, then a thin ring: never a solid blob over the pieces
      const k = f.t / f.life;
      if (k < 0.45) disc(c, f.x, f.y, Math.max(1, Math.round(f.r * 0.6)), 'w');
      else { c.fillStyle = '#cfd7f0'; const r = f.r, n = Math.round(r * 6); for (let i = 0; i < n; i++) { const a = i / n * 6.283; c.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 1, 1); } }
    }
    for (const f of fx.floats) text(c, f.s, f.x, f.y, f.col, { align: 'c', shadow: '0' });
  }
}
export function drawParticles(c) { drawLayer(c, 0); drawLayer(c, 1); }

export function drawMotes(c) {
  if (!fx.on.ambient) return;
  for (const m of fx.motes) rect(c, m.x, m.y, 1, 1, m.k);
}

function dither(level, k) {
  const cv = mk(W, H), c = cv.getContext('2d');
  c.fillStyle = k;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < level) c.fillRect(x, y, 1, 1);
  return cv;
}
let OV;
export function overlays() {
  if (OV) return OV;
  const vig = mk(W, H), v = vig.getContext('2d');
  v.fillStyle = '#0a0c12';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
    if (BAYER[(y & 3) * 4 + (x & 3)] < Math.max(0, Math.min(16, (d - 0.62) * 34))) v.fillRect(x, y, 1, 1);
  }
  OV = { vig, red: dither(5, '#7c2433'), dark: dither(13, '#0a0c12'), floor: dither(3, '#161a29') };
  return OV;
}
