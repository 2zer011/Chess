// Sprite registry + per-character procedural animation (idle / move / capture / ability),
// portraits, collection icons and unlock art. All drawing is pixel-aligned canvas code.
import { TILE, ACC, accOf } from '../art/palette.js';
import { SPRITES } from '../art/sprites-data.js';
import { ICONS } from '../art/icons.js';
import { panel, mk, parseAscii, bake, silhouette, ditherSil, rect, px, ringPx, line, hash, BAYER } from './pixel.js';

export const SPR = {}, ICO = {};
const TINT = {};
export const CHARS = ['void', 'error', 'time', 'space', 'blackhole', 'parasite', 'blackking'];

export function initSprites() {
  for (const [k, d] of Object.entries(SPRITES)) {
    const cv = bake(parseAscii(d.rows, d.mirror), true, ACC[k]);
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

function discPx(c, cx, cy, rx, ry, t, front, k, A) {
  const pts = [];
  for (let a = 0; a < 6.283; a += 0.1) {
    if ((Math.sin(a) > 0) !== front) continue;
    pts.push([Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), (((a - t * 3) % 6.283) + 6.283) % 6.283 < 1.3]);
  }
  for (const [X, Y] of pts) rect(c, X - 1, Y - 1, 3, 3, '0');                       // outline pass first,
  for (const [X, Y, bright] of pts) px(c, X, Y, k ? W2 : bright ? A.l : A.m);       // so the ring stays visible
}

const CHAR = {
  void(c, x, y, t, o) {
    const b = bob(t, o), A = ACC.void;
    blit(c, SPR.void, x, y, { ...o, dy: (o.dy || 0) + b });
    if (o.white) return;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + i * 2.09;
      px(c, x + 10 + Math.round(Math.cos(a) * 9), y + 10 + Math.round(Math.sin(a) * 5) + b + (o.dy || 0), i ? A.m : A.l);
    }
  },
  error(c, x, y, t, o) {
    const gl = (t % 1.4) < 0.15 || o.glitch, b = bob(t, o), n = Math.floor(t * 30), A = ACC.error;
    blit(c, SPR.error, x, y, { ...o, dy: (o.dy || 0) + b, rows: gl && !o.white ? r => Math.round((hash(r, n) - 0.5) * 5) : o.rows });
    if (gl && !o.white) for (let i = 0; i < 2; i++) rect(c, x + 1, y + 2 + Math.floor(hash(i, n, 3) * 16), 18, 1, i ? A.m : A.l);
  },
  time(c, x, y, t, o) {
    const b = bob(t, o) + (o.dy || 0), A = ACC.time;
    blit(c, SPR.time, x, y, { ...o, dy: b });
    if (o.white) return;
    const p = (t * 0.2) % 1, L = [4, 5, 6, 7, 7, 6, 5, 4], R = [11, 10, 9, 8, 8, 9, 10, 11];
    for (let r = 4; r <= 11; r++) {
      const fill = r < 8 ? (7 - r) < (1 - p) * 4 : (11 - r) < p * 4;
      if (fill) rect(c, x + 2 + L[r - 4], y + 1 + r + b, R[r - 4] - L[r - 4] + 1, 1, A.l);
    }
    px(c, x + 2 + 7 + ((t * 10) % 2 | 0), y + 1 + 8 + b, A.l);
  },
  space(c, x, y, t, o) {
    const cx = x + 10, cy = y + 10 + bob(t, o) + (o.dy || 0), A = ACC.space;
    const hw = yy => Math.round(5.5 * (1 - Math.abs(yy) / 8));
    for (let yy = -8; yy <= 8; yy++) rect(c, cx - hw(yy) - 1, cy + yy, 2 * hw(yy) + 3, 1, '0');
    for (let yy = -7; yy <= 7; yy++) for (let xx = -hw(yy); xx <= hw(yy); xx++) {
      px(c, cx + xx, cy + yy, o.white ? W2 : xx === 0 ? A.l : xx < 0 ? (yy <= 0 ? A.l : A.m) : (yy <= 0 ? A.m : A.d));
    }
    if (o.white) return;
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * Math.PI / 2, sx = cx + Math.round(Math.cos(a) * 9), sy = cy + Math.round(Math.sin(a) * 5);
      rect(c, sx - 1, sy - 1, 3, 3, '0'); rect(c, sx - 1, sy - 1, 2, 2, i % 2 ? A.l : A.m);
    }
  },
  blackhole(c, x, y, t, o) {
    const cx = x + 10, cy = y + 10 + bob(t, o) + (o.dy || 0), w = o.white, A = ACC.blackhole;
    discPx(c, cx, cy, 9, 3, t, false, w, A); discPx(c, cx, cy, 7, 2, t + 1, false, w, A);
    for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
      const d = xx * xx + yy * yy;
      if (d <= 17) px(c, cx + xx, cy + yy, w ? W2 : d >= 12 ? (xx + yy < 0 ? A.l : A.d) : '0');
    }
    discPx(c, cx, cy, 9, 3, t, true, w, A); discPx(c, cx, cy, 7, 2, t + 1, true, w, A);
    if (!w) { const j = (t * 8 | 0) % 3; rect(c, cx, cy - 8 - j, 1, 2, A.m); rect(c, cx, cy + 7 + j, 1, 2, A.m); }
  },
  parasite(c, x, y, t, o) {
    const b = bob(t, o) + (o.dy || 0), A = ACC.parasite;
    blit(c, SPR.parasite, x, y, { ...o, dy: b });
    if (o.white) return;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const ax = x + 2 + (s < 0 ? 3 : 12), ay = y + 1 + 8 + i * 2 + b;
      const w = Math.round(Math.sin(t * 10 + i * 1.5 + (s > 0 ? Math.PI : 0)) * 1.5);
      line(c, ax, ay, ax + s * 3, ay - 1 + w, A.d); line(c, ax + s * 3, ay - 1 + w, ax + s * 5, ay + 2 + w, A.m);
    }
  },
  blackking(c, x, y, t, o) {
    const b = bob(t, o) + (o.dy || 0), A = ACC.blackking;
    blit(c, SPR.blackking, x, y, { ...o, dy: b });
    if (o.white) return;
    if (((t * 2) | 0) % 2) px(c, x + 18, y + 11 + b, A.l);   // muzzle glint
    px(c, x + 10, y + 3 + b + ((t * 4 | 0) % 2), A.l);          // cross sparkle
  },
};

