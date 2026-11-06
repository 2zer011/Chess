// Sprite registry + per-character procedural animation (idle / move / capture / ability),
// portraits, collection icons and unlock art. All drawing is pixel-aligned canvas code.
import { TILE } from '../art/palette.js';
import { SPRITES } from '../art/sprites-data.js';
import { ICONS } from '../art/icons.js';
import { panel } from './pixel.js';
import { mk, parseAscii, bake, silhouette, ditherSil, rect, px, ringPx, line, hash, BAYER } from './pixel.js';

export const SPR = {}, ICO = {};
const TINT = {};
export const CHARS = ['void', 'error', 'time', 'space', 'blackhole', 'parasite'];

export function initSprites() {
  for (const [k, d] of Object.entries(SPRITES)) {
    const cv = bake(parseAscii(d.rows, d.mirror));
    SPR[k] = { cv, white: silhouette(cv, '#f2f5ff') };
  }
  for (const [k, rows] of Object.entries(ICONS)) ICO[k] = bake(parseAscii(rows), false);
}
export const icon = (c, k, x, y) => c.drawImage(ICO[k], Math.round(x), Math.round(y));

// Sprite centered in a 20px tile at (x,y). o: dx,dy,flip,white,shear,rows(fn)
function blit(c, s, x, y, o = {}) {
  const cv = o.white ? s.white : s.cv, w = cv.width, h = cv.height;
  let X = x + ((TILE - w) >> 1) + (o.dx || 0);
  const Y = y + ((TILE - h) >> 1) + (o.dy || 0) - 1;
  if (o.flip) { c.save(); c.translate(X + w, 0); c.scale(-1, 1); X = 0; }
  if (o.shear || o.rows) {
    for (let r = 0; r < h; r++) c.drawImage(cv, 0, r, w, 1, X + (o.rows ? o.rows(r) : (r < h / 2 ? o.shear : 0)), Y + r, w, 1);
  } else c.drawImage(cv, X, Y);
  if (o.flip) c.restore();
}

// Squash/stretch + lean: render into a scratch canvas, scale about the feet, shear rows.
let T1, T2; // scratch canvases, created on first use
function xform(c, x, y, o, fn) {
  const sx = o.sx || 1, sy = o.sy || 1, lean = o.lean || 0;
  if (sx === 1 && sy === 1 && !lean) { fn(c, x, y, o); return; }
  T1 = T1 || mk(36, 36); T2 = T2 || mk(36, 36);
  const g1 = T1.getContext('2d'), g2 = T2.getContext('2d');
  g1.clearRect(0, 0, 36, 36); g2.clearRect(0, 0, 36, 36);
  fn(g1, 8, 8, { ...o, sx: 1, sy: 1, lean: 0 });
  const FX = 18, FY = 25; // feet anchor inside the scratch canvas
  g2.drawImage(T1, Math.round(FX - FX * sx), Math.round(FY - FY * sy), Math.round(36 * sx), Math.round(36 * sy));
  for (let r = 0; r < 36; r++) {
    const sh = Math.round(lean * Math.max(0, Math.min(1, (FY - r) / 17)));
    c.drawImage(T2, 0, r, 36, 1, x - 8 + sh, y - 8 + r, 36, 1);
  }
}

export const drawEnemy = (c, kind, x, y, o = {}) => xform(c, x, y, o, (g, X, Y, oo) => blit(g, SPR[kind], X, Y, oo));
export function overlayEnemy(c, kind, x, y, k, o = {}) {
  const key = kind + k;
  TINT[key] = TINT[key] || ditherSil(SPR[kind].cv, k === 'R' ? '#d8505e' : '#7f90c0', 7);
  const cv = TINT[key], X = x + ((TILE - cv.width) >> 1), Y = y + ((TILE - cv.height) >> 1) - 1 + (o.dy || 0);
  c.drawImage(cv, X, Y);
}

