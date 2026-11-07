import { W } from '../art/palette.js';
import { text, wrap } from '../art/font.js';
import { panel } from '../gfx/pixel.js';
import { drawIcon, icon } from '../gfx/sprites.js';
import { ACH } from '../achievements.js';
import { accOf } from '../art/palette.js';
import { btn, bar } from '../ui/ui.js';
import { app } from '../app.js';
import { bg, title } from './common.js';

export default {
  update() {},
  draw(c) {
    bg(c);
    title(c, 'ACHIEVEMENTS');
    ACH.forEach((a, i) => {
      const y = 20 + i * 36, done = app.sv.done.includes(a.id), v = Math.min(a.val(app.sv.stats), a.goal);
      panel(c, 8, y, 160, 33, { fill: done ? '2' : '1', hi: done ? accOf(a.unlock).m : '4' });
      drawIcon(c, a.unlock, 11, y + 5, !app.sv.unlocked.includes(a.unlock), false);
      text(c, a.name, 38, y + 3, done ? accOf(a.unlock).l : '4');
      wrap(a.desc, 100).slice(0, 2).forEach((l, k) => text(c, l, 38, y + 10 + k * 8, '3'));
      bar(c, 38, y + 26, 90, v / a.goal);
      text(c, `${v}/${a.goal}`, 132, y + 26, '4');
      if (done) icon(c, 'check', 152, y + 4);
    });
    if (btn(c, 'BACK', 8, 246, 160, 24)) app.go('title');
  },
};
