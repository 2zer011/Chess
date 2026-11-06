import { cheb } from './moves.js';

const near = (g, r) => g.enemies.filter(e => cheb(e, g.p) <= r);

// kind/range = how the piece moves. stats are copied onto g.p and tuned by buffs.
// ability.target: 'none' | 'enemy' | 'empty'; reach = max chebyshev distance; free = does not end the turn.
export const PIECES = {
  void: {
    name: 'Void', kind: 'king', range: 1, hp: 3, cd: 5, stats: { radius: 1 },
    desc: 'KING STEP. THE EMPTINESS DEVOURS.',
    ability: {
      name: 'ERASE', desc: 'DELETES ALL ENEMIES AROUND YOU.', target: 'none',
      run: g => near(g, g.p.radius).forEach(e => g.kill(e)),
    },
    buffs: ['abyss', 'hungry', 'rift'],
  },
  error: {
    name: 'Error', kind: 'knight', range: 1, hp: 3, cd: 3, stats: { glitch: 0.2, stunT: 1 },
    desc: 'KNIGHT JUMP. ENEMIES GLITCH 20% OF THE TIME.',
    ability: {
      name: 'SWAP', desc: 'TRADE PLACES WITH AN ENEMY WITHIN 3 TILES AND STUN IT.', target: 'enemy', reach: 3,
      run: (g, x, y) => {
        const e = g.at(x, y);
        [e.x, e.y, g.p.x, g.p.y] = [g.p.x, g.p.y, e.x, e.y];
        e.stun = g.p.stunT;
        g.ev.push({ t: 'debuff', e, kind: 'stun' });
      },
    },
    buffs: ['glitch', 'segfault', 'bsod'],
  },
  time: {
    name: 'Time', kind: 'king', range: 1, hp: 3, cd: 6, stats: { freezeT: 1 },
    desc: 'KING STEP. MASTER OF THE TURN ORDER.',
    ability: {
      name: 'FREEZE', desc: 'FREE ACTION. ENEMIES SKIP THEIR NEXT TURN.', target: 'none', free: true,
      run: g => { g.freeze += g.p.freezeT; },
    },
    buffs: ['stasis', 'sprint', 'paradox'],
  },
  space: {
    name: 'Space', kind: 'rook', range: 3, hp: 3, cd: 4, stats: {},
    desc: 'ROOK SLIDE, 3 TILES. BENDS SPACE.',
    ability: {
      name: 'WARP', desc: 'JUMP TO ANY EMPTY TILE.', target: 'empty', reach: 8,
      run: (g, x, y) => {
        const e = g.at(x, y);
        if (e) g.kill(e);
        g.p.x = x; g.p.y = y;
        if (g.p.shock) near(g, 1).forEach(n => { n.stun = 1; g.ev.push({ t: 'debuff', e: n, kind: 'stun' }); });
      },
    },
    buffs: ['expand', 'fold', 'shock'],
  },
  blackhole: {
    name: 'Black Hole', kind: 'king', range: 1, hp: 3, cd: 5, stats: { pull: 1, radius: 1 },
    desc: 'KING STEP. NOTHING ESCAPES IT.',
    ability: {
      name: 'SINGULARITY', desc: 'PULL ENEMIES IN, THEN CONSUME THE ADJACENT ONES.', target: 'none',
      run: g => {
        for (let i = 0; i < g.p.pull; i++) {
          for (const e of [...g.enemies].sort((a, b) => cheb(a, g.p) - cheb(b, g.p))) {
            const x = e.x + Math.sign(g.p.x - e.x), y = e.y + Math.sign(g.p.y - e.y);
            if (!g.at(x, y)) { e.x = x; e.y = y; }
          }
        }
        near(g, g.p.radius).forEach(e => g.kill(e));
      },
    },
    buffs: ['gravity', 'horizon', 'accretion'],
  },
  parasite: {
    name: 'PARASITE', kind: 'king', range: 1, hp: 3, cd: 3, stats: { infT: 2, spread: 1 },
    desc: 'KING STEP. TAKES THE MOVES OF WHAT IT EATS.',
    onCapture: (g, e) => { g.p.host = e.kind === 'pawn' ? null : e.kind; },
    ability: {
      name: 'INFECT', desc: 'MARK AN ENEMY WITHIN 2 TILES. IT DIES IN 2 TURNS AND SPREADS.', target: 'enemy', reach: 2,
      run: (g, x, y) => { const e = g.at(x, y); e.inf = g.p.infT; g.ev.push({ t: 'debuff', e, kind: 'infect' }); },
    },
    buffs: ['virulent', 'plague', 'devour'],
  },
};