const bob = (t, o) => (o.still ? 0 : Math.sin(t * 3) > 0 ? -1 : 0);
const W2 = '#f2f5ff';

function discPx(c, cx, cy, rx, ry, t, front, k) {
  const pts = [];
  for (let a = 0; a < 6.283; a += 0.1) {
    if ((Math.sin(a) > 0) !== front) continue;
    pts.push([Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), (((a - t * 3) % 6.283) + 6.283) % 6.283 < 1.3]);
  }
  for (const [X, Y] of pts) rect(c, X - 1, Y - 1, 3, 3, '0');          // outline pass first,
  for (const [X, Y, bright] of pts) px(c, X, Y, k ? W2 : bright ? '5' : '4'); // so the ring stays visible
}

const CHAR = {
  void(c, x, y, t, o) {
    const b = bob(t, o);
    blit(c, SPR.void, x, y, { ...o, dy: (o.dy || 0) + b });
    if (o.white) return;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + i * 2.09;
      px(c, x + 10 + Math.round(Math.cos(a) * 9), y + 10 + Math.round(Math.sin(a) * 5) + b + (o.dy || 0), i ? '4' : '5');
    }
  },
  error(c, x, y, t, o) {
    const gl = (t % 1.4) < 0.15 || o.glitch, b = bob(t, o), n = Math.floor(t * 30);
    blit(c, SPR.error, x, y, { ...o, dy: (o.dy || 0) + b, rows: gl && !o.white ? r => Math.round((hash(r, n) - 0.5) * 5) : null });
    if (gl && !o.white) for (let i = 0; i < 2; i++) rect(c, x + 1, y + 2 + Math.floor(hash(i, n, 3) * 16), 18, 1, i ? 'R' : '5');
  },
  time(c, x, y, t, o) {
    const b = bob(t, o) + (o.dy || 0);
    blit(c, SPR.time, x, y, { ...o, dy: b });
    if (o.white) return;
    const p = (t * 0.2) % 1, L = [4, 5, 6, 7, 7, 6, 5, 4], R = [11, 10, 9, 8, 8, 9, 10, 11];
    for (let r = 4; r <= 11; r++) {
      const fill = r < 8 ? (7 - r) < (1 - p) * 4 : (11 - r) < p * 4;
      if (fill) rect(c, x + 2 + L[r - 4], y + 1 + r + b, R[r - 4] - L[r - 4] + 1, 1, '5');
    }
    px(c, x + 2 + 7 + ((t * 10) % 2 | 0), y + 1 + 8 + b, '5');
  },
  space(c, x, y, t, o) {
    const cx = x + 10, cy = y + 10 + bob(t, o) + (o.dy || 0);
    const hw = yy => Math.round(5.5 * (1 - Math.abs(yy) / 8));
    for (let yy = -8; yy <= 8; yy++) rect(c, cx - hw(yy) - 1, cy + yy, 2 * hw(yy) + 3, 1, '0');
    for (let yy = -7; yy <= 7; yy++) for (let xx = -hw(yy); xx <= hw(yy); xx++) {
      px(c, cx + xx, cy + yy, o.white ? W2 : xx === 0 ? '5' : xx < 0 ? (yy <= 0 ? '5' : '4') : (yy <= 0 ? '4' : '3'));
    }
    if (o.white) return;
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * Math.PI / 2, sx = cx + Math.round(Math.cos(a) * 9), sy = cy + Math.round(Math.sin(a) * 5);
      rect(c, sx - 1, sy - 1, 3, 3, '0'); rect(c, sx - 1, sy - 1, 2, 2, i % 2 ? '5' : '4');
    }
  },
  blackhole(c, x, y, t, o) {
    const cx = x + 10, cy = y + 10 + bob(t, o) + (o.dy || 0), w = o.white;
    discPx(c, cx, cy, 9, 3, t, false, w); discPx(c, cx, cy, 7, 2, t + 1, false, w);
    for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
      const d = xx * xx + yy * yy;
      if (d <= 17) px(c, cx + xx, cy + yy, w ? W2 : d >= 12 ? (xx + yy < 0 ? '5' : '3') : '0');
    }
    discPx(c, cx, cy, 9, 3, t, true, w); discPx(c, cx, cy, 7, 2, t + 1, true, w);
    if (!w) { const j = (t * 8 | 0) % 3; rect(c, cx, cy - 8 - j, 1, 2, '4'); rect(c, cx, cy + 7 + j, 1, 2, '4'); }
  },
  parasite(c, x, y, t, o) {
    const b = bob(t, o) + (o.dy || 0);
    blit(c, SPR.parasite, x, y, { ...o, dy: b });
    if (o.white) return;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const ax = x + 2 + (s < 0 ? 3 : 12), ay = y + 1 + 8 + i * 2 + b;
      const w = Math.round(Math.sin(t * 10 + i * 1.5 + (s > 0 ? Math.PI : 0)) * 1.5);
      line(c, ax, ay, ax + s * 3, ay - 1 + w, 'r'); line(c, ax + s * 3, ay - 1 + w, ax + s * 5, ay + 2 + w, 'R');
    }
  },
};

