// Pure game logic: no DOM, so it runs under node for tests.
import { N, inb, cheb, targets } from './moves.js';
import { PIECES } from './pieces.js';
import { BUFFS, COMMON } from './buffs.js';

const COST = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 };
const FROM_WAVE = { pawn: 1, knight: 2, bishop: 2, rook: 4, queen: 6 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function newGame(id, rng = Math.random) {
  const d = PIECES[id];
  const g = {
    rng, piece: id, ctx: 'turn', wave: 0, kills: 0, abil: 0, freeze: 0, phase: 'play', // play | buff | over
    ev: [], enemies: [], choices: [], buffs: [], hooks: { kill: [], ability: [] },
    p: { x: 3, y: N - 1, hp: d.hp, maxHp: d.hp, kind: d.kind, range: d.range, cd: 0, cdMax: d.abilities[0].cd, cd2: 0, cdMax2: d.abilities[1].cd, shield: 0, host: null, ...d.stats },
  };
  g.at = (x, y) => (g.p.x === x && g.p.y === y ? g.p : g.enemies.find(e => e.x === x && e.y === y));
  g.kill = e => kill(g, e);
  spawnWave(g);
  return g;
}

function kill(g, e) {
  const i = g.enemies.indexOf(e);
  if (i < 0) return;
  g.enemies.splice(i, 1);
  g.kills++;
  g.ev.push({ t: 'kill', e, x: e.x, y: e.y, kind: e.kind, cause: g.ctx, kills: g.kills });
  for (const h of g.hooks.kill) h(g, e);
}

export const moves = g => targets(g, g.p, g.p.host || g.p.kind, g.p.host ? 8 : g.p.range);

export function move(g, x, y) {
  if (g.phase !== 'play' || !moves(g).some(s => s.x === x && s.y === y)) return false;
  const e = g.at(x, y);
  g.ev.push({ t: 'move', fx: g.p.x, fy: g.p.y, x, y, cap: !!e });
  g.ctx = 'capture';
  if (e) { g.kill(e); PIECES[g.piece].onCapture?.(g, e); }
  g.ctx = 'turn';
  g.p.x = x; g.p.y = y;
  endTurn(g);
  return true;
}

export function abilityTargets(g, slot = 0) {
  const a = PIECES[g.piece].abilities[slot], out = [];
  if (a.target === 'none') return out;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const e = g.at(x, y), d = cheb({ x, y }, g.p);
    if (!d || d > a.reach) continue;
    let ok = a.target === 'enemy' ? !!e : a.target === 'dir' ? true : (!e || g.p.capWarp);
    if (ok && a.valid) ok = a.valid(g, x, y, e);
    if (ok) out.push({ x, y });
  }
  return out;
}

export const cdOf = (g, slot) => (slot ? g.p.cd2 : g.p.cd);

export function ability(g, x, y, slot = 0) {
  const a = PIECES[g.piece].abilities[slot];
  if (g.phase !== 'play' || cdOf(g, slot) > 0) return false;
  if (a.target !== 'none' && !abilityTargets(g, slot).some(s => s.x === x && s.y === y)) return false;
  const fx = g.p.x, fy = g.p.y, before = g.enemies.map(e => [e, e.x, e.y]);
  g.ev.push({ t: 'ability', slot, fx, fy, x, y });
  g.ctx = 'ability';
  a.run(g, x, y);
  g.ctx = 'turn';
  const moved = before.filter(([e, ex, ey]) => g.enemies.includes(e) && (e.x !== ex || e.y !== ey)).map(([e]) => ({ e, x: e.x, y: e.y }));
  g.ev.push({ t: 'abilityEnd', moved, px: g.p.x, py: g.p.y, hp: g.p.hp, maxHp: g.p.maxHp, shield: g.p.shield });
  g.abil++;
  if (slot) g.p.cd2 = g.p.cdMax2 + 1; else g.p.cd = g.p.cdMax + 1; // endTurn ticks it down once
  for (const h of g.hooks.ability) h(g);
  if (!a.free) endTurn(g);
  return true;
}

export function choose(g, i) {
  if (g.phase !== 'buff' || !g.choices[i]) return;
  BUFFS[g.choices[i]].apply(g);
  g.buffs.push(g.choices[i]);
  g.ev.push({ t: 'buff' });
  g.phase = 'play';
  spawnWave(g);
}

