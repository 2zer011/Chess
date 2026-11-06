// Turns logic events (g.ev) into ordered animation Steps.
// Every action follows: anticipation -> movement/action -> impact -> reaction -> resolution -> recovery.
import { BX, BY, TILE } from '../art/palette.js';
import { lerp, easeInOut, easeOut, easeIn, easeOutBack, pulse, clamp } from './ease.js';

const ph = (name, dur, o = {}) => ({ name, dur, ...o });
const step = (name, actors, phases) => ({ name, actors: [...new Set(actors)], phases });
const HEAVY = k => k !== 'pawn';
const CRIT = k => k === 'queen' || k === 'rook';
const ctr = (tx, ty) => [BX + tx * TILE + 10, BY + ty * TILE + 10];
const rnd = () => Math.random();

const stretch = (A, dx, dy, s) => {
  if (Math.abs(dx) >= Math.abs(dy)) { A.sx = 1 + 0.16 * s; A.sy = 1 - 0.12 * s; } else { A.sy = 1 + 0.16 * s; A.sx = 1 - 0.1 * s; }
};
const landing = (D, A, dur = 0.08) => ph('landing', dur, {
  enter() { D.v.dust(A); },
  tick(p) { const e = easeOutBack(p); A.sx = lerp(1.1, 1, e); A.sy = lerp(0.8, 1, e); },
});

// Flash + hit-stop + particles + (limited) shake at the moment of contact.
function impactFx(D, x, y, o = {}) {
  const V = D.v, crit = o.crit;
  V.flash(x, y, crit ? 11 : o.r || 8, crit ? 0.1 : 0.08);
  V.hitstop(crit ? 0.1 : o.hit ?? 0.05);
  V.burst(x, y, crit ? 28 : 12, ['5', '4', 'w'], { spd: crit ? 85 : 55 });
  V.ring(x, y, crit ? 26 : o.ring || 16, 0.22, 'w', 0);
  const sh = crit ? 4 : o.shake ?? (o.heavy ? 2 : 0);
  if (sh) V.shake(sh);
  if (crit) V.float(x, y - 14, 'CRITICAL!', 'R');
}

// Death: blink, then burst into the sprite's own pixels.
function killTick(D, actors, p) {
  for (const a of actors) {
    if (a.dead) continue;
    if (p < 0.33) a.flash = ((p * 36) | 0) % 2 === 0;
    else { a.flash = false; a.hidden = true; a.dead = true; D.v.scatter(a); D.v.flash(a.cx, a.cy, 6, 0.06); a.infShown = false; }
  }
}
const deathPhase = (D, actors, kills) => ph('reaction', 0.38, {
  tick(p) { killTick(D, actors, p); },
  exit() { if (kills) D.disp.kills = Math.max(D.disp.kills, kills); },
});

export function build(D, evs) {
  const busy = evs.filter(e => ['emove', 'hit', 'estun', 'spawn'].includes(e.t)).length;
  const spd = clamp(busy / 3, 1, 2.5); // long enemy turns play faster, still one piece at a time
  for (let i = 0; i < evs.length;) {
    const ev = evs[i++];
    let st = null, fast = false;
    switch (ev.t) {
      case 'spawn': D.addEnemy(ev.e); st = spawnStep(D, ev); fast = true; break;
      case 'move': { const ks = []; while (evs[i] && evs[i].t === 'kill') ks.push(evs[i++]); st = moveStep(D, ev, ks); break; }
      case 'ability': {
        const body = []; while (evs[i] && evs[i].t !== 'abilityEnd') body.push(evs[i++]);
        st = abilityStep(D, ev, body, evs[i++]); break;
      }
      case 'kill': { const ks = [ev]; while (evs[i] && evs[i].t === 'kill') ks.push(evs[i++]); st = step('death', ks.map(k => D.actorOf(k.e)), [deathPhase(D, ks.map(k => D.actorOf(k.e)), ks.at(-1).kills)]); break; }
      case 'debuff': st = debuffStep(D, ev); break;
      case 'emove': st = enemyMoveStep(D, ev); fast = true; break;
      case 'hit': st = enemyAttackStep(D, ev); fast = true; break;
      case 'estun': st = stunStep(D, ev); fast = true; break;
      case 'frozen': st = step('frozen', [], [ph('freeze', 0.25, { enter() { D.actors.forEach(a => { a.frost = false; }); D.v.float(BX + 80, BY + 80, 'FROZEN', '4'); } })]); break;
      case 'clear': st = step('clear', [], [ph('clear', 0.45, { enter() { D.v.float(BX + 80, BY + 70, 'WAVE CLEAR', '5'); D.v.burst(BX + 80, BY + 80, 20, ['5', '4', 'w'], { spd: 70, z: 1 }); } })]); break;
      case 'buff': st = step('buff', [D.player], [ph('buff', 0.6, { enter() { D.v.buff(D.player); }, exit() { D.onSync?.(); } })]); break;
    }
    if (st) { st.spd = fast ? spd : 1; D.push(st); }
  }
}

