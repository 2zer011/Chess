// Animation sequencer invariants, run against real random games with a no-op visual adapter.
import assert from 'node:assert/strict';
import { newGame, move, ability, choose, moves, abilityTargets } from '../js/game.js';
import { Director } from '../js/anim/director.js';
import { build } from '../js/anim/steps.js';
import { PIECES } from '../js/pieces.js';

const noop = new Proxy({}, { get: () => () => {} });
function seeded(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function frac(a) { return a.tx !== Math.round(a.tx) || a.ty !== Math.round(a.ty); }

// Plays a whole game. dt = frame time. Returns a trace string for determinism checks.
function play(piece, seed, dt, maxActs = 60) {
  const rng = seeded(seed);
  const g = newGame(piece, rng), D = new Director(noop, piece);
  D.init(g); D.onSync = () => D.sync(g);
  const drain = () => { if (g.ev.length) build(D, g.ev.splice(0)); };
  const settle = () => {
    drain();
    let guard = 0;
    while (!D.idle) {
      D.update(dt);
      assert.ok(D.active <= 1, 'two steps active at once');
      // movement is strictly one piece at a time (abilities may move several: they are one action)
      if (!D.stepName.startsWith('ability')) {
        const moving = D.actors.filter(a => !a.isPlayer && !a.hidden && frac(a));
        assert.ok(moving.length <= 1, `${moving.length} enemies moving together in ${D.stepName}`);
      }
      assert.ok(++guard < 20000, 'sequencer stuck');
    }
    // resolution: display == logic, everything back to idle
    D.sync(g);
    const live = D.actors.filter(a => !a.isPlayer);
    assert.equal(live.length, g.enemies.length, 'actor/enemy count mismatch');
    for (const e of g.enemies) {
      const a = D.actorOf(e);
      assert.equal([a.tx, a.ty].join(), [e.x, e.y].join(), 'enemy display != logic');
      assert.ok(!a.hidden && !a.xformed && !a.owner, 'enemy not recovered');
    }
    if (!D.player.dead) assert.equal([D.player.tx, D.player.ty].join(), [g.p.x, g.p.y].join(), 'player display != logic');
    assert.ok(!D.player.xformed && !D.player.owner, 'player not recovered');
  };
  settle(); // initial spawns
  let trace = '';
  for (let n = 0; n < maxActs && g.phase !== 'over'; n++) {
    if (g.phase === 'buff') { choose(g, 0); settle(); continue; }
    const def = PIECES[piece].ability;
    if (g.p.cd === 0 && rng() < 0.4) {
      const t = abilityTargets(g);
      if (def.target === 'none') ability(g); else if (t.length) { const s = t[Math.floor(rng() * t.length)]; ability(g, s.x, s.y); } else continue;
    } else {
      const m = moves(g); const s = m[Math.floor(rng() * m.length)]; move(g, s.x, s.y);
    }
    settle();
    trace += `${g.p.x}${g.p.y}${g.p.hp}${g.kills}|`;
  }
  return { trace, log: D.log.join(), D, g };
}

for (const piece of ['void', 'error', 'time', 'space', 'blackhole', 'parasite']) {
  for (const seed of [1, 2, 3]) play(piece, seed, 1 / 60);
}

{ // frame-rate independence: same game, 144 / 60 / 20 fps
  const a = play('void', 7, 1 / 144), b = play('void', 7, 1 / 60), c = play('void', 7, 1 / 20);
  assert.equal(a.trace, b.trace); assert.equal(b.trace, c.trace);
  assert.equal(a.log, b.log); assert.equal(b.log, c.log);
}
{ // order inside a capture: anticipation -> movement -> impact -> reaction -> resolution -> recovery
  const g = newGame('void', () => 0.5), D = new Director(noop, 'void');
  D.init(g); build(D, g.ev.splice(0)); D.flush();
  g.enemies = [{ kind: 'rook', x: 3, y: 6, stun: 0, inf: 0 }, { kind: 'pawn', x: 0, y: 0, stun: 0, inf: 0 }];
  D.addEnemy(g.enemies[0]); D.addEnemy(g.enemies[1]); g.enemies.forEach(e => { D.actorOf(e).hidden = false; });
  D.log.length = 0; move(g, 3, 6); build(D, g.ev.splice(0)); D.flush();
  const names = D.log.filter(s => s.startsWith('move:')).map(s => s.split(':')[1]);
  assert.deepEqual(names, ['anticipation', 'movement', 'impact', 'reaction', 'resolution', 'landing', 'recovery']);
  assert.ok(D.log.indexOf('<move') < D.log.indexOf('>enemyMove'), 'enemy moved before the player finished');
}
{ // conflict guard + cancel
  const g = newGame('void', () => 0.5), D = new Director(noop, 'void');
  D.init(g); build(D, g.ev.splice(0));
  D.update(0.05); assert.ok(!D.idle);
  D.reset(); assert.ok(D.idle && D.actors.length === 1 && D.active === 0, 'reset must cancel everything');
  const s1 = { name: 'a' }, s2 = { name: 'b' };
  D.player.claim(s1); assert.throws(() => D.player.claim(s2), /conflict/);
}
console.log('anim ok');
