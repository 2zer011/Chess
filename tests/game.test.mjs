import assert from 'node:assert/strict';
import { newGame, move, ability, choose, moves } from '../js/game.js';
import { check } from '../js/achievements.js';

const pawn = (x, y) => ({ kind: 'pawn', x, y, stun: 0, inf: 0 });
const rng = () => 0.5;

{ // wave 1 spawns pawns; king at bottom edge has 5 moves
  const g = newGame('void', rng);
  assert.ok(g.enemies.length >= 1 && g.enemies.every(e => e.kind === 'pawn'));
  assert.equal(moves(g).length, 5);
}
{ // enemy pawn hits diagonally forward
  const g = newGame('void', rng);
  g.enemies = [pawn(3, 6), pawn(0, 0)];
  assert.ok(move(g, 2, 7));
  assert.equal(g.p.hp, 2);
}
{ // clearing the wave offers 3 buffs, picking one starts wave 2
  const g = newGame('void', rng);
  g.enemies = [pawn(3, 6)];
  assert.ok(move(g, 3, 6));
  assert.equal(g.phase, 'buff');
  assert.equal(g.choices.length, 3);
  choose(g, 0);
  assert.equal(g.phase, 'play');
  assert.equal(g.wave, 2);
}
{ // void erase kills adjacent only
  const g = newGame('void', rng);
  g.enemies = [pawn(3, 6), pawn(0, 0)];
  assert.ok(ability(g));
  assert.equal(g.enemies.length, 1);
  assert.equal(g.p.cd, 5);
  assert.equal(ability(g), false);
}
{ // black hole pulls then eats the adjacent ring
  const g = newGame('blackhole', rng);
  g.enemies = [pawn(3, 5), pawn(0, 0)];
  assert.ok(ability(g));
  assert.equal(g.enemies.length, 1);
}
{ // parasite infection kills after 2 turns and spreads
  const g = newGame('parasite', rng);
  g.enemies = [pawn(3, 5), pawn(3, 4)];
  g.freeze = 9;
  assert.ok(ability(g, 3, 5));
  assert.ok(move(g, 4, 7));
  assert.equal(g.enemies.length, 1);
  assert.equal(g.enemies[0].inf, 2);
}
{ // time freeze is a free action
  const g = newGame('time', rng);
  g.enemies = [pawn(3, 6), pawn(0, 0)];
  assert.ok(ability(g));
  assert.equal(g.freeze, 1);
  assert.ok(move(g, 2, 7));
  assert.equal(g.p.hp, 3); // enemies skipped their phase
}
{ // achievements unlock pieces once
  const sv = { stats: { kills: 30, best: 5, abil: 0 }, done: [], unlocked: ['void'] };
  assert.equal(check(sv).length, 2);
  assert.deepEqual(sv.unlocked, ['void', 'error', 'time']);
  assert.equal(check(sv).length, 0);
}
console.log('ok');
