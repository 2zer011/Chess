// Reusable pixel-art primitives. Everything draws on integer coordinates.
import { C } from '../art/palette.js';

export const mk = (w, h, readback = false) => {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d', readback ? { willReadFrequently: true } : undefined).imageSmoothingEnabled = false;
  return cv;
};
export const col = k => C[k] || k;
export const rect = (c, x, y, w, h, k) => { c.fillStyle = col(k); c.fillRect(Math.round(x), Math.round(y), w, h); };
export const px = (c, x, y, k) => rect(c, x, y, 1, 1, k);

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ASCII rows -> full grid (optionally mirrored). Throws on ragged rows.
export function parseAscii(rows, mirror) {
  const g = mirror ? rows.map(r => r + [...r].reverse().join('')) : rows.slice();
  g.forEach((r, i) => { if (r.length !== g[0].length) throw new Error(`ragged row ${i}`); });
  return g;
}

// Grid -> canvas, with an automatic 1px black outline.
// acc: optional accent ramp, maps sprite chars a/b/c -> dark/mid/light
export function bake(grid, outline = true, acc = null) {
  const AM = acc ? { a: acc.d, b: acc.m, c: acc.l } : {};
  const w = grid[0].length, h = grid.length, p = outline ? 1 : 0;
  const cv = mk(w + 2 * p, h + 2 * p), c = cv.getContext('2d');
  const at = (x, y) => (grid[y] && grid[y][x]) || '.';
  if (outline) {
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (at(x, y) === '.' && (at(x + 1, y) !== '.' || at(x - 1, y) !== '.' || at(x, y + 1) !== '.' || at(x, y - 1) !== '.')) px(c, x + p, y + p, '0');
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = at(x, y);
    if (ch !== '.') px(c, x + p, y + p, AM[ch] || (ch === 'i' ? '1' : ch));
  }
  return cv;
}

export function silhouette(cv, k) {
  const o = mk(cv.width, cv.height), c = o.getContext('2d');
  c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-in';
  rect(c, 0, 0, cv.width, cv.height, k);
  return o;
}

// Checkerboard-dithered copy of a silhouette (for frost / infection overlays).
export function ditherSil(cv, k, level = 8) {
  const o = silhouette(cv, k), c = o.getContext('2d');
  c.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) {
    if (BAYER[(y & 3) * 4 + (x & 3)] >= level) c.fillRect(x, y, 1, 1);
  }
  return o;
}

export function ditherRect(c, x, y, w, h, level, k) {
  c.fillStyle = col(k);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (BAYER[((y + yy) & 3) * 4 + ((x + xx) & 3)] < level) c.fillRect(x + xx, y + yy, 1, 1);
  }
}

export function ringPx(c, cx, cy, r, k) {
  c.fillStyle = col(k);
  const n = Math.max(8, Math.round(r * 6.3));
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}

export function line(c, x0, y0, x1, y1, k) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    px(c, x0, y0, k);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

// Bevelled panel with cut corners.
export function panel(c, x, y, w, h, o = {}) {
  const { fill = '2', hi = '4', lo = '1', edge = '0' } = o;
  rect(c, x + 1, y, w - 2, h, edge); rect(c, x, y + 1, w, h - 2, edge);
  rect(c, x + 1, y + 1, w - 2, h - 2, fill);
  rect(c, x + 1, y + 1, w - 2, 1, hi); rect(c, x + 1, y + 1, 1, h - 2, hi);
  rect(c, x + 1, y + h - 2, w - 2, 1, lo); rect(c, x + w - 2, y + 1, 1, h - 2, lo);
}