// Squares enemies can hit next phase (for the red overlay).
export const threats = g => g.enemies.flatMap(e => attacks(g, e)).filter(s => inb(s.x, s.y));

export const attackers = g => g.enemies.filter(e => attacks(g, e).some(s => s.x === g.p.x && s.y === g.p.y));

const attacks = (g, e) => (e.kind === 'pawn'
  ? [{ x: e.x - 1, y: e.y + 1 }, { x: e.x + 1, y: e.y + 1 }]
  : targets(g, e, e.kind));
const stepsOf = (g, e) => (e.kind === 'pawn'
  ? [{ x: e.x, y: e.y + 1 }, { x: e.x - 1, y: e.y }, { x: e.x + 1, y: e.y }].filter(s => inb(s.x, s.y))
  : targets(g, e, e.kind));

function endTurn(g) {
  tickInfection(g);
  if (!g.enemies.length) return clear(g);
  if (g.freeze > 0) { g.freeze--; g.ev.push({ t: 'frozen' }); } else enemyPhase(g);
  g.p.cd = Math.max(0, g.p.cd - 1); g.p.cd2 = Math.max(0, g.p.cd2 - 1);
  if (g.p.hp <= 0) { g.phase = 'over'; return; }
  if (!g.enemies.length) clear(g);
}

function enemyPhase(g) {
  const step = (e, to, glitch) => {
    const f = { x: e.x, y: e.y };
    Object.assign(e, to);
    g.ev.push({ t: 'emove', e, fx: f.x, fy: f.y, x: e.x, y: e.y, glitch });
  };
  for (const e of [...g.enemies]) {
    if (e.stun > 0) { e.stun--; g.ev.push({ t: 'estun', e, left: e.stun }); continue; }
    const opts = stepsOf(g, e).filter(s => !g.at(s.x, s.y));
    if (g.rng() < (g.p.glitch || 0)) { // Error passive: random step instead of acting
      if (opts.length) step(e, opts[Math.floor(g.rng() * opts.length)], true);
      continue;
    }
    if (attacks(g, e).some(s => s.x === g.p.x && s.y === g.p.y)) {
      const blocked = g.p.shield > 0;
      if (blocked) g.p.shield--; else g.p.hp--;
      g.ev.push({ t: 'hit', e, blocked, hp: g.p.hp, shield: g.p.shield, dead: g.p.hp <= 0 });
      if (g.p.hp <= 0) break; // the run is over, nobody else acts
      continue;
    }
    if (opts.length) step(e, opts.reduce((a, b) => (dist(b, g.p) < dist(a, g.p) ? b : a)), false);
  }
}

function tickInfection(g) {
  const sick = g.enemies.filter(e => e.inf);
  sick.forEach(e => e.inf--);
  const dead = sick.filter(e => !e.inf);
  g.ctx = 'infect';
  dead.forEach(e => g.kill(e));
  for (const d of dead) for (const n of g.enemies) {
    if (!n.inf && cheb(n, d) <= g.p.spread) { n.inf = g.p.infT; g.ev.push({ t: 'debuff', e: n, kind: 'infect' }); }
  }
  g.ctx = 'turn';
}

function clear(g) {
  g.p.hp = Math.min(g.p.maxHp, g.p.hp + 1);
  g.phase = 'buff';
  g.ev.push({ t: 'clear' });
  g.choices = [...PIECES[g.piece].buffs, ...COMMON].sort(() => g.rng() - 0.5).slice(0, 3);
}

function spawnWave(g) {
  g.wave++;
  let budget = 2 + g.wave * 2;
  const kinds = Object.keys(COST).filter(k => FROM_WAVE[k] <= g.wave);
  while (budget > 0) {
    const bag = kinds.filter(k => COST[k] <= budget).flatMap(k => Array(Math.ceil(10 / COST[k])).fill(k));
    const free = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < N; x++) {
      if (!g.at(x, y) && cheb({ x, y }, g.p) > 2) free.push({ x, y });
    }
    if (!bag.length || !free.length) break;
    const kind = bag[Math.floor(g.rng() * bag.length)];
    const s = free[Math.floor(g.rng() * free.length)];
    const e = { kind, x: s.x, y: s.y, stun: 0, inf: 0 };
    g.enemies.push(e);
    g.ev.push({ t: 'spawn', e, wave: g.wave });
    budget -= COST[kind];
  }
}
