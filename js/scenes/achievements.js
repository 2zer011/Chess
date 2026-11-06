import { W } from '../art/palette.js';
import { text, wrap } from '../art/font.js';
import { panel } from '../gfx/pixel.js';
import { drawIcon, icon } from '../gfx/sprites.js';
import { ACH } from '../achievements.js';
import { btn, bar } from '../ui/ui.js';
import { app } from '../app.js';
import { bg, title } from './common.js';

export default {
  update() {},
  draw(c) {
    bg(c);
    title(c, 'ACHIEVEMENTS');
    ACH.forEach((a, i) => {
      const y = 22 + i * 42, done = app.sv.done.includes(a.id), v = Math.min(a.val(app.sv.stats), a.goal);
      panel(c, 8, y, 160, 38, { fill: done ? '2' : '1' });
      drawIcon(c, a.unlock, 12, y + 7, !app.sv.unlocked.includes(a.unlock), false);
      text(c, a.name, 42, y + 4, done ? '5' : '4');
      wrap(a.desc, 110).slice(0, 2).forEach((l, k) => text(c, l, 42, y + 12 + k * 8, '3'));
      bar(c, 42, y + 29, 90, v / a.goal);
      text(c, `${v}/${a.goal}`, 138, y + 29, '4');
      if (done) icon(c, 'check', 152, y + 6);
    });
    if (btn(c, 'BACK', 8, 240, 160, 24)) app.go('title');
  },
};
