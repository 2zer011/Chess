import { cheb } from './moves.js';

const near = (g, r) => g.enemies.filter(e => cheb(e, g.p) <= r);
const heal = (g, n) => { g.p.hp = Math.min(g.p.maxHp, g.p.hp + n); };
const debuff = (g, e, kind) => g.ev.push({ t: 'debuff', e, kind });
const sgn = Math.sign;
// clear straight line (row / column / diagonal) from the player to (x,y)?
const clearLine = (g, x, y) => {
  const dx = x - g.p.x, dy = y - g.p.y;
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return false;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i < n; i++) if (g.at(g.p.x + sgn(dx) * i, g.p.y + sgn(dy) * i)) return false;
  return true;
};

// kind/range = movement. stats are copied onto g.p and tuned by buffs.
// ability: target 'none' | 'enemy' | 'empty' | 'dir'; reach = max chebyshev distance; free = does not end the turn;
// valid(g,x,y,e) = extra target filter. Every piece has two abilities.
export const PIECES = {
  void: {
    name: 'Void', kind: 'king', range: 1, hp: 3, stats: { radius: 1 },
    desc: 'KING STEP. THE EMPTINESS DEVOURS.',
    abilities: [
      { name: 'ERASE', cd: 5, desc: 'DELETES ALL ENEMIES AROUND YOU.', target: 'none', run: g => near(g, g.p.radius).forEach(e => g.kill(e)) },
      { name: 'DEVOUR', cd: 4, desc: 'EAT AN ADJACENT ENEMY AND HEAL 1.', target: 'enemy', reach: 1, run: (g, x, y) => { g.kill(g.at(x, y)); heal(g, 1); } },
    ],
    buffs: ['abyss', 'hungry', 'rift'],
  },
  error: {
    name: 'Error', kind: 'knight', range: 1, hp: 3, stats: { glitch: 0.2, stunT: 1 },
    desc: 'KNIGHT JUMP. ENEMIES GLITCH 20% OF THE TIME.',
    abilities: [
      {
        name: 'SWAP', cd: 3, desc: 'TRADE PLACES WITH AN ENEMY WITHIN 3 TILES AND STUN IT.', target: 'enemy', reach: 3,
        run: (g, x, y) => { const e = g.at(x, y); [e.x, e.y, g.p.x, g.p.y] = [g.p.x, g.p.y, e.x, e.y]; e.stun = g.p.stunT; debuff(g, e, 'stun'); },
      },
      {
        name: 'OVERFLOW', cd: 5, desc: 'STUN EVERY ENEMY IN YOUR ROW AND COLUMN.', target: 'none',
        run: g => g.enemies.filter(e => e.x === g.p.x || e.y === g.p.y).forEach(e => { e.stun = Math.max(e.stun, g.p.stunT); debuff(g, e, 'stun'); }),
      },
    ],
    buffs: ['glitch', 'segfault', 'bsod'],
  },
  time: {
    name: 'Time', kind: 'king', range: 1, hp: 3, stats: { freezeT: 1 },
    desc: 'KING STEP. MASTER OF THE TURN ORDER.',
    abilities: [
      { name: 'FREEZE', cd: 6, desc: 'FREE ACTION. ENEMIES SKIP THEIR NEXT TURN.', target: 'none', free: true, run: g => { g.freeze += g.p.freezeT; } },
      { name: 'TIME LOCK', cd: 5, desc: 'STUN EVERY ENEMY WITHIN 2 TILES.', target: 'none', run: g => near(g, 2).forEach(e => { e.stun = Math.max(e.stun, 1); debuff(g, e, 'stun'); }) },
    ],
    buffs: ['stasis', 'sprint', 'paradox'],
  },
  space: {
    name: 'Space', kind: 'rook', range: 3, hp: 3, stats: {},
    desc: 'ROOK SLIDE, 3 TILES. BENDS SPACE.',
    abilities: [
      {
        name: 'WARP', cd: 4, desc: 'JUMP TO ANY EMPTY TILE.', target: 'empty', reach: 8,
        run: (g, x, y) => {
          const e = g.at(x, y);
          if (e) g.kill(e);
          g.p.x = x; g.p.y = y;
          if (g.p.shock) near(g, 1).forEach(n => { n.stun = 1; debuff(g, n, 'stun'); });
        },
      },
      { name: 'LANCE', cd: 4, desc: 'KILL AN ENEMY ON A CLEAR LINE, ANY RANGE.', target: 'enemy', reach: 8, valid: (g, x, y) => clearLine(g, x, y), run: (g, x, y) => g.kill(g.at(x, y)) },
    ],
    buffs: ['expand', 'fold', 'shock'],
  },
  blackhole: {
    name: 'Black Hole', kind: 'king', range: 1, hp: 3, stats: { pull: 1, radius: 1 },
    desc: 'KING STEP. NOTHING ESCAPES IT.',
    abilities: [
      {
        name: 'SINGULARITY', cd: 5, desc: 'PULL ENEMIES IN, THEN CONSUME THE ADJACENT ONES.', target: 'none',
        run: g => {
          for (let i = 0; i < g.p.pull; i++) {
            for (const e of [...g.enemies].sort((a, b) => cheb(a, g.p) - cheb(b, g.p))) {
              const x = e.x + sgn(g.p.x - e.x), y = e.y + sgn(g.p.y - e.y);
              if (!g.at(x, y)) { e.x = x; e.y = y; }
            }
          }
          near(g, g.p.radius).forEach(e => g.kill(e));
        },
      },
      {
        name: 'REPEL', cd: 4, desc: 'SHOVE ENEMIES WITHIN 2 TILES BACK BY 2.', target: 'none',
        run: g => {
          for (const e of near(g, 2).sort((a, b) => cheb(b, g.p) - cheb(a, g.p))) {
            for (let i = 0; i < 2; i++) {
              const x = e.x + sgn(e.x - g.p.x), y = e.y + sgn(e.y - g.p.y);
              if (x < 0 || y < 0 || x > 7 || y > 7 || g.at(x, y)) break;
              e.x = x; e.y = y;
            }
          }
        },
      },
    ],
    buffs: ['gravity', 'horizon', 'accretion'],
  },
  parasite: {
    name: 'Parasite', kind: 'king', range: 1, hp: 3, stats: { infT: 2, spread: 1 },
    desc: 'KING STEP. TAKES THE MOVES OF WHAT IT EATS.',
    onCapture: (g, e) => { g.p.host = e.kind === 'pawn' ? null : e.kind; },
    abilities: [
      { name: 'INFECT', cd: 3, desc: 'MARK AN ENEMY IN 2 TILES. DIES IN 2 TURNS, SPREADS.', target: 'enemy', reach: 2, run: (g, x, y) => { const e = g.at(x, y); e.inf = g.p.infT; debuff(g, e, 'infect'); } },
      { name: 'SPORES', cd: 5, desc: 'INFECT EVERY ENEMY NEXT TO YOU.', target: 'none', run: g => near(g, 1).forEach(e => { e.inf = g.p.infT; debuff(g, e, 'infect'); }) },
    ],
    buffs: ['virulent', 'plague', 'devour'],
  },
  blackking: {
    name: 'Black King', kind: 'king', range: 1, hp: 4, stats: { shot: 3, cone: 0.7 },
    desc: 'KING STEP. HE CARRIES A SHOTGUN.',
    abilities: [
      {
        name: 'SHOTGUN', cd: 4, desc: 'BLAST A CONE. KILLS EVERYTHING INSIDE.', target: 'dir', reach: 1,
        run: (g, x, y) => {
          const dx = x - g.p.x, dy = y - g.p.y, dl = Math.hypot(dx, dy);
          g.enemies.filter(e => {
            const vx = e.x - g.p.x, vy = e.y - g.p.y, d = cheb(e, g.p), vl = Math.hypot(vx, vy);
            return d <= g.p.shot && (vx * dx + vy * dy) / (vl * dl) >= g.p.cone - 0.001;
          }).forEach(e => g.kill(e));
        },
      },
      { name: 'GUARD', cd: 6, desc: 'FREE ACTION. GAIN 2 SHIELDS.', target: 'none', free: true, run: g => { g.p.shield += 2; } },
    ],
    buffs: ['barrel', 'spread', 'plate'],
  },
};
for (const p of Object.values(PIECES)) { p.ability = p.abilities[0]; p.cd = p.abilities[0].cd; }
