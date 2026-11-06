// Shared mutable state: save data, current game, scene navigation.
import { load, save } from './storage.js';
import { check } from './achievements.js';

export const app = { sv: load(), g: null, summary: null, from: 'title', go: () => {} };

export function finishRun(g, died) {
  const s = app.sv.stats;
  s.kills += g.kills; s.abil += g.abil; s.runs++; s.best = Math.max(s.best, g.wave);
  const won = check(app.sv);
  save(app.sv);
  return { piece: g.piece, wave: g.wave, kills: g.kills, abil: g.abil, buffs: [...g.buffs], won, died };
}
export const persist = () => save(app.sv);