// Ability auras drawn on the caster; p = 0..1 progress.
const AURA = {
  void: (c, cx, cy, p) => { ringPx(c, cx, cy, p * 30, '4'); if (p < 0.6) ringPx(c, cx, cy, p * 18, '5'); },
  error: (c, cx, cy, p) => { for (let i = 0; i < 6; i++) rect(c, cx - 30 + hash(i, (p * 20) | 0) * 40, cy - 14 + i * 5, 6 + hash(i, 3, (p * 20) | 0) * 22, 1, i % 2 ? 'R' : '5'); },
  time: (c, cx, cy, p) => {
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = 11 + p * 10; px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 3 ? '4' : '5'); }
    line(c, cx, cy, cx + Math.sin(p * 12.5) * 12, cy - Math.cos(p * 12.5) * 12, '5');
  },
  space: (c, cx, cy, p) => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = 24 * (1 - p); line(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6), '5'); } },
  blackhole: (c, cx, cy, p) => { for (let k = 0; k < 26; k++) { const a = k * 0.55 + p * 9, r = (1 - p) * 36 * (k / 26) + 3; px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, k % 2 ? '4' : '5'); } },
  parasite: (c, cx, cy, p) => { for (let k = 0; k < 8; k++) px(c, cx - 10 + k * 3, cy - p * 16 - (k % 3) * 3, k % 2 ? 'R' : 'r'); },
};

let TMP;
// o: state fields + { dissolve: 0..1 }
export function drawChar(c, id, x, y, t, o = {}) {
  if (o.dissolve) {
    TMP = TMP || mk(36, 36);
    const g = TMP.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, 36, 36);
    CHAR[id](g, 8, 8, t, { ...o, dissolve: 0 });
    g.globalCompositeOperation = 'destination-out';
    for (let yy = 0; yy < 36; yy++) for (let xx = 0; xx < 36; xx++) if (BAYER[(yy & 3) * 4 + (xx & 3)] < o.dissolve * 16) g.fillRect(xx, yy, 1, 1);
    c.drawImage(TMP, x - 8, y - 8);
    return;
  }
  xform(c, x, y, o, (g, X, Y, oo) => CHAR[id](g, X, Y, t, oo));
  if (o.ab != null && o.ab < 1) AURA[id](c, x + 10, y + 10, o.ab);
}

// ---- pixel snapshots for scatter / gather / afterimage ----
export function snapshot(kind, isChar, t, flip) {
  const cv = mk(36, 36, true), g = cv.getContext('2d');
  if (isChar) CHAR[kind](g, 8, 8, t, { still: true, flip }); else blit(g, SPR[kind], 8, 8, { flip });
  return cv;
}
export function pixelsOf(cv, max = 80) {
  const d = cv.getContext('2d').getImageData(0, 0, 36, 36).data;
  let out = [];
  for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
    const i = (y * 36 + x) * 4;
    if (d[i + 3] > 0) out.push([x, y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]);
  }
  const step = Math.ceil(out.length / max);
  if (step > 1) out = out.filter((_, i) => i % step === 0);
  return out;
}
export const ghostsOf = cv => [ditherSil(cv, '#7f90c0', 9), ditherSil(cv, '#44527f', 5)];

