// Pre-rendered pixel board: stone tiles, frame, coordinates; plus overlay helpers.
import { TILE, BX, BY, W } from '../art/palette.js';
import { text } from '../art/font.js';
import { mk, rect, px, hash, BAYER } from './pixel.js';

const OY = BY - 8; // board canvas origin (frame top)
let BOARD, THREAT, SHADOW;

export function buildBoard() {
  BOARD = mk(W, 176);
  const c = BOARD.getContext('2d');
  rect(c, 2, 1, 172, 174, '0'); rect(c, 1, 2, 174, 172, '0');
  rect(c, 2, 2, 172, 172, '1'); rect(c, 2, 2, 172, 1, '3'); rect(c, 2, 2, 1, 172, '3');
  for (const [x, y] of [[4, 4], [170, 4], [4, 170], [170, 170]]) px(c, x, y, '4');
  rect(c, BX - 1, 7, 162, 162, '0');
  for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) tile(c, tx, ty);
  for (let i = 0; i < 8; i++) {
    text(c, 'ABCDEFGH'[i], BX + i * TILE + 8, 170, '4');
    text(c, String(8 - i), 2, 8 + i * TILE + 8, '4');
  }
  SHADOW = mk(12, 3); const sg = SHADOW.getContext('2d');
  sg.fillStyle = '#0a0c12';
  for (let y = 0; y < 3; y++) for (let x = 0; x < 12; x++) if ((x + y) % 2 === 0 && !(y === 0 && (x < 2 || x > 9)) && !(y === 2 && (x < 2 || x > 9))) sg.fillRect(x, y, 1, 1);
  const t = THREAT = mk(TILE, TILE), tc = t.getContext('2d');
  tc.fillStyle = '#7c2433';
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 3) tc.fillRect(x, y, 1, 1);
}

function tile(c, tx, ty) {
  const dark = (tx + ty) % 2 === 1, x0 = BX + tx * TILE, y0 = 8 + ty * TILE;
  const base = dark ? '2' : '3', hi = dark ? '3' : '4', lo = dark ? '1' : '2';
  rect(c, x0, y0, TILE, TILE, base);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const h = hash(x + tx * 31, y + ty * 17, 5);
    if (h < 0.07) px(c, x0 + x, y0 + y, hi); else if (h > 0.94) px(c, x0 + x, y0 + y, lo);
  }
  if (hash(tx, ty, 9) < 0.4) { // crack: short random walk
    let x = 3 + Math.floor(hash(tx, ty, 1) * 13), y = 3 + Math.floor(hash(tx, ty, 2) * 13);
    for (let i = 0; i < 7; i++) {
      px(c, x0 + x, y0 + y, lo);
      x += hash(tx, ty, 20 + i) < 0.5 ? 1 : 0; y += hash(tx, ty, 40 + i) < 0.7 ? 1 : -1;
      x = Math.max(1, Math.min(18, x)); y = Math.max(1, Math.min(18, y));
    }
  }
  rect(c, x0, y0, TILE, 1, hi); rect(c, x0, y0, 1, TILE, hi);
  rect(c, x0, y0 + TILE - 1, TILE, 1, lo); rect(c, x0 + TILE - 1, y0, 1, TILE, lo);
}

export const drawBoard = c => c.drawImage(BOARD, 0, OY);
export const drawShadow = (c, x, y) => c.drawImage(SHADOW, x + 4, y + 16);
export const drawThreat = (c, tx, ty) => c.drawImage(THREAT, BX + tx * TILE, BY + ty * TILE);

export function moveDot(c, tx, ty, k = '5') {
  const x = BX + tx * TILE + 9, y = BY + ty * TILE + 9;
  rect(c, x + 1, y + 1, 3, 3, '0'); rect(c, x + 1, y, 1, 3, k); rect(c, x, y + 1, 3, 1, k);
}

// Accent glow under the active piece (two cached dither phases, pulsing).
const GLOW = {};
export function drawGlow(c, tx, ty, A, t) {
  const ph = ((t * 2.5) | 0) % 2, key = A.m + ph;
  if (!GLOW[key]) {
    const cv = GLOW[key] = mk(TILE, TILE), g = cv.getContext('2d');
    g.fillStyle = A.d;
    for (let y = 1; y < TILE - 1; y++) for (let x = 1; x < TILE - 1; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < (ph ? 7 : 5)) g.fillRect(x, y, 1, 1);
  }
  c.drawImage(GLOW[key], BX + tx * TILE, BY + ty * TILE);
}

export function bracket(c, tx, ty, k, inset = 1) {
  const x = BX + tx * TILE + inset, y = BY + ty * TILE + inset, s = TILE - 2 * inset, l = 4;
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + s - 1, y, -1, 1], [x, y + s - 1, 1, -1], [x + s - 1, y + s - 1, -1, -1]]) {
    rect(c, dx > 0 ? cx : cx - l + 1, cy, l, 1, k); rect(c, cx, dy > 0 ? cy : cy - l + 1, 1, l, k);
  }
}

// Red pulsing frame edge when the player is in check.
export function checkFrame(c, t) {
  if (((t * 4) | 0) % 2) return;
  rect(c, 2, OY + 2, 172, 1, 'R'); rect(c, 2, OY + 173, 172, 1, 'R');
  rect(c, 2, OY + 2, 1, 172, 'R'); rect(c, 173, OY + 2, 1, 172, 'R');
}