function spawnStep(D, ev) {
  const A = D.actorOf(ev.e), x = ev.e.x, y = ev.e.y;
  return step('spawn', [A], [
    ph('drop', 0.16, { enter() { A.hidden = false; A.tx = x; A.ty = y - 4; D.disp.wave = ev.wave; }, tick(p) { A.ty = lerp(y - 4, y, easeIn(p)); }, exit() { A.ty = y; } }),
    landing(D, A, 0.06),
  ]);
}

function moveStep(D, ev, kills) {
  const P = D.player, V = D.v, dx = ev.x - ev.fx, dy = ev.y - ev.fy;
  const dist = Math.max(Math.abs(dx), Math.abs(dy)), dir = Math.sign(dx);
  const victims = kills.map(k => D.actorOf(k.e)), cap = victims.length > 0, frac = cap ? 0.62 : 1;
  const crit = kills.length >= 3 || kills.some(k => CRIT(k.kind)), heavy = kills.some(k => HEAVY(k.kind));
  const [vx, vy] = ctr(ev.x, ev.y);
  const phases = [
    ph('anticipation', 0.08, { enter() { if (dx) P.flip = dx < 0; }, tick(p) { const e = easeOut(p); P.sx = lerp(1, 1.12, e); P.sy = lerp(1, 0.84, e); P.lean = -dir * Math.round(e); } }),
    ph('movement', 0.12 + 0.045 * dist, {
      tick(p) {
        const e = easeInOut(p) * frac, s = pulse(p);
        P.tx = ev.fx + dx * e; P.ty = ev.fy + dy * e; P.oy = -Math.round(s * 3);
        stretch(P, dx, dy, s); P.lean = dir * Math.round(2 * s); V.trail(P);
      },
      exit() { P.oy = 0; if (!cap) { P.tx = ev.x; P.ty = ev.y; } },
    }),
  ];
  if (!cap) phases.push(landing(D, P));
  else {
    phases.push(ph('impact', 0.06, { enter() { impactFx(D, vx, vy, { crit, heavy }); } }));
    phases.push(deathPhase(D, victims, kills.at(-1).kills));
    phases.push(ph('resolution', 0.09, {
      tick(p) { const e = easeOut(p); P.tx = lerp(ev.fx + dx * frac, ev.x, e); P.ty = lerp(ev.fy + dy * frac, ev.y, e); },
      exit() { P.tx = ev.x; P.ty = ev.y; },
    }));
    phases.push(landing(D, P, 0.07));
  }
  phases.push(ph('recovery', 0.05));
  return step('move', [P, ...victims], phases);
}

function enemyMoveStep(D, ev) {
  const A = D.actorOf(ev.e), dx = ev.x - ev.fx, dy = ev.y - ev.fy, dist = Math.max(Math.abs(dx), Math.abs(dy));
  return step('enemyMove', [A], [
    ph('anticipation', 0.07, { enter() { if (ev.glitch) A.glitch = 0.25; }, tick(p) { const e = easeOut(p); A.sx = lerp(1, 1.1, e); A.sy = lerp(1, 0.86, e); } }),
    ph('movement', 0.1 + 0.04 * dist, {
      tick(p) { const e = easeInOut(p), s = pulse(p); A.tx = ev.fx + dx * e; A.ty = ev.fy + dy * e; A.oy = -Math.round(s * 2); stretch(A, dx, dy, s); },
      exit() { A.tx = ev.x; A.ty = ev.y; A.oy = 0; },
    }),
    landing(D, A, 0.07),
  ]);
}