export function drawSilhouette(c, id, x, y, k = '1') {
  const t = mk(36, 36), g = t.getContext('2d');
  CHAR[id](g, 8, 8, 0, { still: true });
  c.drawImage(silhouette(t, k === '1' ? '#161a29' : '#262d48'), x - 8, y - 8);
}

// ---- portrait / icon / unlock art ----
const BACK = {
  void: (x, y, d, a, t) => 8 + 8 * Math.sin(d * 0.5 - t * 2),
  error: (x, y, d, a, t) => (((y + Math.floor(t * 8)) % 6) < 2 ? 9 : hash(x, y, Math.floor(t * 6)) * 5),
  time: (x, y, d, a, t) => (d > 18 ? 8 + 8 * Math.sin(a * 12) : 2),
  space: (x, y) => (hash(x, y, 3) < 0.03 ? 16 : 1),
  blackhole: (x, y, d, a, t) => 8 + 8 * Math.sin(a * 3 + d * 0.3 - t * 2),
  parasite: (x, y, d, a, t) => 8 + 7 * Math.sin(x * 0.35 + Math.sin(y * 0.3 + t)),
};

const PORT = {};
export function drawPortrait(c, id, x, y, w, h, t, locked) {
  const key = id + w + 'x' + h, cx = x + w / 2, cy = y + h / 2;
  let e = PORT[key];
  if (!e) e = PORT[key] = { cv: mk(w, h), last: -9 };
  if (t - e.last > 0.12) { // backdrop refreshed ~8x/s, not every frame
    e.last = t;
    const g = e.cv.getContext('2d');
    g.clearRect(0, 0, w, h);
    panel(g, 0, 0, w, h, { fill: '1' });
    g.fillStyle = '#262d48';
    for (let yy = 2; yy < h - 2; yy++) for (let xx = 2; xx < w - 2; xx++) {
      const dx = xx - w / 2, dy = yy - h / 2, lv = BACK[id](xx, yy, Math.hypot(dx, dy), Math.atan2(dy, dx), t);
      if (BAYER[(yy & 3) * 4 + (xx & 3)] < lv) g.fillRect(xx, yy, 1, 1);
    }
  }
  c.drawImage(e.cv, x, y);
  if (locked) { drawSilhouette(c, id, cx - 10, cy - 10); icon(c, 'lock', cx - 3, cy - 4); } else drawChar(c, id, cx - 10, cy - 10, t, {});
}

export function drawIcon(c, id, x, y, locked, selected) {
  panel(c, x, y, 24, 24, { fill: selected ? '3' : '1', hi: selected ? '5' : '3' });
  if (locked) drawSilhouette(c, id, x + 2, y + 2, '2'); else drawChar(c, id, x + 2, y + 2, 0, { still: true });
}

// Unlock reveal: silhouette flicker -> flash -> character with rotating rays. p 0..1
export function drawUnlock(c, id, cx, cy, p, t) {
  if (p < 0.45) {
    drawSilhouette(c, id, cx - 10, cy - 10, '1');
    for (let i = 0; i < 10; i++) { const a = i * 0.63 + t, r = 30 * (1 - p / 0.45); px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, '4'); }
  } else {
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6 + t * 0.5, r0 = 14, r1 = k % 2 ? 24 : 32;
      line(c, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, k % 2 ? '3' : '4');
    }
    drawChar(c, id, cx - 10, cy - 10, t, {});
    if (p < 0.6) ringPx(c, cx, cy, (p - 0.45) * 200, '5');
  }
}
