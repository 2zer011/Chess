import { W, TILE, BX, BY, accOf } from '../art/palette.js';
import { text, wrap } from '../art/font.js';
import { rect, panel, ditherRect, hash } from '../gfx/pixel.js';
import { drawBoard, drawThreat, drawShadow, drawGlow, moveDot, bracket, checkFrame } from '../gfx/board.js';
import { drawChar, drawEnemy, overlayEnemy, icon, snapshot, pixelsOf, ghostsOf } from '../gfx/sprites.js';
import * as F from '../gfx/fx.js';
import { newGame, move, ability, choose, abilityTargets, threats, attackers, moves, cdOf } from '../game.js';
import { Director } from '../anim/director.js';
import { build } from '../anim/steps.js';
import { PIECES } from '../pieces.js';
import { BUFFS, COMMON } from '../buffs.js';
import { btn, tap } from '../ui/ui.js';
import { app, finishRun } from '../app.js';
import { bg } from './common.js';

let S, D, NOW = 0;
const fresh = () => ({ aim: -1, info: 0, ember: 0, pause: false, buffT: 0, over: 0, done: false, red: 0, glitch: 0, cursor: null });
const cx = tx => BX + tx * TILE + 10, cy = ty => BY + ty * TILE + 10;
const pixelCache = {};

// Visual adapter: the sequencer only talks to this, so it stays testable without a canvas.
const V = {
  tint: F.tintFlash, ember: (x, y) => F.ember(x, y, D.acc), smoke: F.smoke,
  burst: F.burst, spark: F.spark, ring: F.ring, flash: F.flash, shake: F.shake, hitstop: F.hitstop, float: F.floatText,
  redFlash: s => { S.red = s; },
  screenGlitch: s => { S.glitch = s; },
  dust(a) { F.ring(a.cx, a.py + 17, 8, 0.22, '4', 0); F.burst(a.cx, a.py + 17, 6, ['3', '4'], { spd: 22, life: 0.3, g: 0, z: 0 }); },
  trail(a) { // short pixel afterimage: stamp a ghost every few px of travel
    if (!a.trail.length && !a.ghost) a.ghost = ghostsOf(snapshot(a.kind, a.isPlayer, NOW, a.flip), a.isPlayer ? accOf(a.kind) : null);
    if (!a.trail.length) a.ghost = ghostsOf(snapshot(a.kind, a.isPlayer, NOW, a.flip), a.isPlayer ? accOf(a.kind) : null);
    const l = a.trail[a.trail.length - 1];
    if (!l || Math.hypot(a.px - l.x, a.py - l.y) >= 4) a.trail.push({ x: a.px, y: a.py, age: 0 });
  },
  scatter(a) { // sprite breaks into its own pixels
    const list = a.isPlayer ? pixelsOf(snapshot(a.kind, true, NOW, a.flip)) : (pixelCache[a.kind] = pixelCache[a.kind] || pixelsOf(snapshot(a.kind, false, 0, false)));
    for (const [x, y, col] of list) {
      const X = a.px - 8 + x, Y = a.py - 8 + y, dx = x - 18, dy = y - 20;
      F.spark(X, Y, dx * 3 + (Math.random() - 0.5) * 24, dy * 2 - 20 - Math.random() * 30, col, 0.45 + Math.random() * 0.35, 130);
    }
  },
  gather(a, life) { // pixels fly in and rebuild the sprite
    const list = a.isPlayer ? pixelsOf(snapshot(a.kind, true, NOW, a.flip)) : pixelsOf(snapshot(a.kind, false, 0, false));
    for (const [x, y, col] of list) {
      const a1 = Math.random() * 6.283, r = 16 + Math.random() * 24;
      F.fly(a.px - 8 + x + Math.cos(a1) * r, a.py - 8 + y + Math.sin(a1) * r, a.px - 8 + x, a.py - 8 + y, col, life);
    }
  },
  buff(a) { // rotating ring of light around the piece
    D.effects.push({ t: 0, dur: 0.6, draw(c, t) {
      for (let i = 0; i < 8; i++) {
        const ang = t * 9 + i * Math.PI / 4, x = a.cx + Math.cos(ang) * 13, y = a.cy + Math.sin(ang) * 7 - 2;
        rect(c, x, y, 1, 1, i % 2 ? 'w' : '5'); if (t < 0.45) rect(c, x, y + 1, 1, 1, '4');
      }
    } });
  },
};

function finish(g, died) { if (S.done) return; S.done = true; D.reset(); app.summary = finishRun(g, died); app.go('summary'); }