function enemyAttackStep(D, ev) {
  const A = D.actorOf(ev.e), P = D.player, V = D.v;
  let dx = 0, dy = 0;
  const phases = [
    ph('anticipation', 0.12, {
      enter() { dx = Math.sign(P.tx - A.tx); dy = Math.sign(P.ty - A.ty); V.float(A.cx, A.py - 2, '!', 'R'); },
      tick(p) { const e = easeOut(p); A.ox = -dx * Math.round(2 * e); A.oy = -dy * Math.round(2 * e); A.sy = lerp(1, 0.85, e); A.sx = lerp(1, 1.1, e); },
    }),
    ph('movement', 0.06, { tick(p) { const e = easeIn(p); A.ox = Math.round(lerp(-2 * dx, 5 * dx, e)); A.oy = Math.round(lerp(-2 * dy, 5 * dy, e)); A.sx = 1; A.sy = 1; } }),
    ph('impact', 0.05, {
      enter() {
        V.flash(P.cx, P.cy, ev.blocked ? 7 : 10, 0.08); V.hitstop(0.07); V.shake(ev.blocked ? 1.5 : 3);
        V.burst(P.cx, P.cy, ev.blocked ? 8 : 14, ev.blocked ? ['4', '5'] : ['R', 'r', 'w'], { spd: 60 });
        V.float(P.cx, P.cy - 10, ev.blocked ? 'BLOCK' : '-1', ev.blocked ? '4' : 'R');
        if (!ev.blocked) V.redFlash(0.2);
        D.disp.hp = ev.hp; D.disp.shield = ev.shield;
      },
    }),
    ph('reaction', 0.24, {
      tick(p) {
        const s = pulse(p), px = dy ? 1 : 0, py = dx ? 1 : 0;
        if (ev.blocked) { P.ox = px * Math.round(5 * s); P.oy = py * Math.round(5 * s); V.trail(P); } // dodge: quick sidestep + afterimage
        else { P.flash = p < 0.3; P.ox = dx * Math.round(3 * s); P.oy = dy * Math.round(3 * s); }
        A.ox = Math.round(lerp(5 * dx, 0, easeOut(p))); A.oy = Math.round(lerp(5 * dy, 0, easeOut(p)));
      },
    }),
  ];
  if (ev.dead) phases.push(deathPhase(D, [P], 0));
  phases.push(ph('recovery', 0.05));
  return step('enemyAttack', [A, P], phases);
}

function stunStep(D, ev) {
  const A = D.actorOf(ev.e);
  return step('enemyStun', [A], [ph('stunned', 0.12, { enter() { A.stunShown = ev.left > 0; A.pop = 0.25; }, tick(p) { A.oy = -Math.round(pulse(p) * 2); } })]);
}

function debuffStep(D, ev) {
  const A = D.actorOf(ev.e);
  return step('debuff', [A], [ph('debuff', 0.3, { enter() { applyDebuff(D, A, ev.kind); } })]);
}
function applyDebuff(D, A, kind) {
  A.glitch = 0.3;
  if (kind === 'stun') A.stunShown = true; else A.infShown = true;
  D.v.float(A.cx, A.py - 2, kind === 'stun' ? 'STUN' : 'INFECT', kind === 'stun' ? '5' : 'R');
}

// ---------------- abilities ----------------
function abilityStep(D, ev, body, end) {
  const P = D.player, V = D.v;
  const kills = body.filter(e => e.t === 'kill'), debuffs = body.filter(e => e.t === 'debuff');
  const victims = kills.map(k => D.actorOf(k.e)), deb = debuffs.map(d => ({ a: D.actorOf(d.e), kind: d.kind }));
  const mover = end.moved.map(m => ({ a: D.actorOf(m.e), x: m.x, y: m.y }));
  const crit = kills.length >= 3 || kills.some(k => CRIT(k.kind));
  const c = { P, ev, end, victims, mover, deb, crit, T: (mover[0] || deb[0] || {}).a, k: -1 };
  const plan = PLAN[D.piece](D, c);
  const react = victims.length ? 0.38 : deb.length ? 0.3 : plan.reactDur || 0.12;
  let s0 = null;
  return step('ability', [P, ...victims, ...deb.map(d => d.a), ...mover.map(m => m.a)], [
    ph('anticipation', plan.antic.dur, plan.antic),
    ph('action', plan.action.dur, plan.action),
    ph('impact', 0.07, { enter() { const [x, y] = plan.at(); impactFx(D, x, y, { crit, ...plan.impact }); } }),
    ph('reaction', react, {
      enter() { deb.forEach(d => applyDebuff(D, d.a, d.kind)); plan.react?.enter?.(); },
      tick(p) { if (victims.length) killTick(D, victims, p); plan.react?.tick?.(p); },
      exit() { if (kills.length) D.disp.kills = Math.max(D.disp.kills, kills.at(-1).kills); },
    }),
    ph('recovery', 0.09, { enter() { s0 = { sx: P.sx, sy: P.sy }; }, tick(p) { const e = easeOutBack(p); P.sx = lerp(s0.sx, 1, e); P.sy = lerp(s0.sy, 1, e); } }),
  ]);
}

const squash = (P, sx, sy, p) => { const e = easeOut(p); P.sx = lerp(1, sx, e); P.sy = lerp(1, sy, e); };
// inward particles during a charge-up (throttled by phase progress)
const charge = (D, c, p, r, col, n = 10) => {
  const k = (p * n) | 0; if (k === c.k) return; c.k = k;
  const a = rnd() * 6.283;
  D.v.spark(c.P.cx + Math.cos(a) * r, c.P.cy + Math.sin(a) * r, -Math.cos(a) * r * 3.5, -Math.sin(a) * r * 3.5, col, 0.27);
};
const here = c => () => [c.P.cx, c.P.cy];