// Ability auras drawn on the caster; p = 0..1 progress, A = accent ramp.
const AURA = {
  void: (c, cx, cy, p, A) => { ringPx(c, cx, cy, p * 30, A.m); if (p < 0.6) ringPx(c, cx, cy, p * 18, A.l); },
  error: (c, cx, cy, p, A) => { for (let i = 0; i < 6; i++) rect(c, cx - 30 + hash(i, (p * 20) | 0) * 40, cy - 14 + i * 5, 6 + hash(i, 3, (p * 20) | 0) * 22, 1, i % 2 ? A.m : A.l); },
  time: (c, cx, cy, p, A) => {
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = 11 + p * 10; px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 3 ? A.m : A.l); }
    line(c, cx, cy, cx + Math.sin(p * 12.5) * 12, cy - Math.cos(p * 12.5) * 12, A.l);
  },
  space: (c, cx, cy, p, A) => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = 24 * (1 - p); line(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6), A.l); } },
  blackhole: (c, cx, cy, p, A) => { for (let k = 0; k < 26; k++) { const a = k * 0.55 + p * 9, r = (1 - p) * 36 * (k / 26) + 3; px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, k % 2 ? A.m : A.l); } },
  parasite: (c, cx, cy, p, A) => { for (let k = 0; k < 8; k++) px(c, cx - 10 + k * 3, cy - p * 16 - (k % 3) * 3, k % 2 ? A.l : A.m); },
  blackking: (c, cx, cy, p, A) => { ringPx(c, cx, cy, 6 + p * 14, A.m); ringPx(c, cx, cy, 3 + p * 8, A.l); },
};

let TMP;
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
  if (o.ab != null && o.ab < 1) AURA[id](c, x + 10, y + 10, o.ab, accOf(id));
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
export const ghostsOf = (cv, A) => [ditherSil(cv, A ? A.l : '#7f90c0', 9), ditherSil(cv, A ? A.m : '#44527f', 5)];

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
  blackking: (x, y, d, a, t) => (Math.abs(((x + y) % 14) - 7) < 1.2 ? 9 : 2 + 2 * Math.sin(t + d * 0.2)),
};

const PORT = {};
export function drawPortrait(c, id, x, y, w, h, t, locked) {
  const key = id + w + 'x' + h, cx = x + w / 2, cy = y + h / 2, A = accOf(id);
  let e = PORT[key];
  if (!e) e = PORT[key] = { cv: mk(w, h), last: -9 };
  if (t - e.last > 0.12) { // backdrop refreshed ~8x/s, not every frame
    e.last = t;
    const g = e.cv.getContext('2d');
    g.clearRect(0, 0, w, h);
    panel(g, 0, 0, w, h, { fill: '1', hi: locked ? '3' : A.m });
    g.fillStyle = locked ? '#262d48' : A.d;
    for (let yy = 2; yy < h - 2; yy++) for (let xx = 2; xx < w - 2; xx++) {
      const dx = xx - w / 2, dy = yy - h / 2, lv = BACK[id](xx, yy, Math.hypot(dx, dy), Math.atan2(dy, dx), t);
      if (BAYER[(yy & 3) * 4 + (xx & 3)] < lv) g.fillRect(xx, yy, 1, 1);
    }
  }
  c.drawImage(e.cv, x, y);
  if (locked) { drawSilhouette(c, id, cx - 10, cy - 10); icon(c, 'lock', cx - 3, cy - 4); } else drawChar(c, id, cx - 10, cy - 10, t, {});
}

export function drawIcon(c, id, x, y, locked, selected) {
  const A = accOf(id);
  panel(c, x, y, 22, 22, { fill: selected ? '2' : '1', hi: locked ? '3' : A.m, edge: selected && !locked ? A.l : '0' });
  if (locked) drawSilhouette(c, id, x + 1, y + 1, '2'); else drawChar(c, id, x + 1, y + 1, 0, { still: true });
}

// Unlock reveal: silhouette flicker -> flash -> character with rotating rays. p 0..1
export function drawUnlock(c, id, cx, cy, p, t) {
  const A = accOf(id);
  if (p < 0.45) {
    drawSilhouette(c, id, cx - 10, cy - 10, '1');
    for (let i = 0; i < 10; i++) { const a = i * 0.63 + t, r = 30 * (1 - p / 0.45); px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, A.m); }
  } else {
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6 + t * 0.5, r0 = 14, r1 = k % 2 ? 24 : 32;
      line(c, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, k % 2 ? A.d : A.m);
    }
    drawChar(c, id, cx - 10, cy - 10, t, {});
    if (p < 0.6) ringPx(c, cx, cy, (p - 0.45) * 200, A.l);
  }
}