export default {
  enter(a = {}) {
    if (a.resume) { S.pause = true; return; }
    const g = app.g = newGame(a.id);
    F.reset(); S = fresh();
    D = new Director(V, a.id); D.init(g); D.onSync = () => D.sync(g);
  },
  update(dt) {
    const g = app.g; if (!g || S.pause) return;
    if (g.ev.length) build(D, g.ev.splice(0));
    D.update(dt);
    if (D.idle) D.sync(g);
    S.red = Math.max(0, S.red - dt); S.glitch = Math.max(0, S.glitch - dt);
    if (D.idle && g.phase === 'play' && !D.player.hidden && (S.ember -= dt) < 0) { S.ember = 0.22; F.ember(D.player.cx + (Math.random() - 0.5) * 8, D.player.py + 15, D.acc); } // ambient embers
    if (S.cursor) { S.cursor.t += dt; if (S.cursor.t > 0.3) S.cursor = null; }
    if (g.phase === 'buff' && D.idle) S.buffT += dt;
    if (g.phase === 'over' && D.idle) { S.over += dt; if (S.over > 2) finish(g, true); }
  },
  draw(c, t) {
    NOW = t;
    const g = app.g, p = g.p, def = PIECES[g.piece], A = accOf(g.piece);
    const ready = D.idle && g.phase === 'play' && !S.pause && S.over === 0; // board accepts input only when fully settled
    bg(c);
    c.save(); c.translate(F.fx.ox, F.fx.oy);          // shake moves the board layer only, never the UI
    drawBoard(c);
    let check = false, atk = [], tg = [];
    if (D.idle) {
      const seen = new Set();
      for (const s of threats(g)) { const k = s.x + ',' + s.y; if (!seen.has(k)) { seen.add(k); drawThreat(c, s.x, s.y); } }
      if (ready) { tg = S.aim >= 0 ? abilityTargets(g, S.aim) : moves(g); drawGlow(c, p.x, p.y, A, t); }
      for (const s of tg) if (!g.at(s.x, s.y)) moveDot(c, s.x, s.y, A.l);
      atk = attackers(g); check = atk.length > 0 && g.phase !== 'over';
      if (check) checkFrame(c, t);
    }
    F.drawLayer(c, 0);                                 // ground effects sit under the pieces
    for (const a of [...D.actors].sort((x, y) => (x.ty - y.ty) || (x.isPlayer ? 1 : -1))) drawActor(c, a, t, g);
    for (const e of D.effects) e.draw(c, e.t);
    for (const s of tg) if (g.at(s.x, s.y)) bracket(c, s.x, s.y, S.aim >= 0 ? A.l : 'R', ((t * 5) | 0) % 2);
    for (const e of atk) bracket(c, e.x, e.y, 'R', 0);
    if (ready) bracket(c, p.x, p.y, A.l, 1 + (((t * 3) | 0) % 2));
    if (S.cursor) bracket(c, S.cursor.tx, S.cursor.ty, '4', 2);
    F.drawLayer(c, 1);
    F.drawTint(c);
    if (S.glitch > 0) for (let i = 0; i < 6; i++) { const y = BY + Math.floor(Math.random() * 150); c.drawImage(c.canvas, 0, y, W, 6, Math.round((Math.random() - 0.5) * 10), y, W, 6); }
    if (S.red > 0) c.drawImage(F.overlays().red, 0, 0);
    c.restore();

    hud(c, g, t);
    const msg = S.aim >= 0 ? 'PICK A TARGET' : !D.idle ? (D.stepName.startsWith('enemy') ? 'ENEMY TURN' : '') : check ? 'CHECK!' : g.phase === 'over' ? '' : 'YOUR MOVE';
    text(c, msg, W / 2, 213, check && S.aim < 0 ? 'R' : '5', { align: 'c' });
    wrap(def.abilities[S.info].desc, 160).slice(0, 3).forEach((l, i) => text(c, l, W / 2, 224 + i * 8, '3', { align: 'c' }));
    def.abilities.forEach((ab, slot) => {
      const cd = cdOf(g, slot);
      if (btn(c, '', 8 + slot * 82, 252, 78, 26, { disabled: !ready || cd > 0, sel: S.aim === slot,
        draw: (cc, x, y) => {
          rect(cc, x + 2, y + 3, 1, 20, cd ? '3' : A.m);
          text(cc, ab.name, x + 6, y + 5, cd ? '3' : A.l);
          text(cc, cd ? 'CD ' + cd : 'READY', x + 6, y + 15, cd ? '3' : '4');
        } })) {
        S.info = slot;
        if (ab.target === 'none') ability(g, 0, 0, slot); else S.aim = S.aim === slot ? -1 : slot;
      }
    });
    if (ready) boardTap(g);

    if (S.over > 0.3) checkmate(c);
    if (g.phase === 'buff' && D.idle) cards(c, g);
    if (S.pause) pause(c, g);
  },
};

