import { W } from '../art/palette.js';
import { text } from '../art/font.js';
import { rect } from '../gfx/pixel.js';
import { drawChar, drawSilhouette, CHARS } from '../gfx/sprites.js';
import { btn } from '../ui/ui.js';
import { app } from '../app.js';
import { bg } from './common.js';

export default {
  update() {},
  draw(c, t) {
    bg(c);
    text(c, 'CHESS', W / 2, 24, '5', { align: 'c', scale: 4, shadow: '2' });
    text(c, 'WAR', W / 2, 50, 'R', { align: 'c', scale: 4, shadow: 'r' });
    // diorama strip: all six characters on stone
    for (let i = 0; i < 8; i++) rect(c, 8 + i * 20, 100, 20, 20, i % 2 ? '2' : '3');
    CHARS.forEach((id, i) => {
      const x = 14 + i * 24;
      if (app.sv.unlocked.includes(id)) drawChar(c, id, x - 6 + 4, 100, t + i, {}); else drawSilhouette(c, id, x - 2, 100);
    });
    const bx = 28, bw = 120;
    if (btn(c, 'PLAY', bx, 134, bw, 22)) app.go('characters', { mode: 'pick' });
    if (btn(c, 'COLLECTION', bx, 160, bw, 22)) app.go('characters', { mode: 'view' });
    if (btn(c, 'ACHIEVEMENTS', bx, 186, bw, 22)) app.go('achievements');
    if (btn(c, 'SETTINGS', bx, 212, bw, 22)) { app.from = 'title'; app.go('settings'); }
    const s = app.sv.stats;
    text(c, `BEST WAVE ${s.best}   RUNS ${s.runs}`, W / 2, 252, '3', { align: 'c' });
    text(c, 'V0.2', W / 2, 266, '2', { align: 'c' });
  },
};
