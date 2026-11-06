import { W, H } from './art/palette.js';
import { app } from './app.js';
import { ui } from './ui/ui.js';
import { initSprites } from './gfx/sprites.js';
import { buildBoard } from './gfx/board.js';
import { fx, update as fxUpdate } from './gfx/fx.js';
import { rect } from './gfx/pixel.js';
import title from './scenes/title.js';
import characters from './scenes/characters.js';
import achievements from './scenes/achievements.js';
import settings from './scenes/settings.js';
import play from './scenes/play.js';
import summary from './scenes/summary.js';

const SCENES = { title, characters, achievements, settings, play, summary };
const view = document.getElementById('view'), vc = view.getContext('2d');
const scr = document.createElement('canvas'); scr.width = W; scr.height = H;
const sc = scr.getContext('2d'); sc.imageSmoothingEnabled = false;
let slow = 0, scene = title, trans = null, scale = 1, scan = null, T = 0, last = 0;
const TD = 0.5;

app.go = (name, arg) => { if (!trans) trans = { t: 0, name, arg, sw: false }; };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  scale = Math.max(1, Math.floor(Math.min(innerWidth * dpr / W, innerHeight * dpr / H)));
  view.width = W * scale; view.height = H * scale;
  view.style.width = view.width / dpr + 'px'; view.style.height = view.height / dpr + 'px';
  scan = document.createElement('canvas'); scan.width = view.width; scan.height = view.height;
  const g = scan.getContext('2d'), th = Math.max(1, Math.round(scale / 3));
  g.fillStyle = 'rgba(0,0,0,0.3)';
  for (let y = 0; y < H; y++) g.fillRect(0, (y + 1) * scale - th, view.width, th);
}

const pos = e => { const r = view.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
view.addEventListener('pointerdown', e => { Object.assign(ui, pos(e)); ui.down = true; e.preventDefault(); });
view.addEventListener('pointermove', e => { Object.assign(ui, pos(e)); });
view.addEventListener('pointerup', e => { Object.assign(ui, pos(e)); ui.down = false; ui.click = pos(e); });
view.addEventListener('pointercancel', () => { ui.down = false; });

// Dithered block wipe: cover, swap scene at midpoint, reveal.
function drawTrans(c) {
  const p = trans.t / TD, cover = p < 0.5 ? p * 2 : 2 - p * 2;
  c.fillStyle = '#0a0c12';
  for (let by = 0; by < H / 4; by++) for (let bx = 0; bx < W / 4; bx++) {
    if (((bx * 7 + by * 13 + bx * by) % 16) / 16 < cover * 1.05) c.fillRect(bx * 4, by * 4, 4, 4);
  }
}

function frame(ms) {
  const dt = Math.min(0.05, (ms - last) / 1000); last = ms; T += dt;
  fx.on.shake = app.sv.settings.shake; fx.on.ambient = app.sv.settings.ambient;
  if (trans) {
    trans.t += dt; ui.click = null;
    if (!trans.sw && trans.t >= TD / 2) { trans.sw = true; scene = SCENES[trans.name]; scene.enter?.(trans.arg); }
    if (trans.t >= TD) trans = null;
  }
  // hit-stop freezes simulation (not the idle clock); adaptive particle quality for slow phones
  let sdt = dt;
  if (fx.hit > 0) { fx.hit = Math.max(0, fx.hit - dt); sdt = 0; }
  slow = dt > 0.034 ? slow + 1 : Math.max(0, slow - 0.25); fx.q = slow > 30 ? 0.5 : 1;
  fxUpdate(sdt); scene.update?.(sdt);
  rect(sc, 0, 0, W, H, '0');
  scene.draw(sc, T);
  if (trans) drawTrans(sc);
  ui.click = null;
  vc.imageSmoothingEnabled = false;
  vc.drawImage(scr, 0, 0, W * scale, H * scale);
  if (app.sv.settings.crt) vc.drawImage(scan, 0, 0);
  requestAnimationFrame(frame);
}

initSprites(); buildBoard(); resize();
addEventListener('resize', resize);
window.__app = app; // handy for debugging
requestAnimationFrame(frame);