function drawActor(c, a, t, g) {
  if (a.hidden) return;
  if (a.ghost) for (const tr of a.trail) c.drawImage(tr.age < 0.09 ? a.ghost[0] : a.ghost[1], tr.x - 8, tr.y - 8);
  const x = a.px, y = a.py;
  drawShadow(c, BX + Math.round(a.tx * TILE), BY + Math.round(a.ty * TILE) + a.oy * 0);
  const o = { flip: a.flip, still: !!a.owner, white: a.flash, sx: a.sx, sy: a.sy, lean: a.lean };
  const n = Math.floor(t * 30);
  if (a.glitch > 0) o.rows = r => Math.round((hash(r, n, a.ph | 0) - 0.5) * 5);
  if (a.isPlayer) {
    drawChar(c, a.kind, x, y, t, { ...o, ab: a.ab, glitch: a.glitch > 0 });
    if (g.p.host && !a.owner) drawEnemy(c, g.p.host, x + 12, y + 10, {});
  } else {
    const b = a.owner || a.stunShown || a.frost ? 0 : (Math.sin(t * 3 + a.ph) > 0 ? -1 : 0);
    drawEnemy(c, a.kind, x, y, { ...o, dy: b });
    if (a.frost) overlayEnemy(c, a.kind, x, y, '4', { dy: b });
    if (a.infShown) { overlayEnemy(c, a.kind, x, y, 'R', { dy: b }); rect(c, x + 9, y + 1 + (((t * 6) | 0) % 2), 2, 2, 'R'); }
    if (a.stunShown) text(c, 'Z', x + 13, y + 1 + (((t * 3) | 0) % 2), '5');
  }
  if (a.glitch > 0) for (let i = 0; i < 2; i++) rect(c, x + 1, y + 2 + Math.floor(hash(i, n, 3) * 16), 18, 1, i ? 'R' : '5');
}

function hud(c, g, t) {
  const d = D.disp;
  panel(c, 6, 5, 24, 24, { fill: '1', hi: accOf(g.piece).m });
  drawChar(c, g.piece, 8, 7, t, { still: true });
  text(c, PIECES[g.piece].name, 34, 7, accOf(g.piece).l, { shadow: '0' });
  for (let i = 0; i < d.maxHp; i++) icon(c, i < d.hp ? 'heart' : 'heartE', 34 + i * 9, 16);
  for (let i = 0; i < d.shield; i++) icon(c, 'shield', 34 + d.maxHp * 9 + 3 + i * 9, 15);
  text(c, `WAVE ${d.wave}`, 34, 25, '4'); text(c, `KILLS ${d.kills}`, 84, 25, '3');
  if (btn(c, '', 146, 6, 24, 22, { draw: (cc, x, y) => icon(cc, 'pause', x + 8, y + 7) })) S.pause = true;
}

function boardTap(g) {
  const pt = tap(BX, BY, 160, 160);
  if (!pt) return;
  const tx = Math.floor((pt.x - BX) / TILE), ty = Math.floor((pt.y - BY) / TILE);
  S.cursor = { tx, ty, t: 0 };
  if (S.aim >= 0) ability(g, tx, ty, S.aim); else move(g, tx, ty);
  S.aim = -1;
}

function checkmate(c) {
  const d = Math.min(1, (S.over - 0.3) / 0.25);
  rect(c, 0, 96, W, 36, '0'); rect(c, 0, 97, W, 1, 'r'); rect(c, 0, 130, W, 1, 'r');
  text(c, 'CHECKMATE', W / 2, 104 + Math.round((1 - d) * -20), 'R', { align: 'c', scale: 3, shadow: 'r' });
}

function cards(c, g) {
  c.drawImage(F.overlays().dark, 0, 0);
  text(c, `WAVE ${g.wave} CLEARED`, W / 2, 36, '5', { align: 'c', shadow: '0' });
  text(c, 'CHOOSE AN UPGRADE', W / 2, 46, '4', { align: 'c' });
  g.choices.forEach((id, i) => {
    const y = 58 + i * 62, tt = S.buffT - i * 0.25;
    if (tt < 0) return;
    const p = Math.min(1, tt / 0.35), full = 152, w = Math.max(2, Math.round(full * Math.abs(1 - 2 * p))), x = Math.round(W / 2 - w / 2);
    if (p < 0.5) { panel(c, x, y, w, 54, { fill: '3' }); if (w > 8) ditherRect(c, x + 3, y + 3, w - 6, 48, 6, '4'); return; }
    if (p < 1) { panel(c, x, y, w, 54, { fill: '2' }); return; }
    const b = BUFFS[id];
    if (btn(c, '', x, y, full, 54, { draw: (cc, bx, by) => {
      text(cc, b.name, bx + 8, by + 8, '5', { shadow: '0' });
      wrap(b.desc, 136).slice(0, 3).forEach((l, k) => text(cc, l, bx + 8, by + 20 + k * 8, '4'));
      text(cc, COMMON.includes(id) ? 'COMMON' : PIECES[g.piece].name, bx + 8, by + 45, '3');
    } })) { choose(g, i); S.buffT = 0; }
  });
}

function pause(c, g) {
  c.drawImage(F.overlays().dark, 0, 0);
  panel(c, 24, 84, 128, 116, { fill: '1' });
  text(c, 'PAUSED', W / 2, 94, '5', { align: 'c', shadow: '0' });
  if (btn(c, 'RESUME', 36, 108, 104, 24)) S.pause = false;
  if (btn(c, 'SETTINGS', 36, 136, 104, 24)) { app.from = 'play'; app.go('settings'); }
  if (btn(c, 'RESIGN', 36, 164, 104, 24)) finish(g, false);
}
