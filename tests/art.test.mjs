// Pure checks on the art data (no canvas needed).
import assert from 'node:assert/strict';
import { SPRITES } from '../js/art/sprites-data.js';
import { ICONS } from '../js/art/icons.js';
import { FONT_GLYPHS, textW } from '../js/art/font.js';
import { parseAscii } from '../js/gfx/pixel.js';
import { CHARS } from '../js/gfx/sprites.js';
import { PIECES } from '../js/pieces.js';

const OK = /^[.0-5rRiabc]+$/;
for (const [k, d] of Object.entries(SPRITES)) {
  const g = parseAscii(d.rows, d.mirror);
  assert.equal(g.length, 16, `${k} should be 16 rows`);
  assert.equal(g[0].length, 16, `${k} should be 16 cols`);
  g.forEach(r => assert.match(r, OK, `${k} has an unknown palette char`));
}
for (const [k, r] of Object.entries(ICONS)) parseAscii(r).forEach(row => assert.match(row, OK, k));
for (const [k, g] of Object.entries(FONT_GLYPHS)) {
  assert.equal(g.length, 5, `glyph ${k} needs 5 rows`);
  g.forEach(r => assert.equal(r.length, g[0].length, `glyph ${k} ragged`));
}
assert.ok(textW('CHECKMATE', 3) <= 176, 'CHECKMATE banner must fit the screen');
const PROCEDURAL = ['space', 'blackhole'];
for (const [id, p] of Object.entries(PIECES)) assert.equal(p.abilities.length, 2, id + ' needs two abilities'); // drawn by code in gfx/sprites.js, no grid
for (const id of CHARS) assert.ok(PIECES[id] && (SPRITES[id] || PROCEDURAL.includes(id)), `${id} needs a piece and art`);
for (const id of ['pawn', 'knight', 'bishop', 'rook', 'queen']) assert.ok(SPRITES[id]);
console.log('art ok');