const PLAN = {
  void: (D, c) => ({
    antic: { dur: 0.22, tick(p) { squash(c.P, 1.1, 0.78, p); charge(D, c, p, 24, '4'); } },
    action: { dur: 0.16, tick(p) { c.P.ab = p; c.P.sx = lerp(1.1, 0.9, p); c.P.sy = lerp(0.78, 1.15, easeOut(p)); } },
    at: here(c), impact: { r: 12, ring: 30, shake: 2.5 },
  }),
  error: (D, c) => {
    const T = c.T, swap = () => {
      if (c.swapped) return; c.swapped = true;
      c.P.tx = c.end.px; c.P.ty = c.end.py;
      if (T) { T.tx = c.mover[0].x; T.ty = c.mover[0].y; D.v.gather(T, 0.22); }
      D.v.gather(c.P, 0.22);
    };
    return {
      antic: { dur: 0.2, enter() { c.P.glitch = 0.5; D.v.screenGlitch(0.3); }, tick(p) { squash(c.P, 1.08, 0.9, p); c.P.ox = Math.round((rnd() - 0.5) * 2); } },
      action: {
        dur: 0.5,
        enter() { c.P.ox = 0; D.v.scatter(c.P); c.P.hidden = true; if (T) { D.v.scatter(T); T.hidden = true; } },
        tick(p) { if (p >= 0.45) swap(); },
        exit() { swap(); c.P.hidden = false; if (T) T.hidden = false; },
      },
      at: here(c), impact: { r: 11, ring: 20, shake: 1 },
    };
  },
  time: (D, c) => ({
    antic: { dur: 0.2, tick(p) { squash(c.P, 1.06, 0.88, p); charge(D, c, p, 20, '5', 12); } },
    action: { dur: 0.3, tick(p) { c.P.ab = p; } },
    at: here(c), impact: { r: 10, ring: 34, shake: 0, hit: 0.04 }, reactDur: 0.25,
    react: { enter() { D.actors.forEach(a => { if (!a.isPlayer) { a.frost = true; D.v.burst(a.cx, a.cy, 4, ['4', '5'], { spd: 20, g: 0 }); } }); } },
  }),
  space: (D, c) => {
    const warp = () => { if (c.swapped) return; c.swapped = true; c.P.tx = c.end.px; c.P.ty = c.end.py; D.v.gather(c.P, 0.22); };
    return {
      antic: { dur: 0.15, tick(p) { squash(c.P, 1.05, 0.9, p); charge(D, c, p, 18, '5', 8); } },
      action: {
        dur: 0.5,
        enter() { D.v.scatter(c.P); c.P.hidden = true; },
        tick(p) { if (p >= 0.45) warp(); },
        exit() { warp(); c.P.hidden = false; D.v.dust(c.P); },
      },
      at: here(c), impact: { r: 10, ring: 26, shake: 1 },
    };
  },
  blackhole: (D, c) => ({
    antic: {
      dur: 0.25, tick(p) {
        squash(c.P, 1.04, 0.85, p);
        const k = (p * 12) | 0; if (k !== c.k) { c.k = k; const a = rnd() * 6.283; D.v.spark(c.P.cx + Math.cos(a) * 60, c.P.cy + Math.sin(a) * 60, -Math.cos(a) * 160, -Math.sin(a) * 160, '4', 0.35); }
      },
    },
    action: {
      dur: 0.38,
      enter() { c.mover.forEach(m => { m.sx = m.a.tx; m.sy = m.a.ty; }); },
      tick(p) { c.P.ab = p; const e = easeIn(p); c.mover.forEach(m => { m.a.tx = lerp(m.sx, m.x, e); m.a.ty = lerp(m.sy, m.y, e); }); },
      exit() { c.mover.forEach(m => { m.a.tx = m.x; m.a.ty = m.y; }); },
    },
    at: here(c), impact: { r: 12, ring: 30, shake: 3, hit: 0.07 },
  }),
  parasite: (D, c) => {
    let from = null;
    return {
      antic: { dur: 0.2, tick(p) { squash(c.P, 1.18, 0.78, p); charge(D, c, p, 10, 'R', 8); } },
      action: {
        dur: 0.3,
        enter() { from = [c.P.cx, c.P.cy]; },
        tick(p) {
          if (!c.T) return;
          const e = easeInOut(p), x = lerp(from[0], c.T.cx, e), y = lerp(from[1], c.T.cy, e) - Math.round(pulse(p) * 8);
          D.v.spark(x, y, 0, 0, 'R', 0.12); D.v.spark(x + 1, y, 0, 0, 'r', 0.1);
        },
      },
      at: () => (c.T ? [c.T.cx, c.T.cy] : [c.P.cx, c.P.cy]), impact: { r: 8, ring: 14, shake: 0, hit: 0.04 },
    };
  },
};
