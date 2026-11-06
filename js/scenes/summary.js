import { W } from '../art/palette.js';
import { text } from '../art/font.js';
import { panel } from '../gfx/pixel.js';
import { drawUnlock } from '../gfx/sprites.js';
import { burst, shake, fx, drawParticles, update as fxUpdate } from '../gfx/fx.js';
import { PIECES } from '../pieces.js';
import { BUFFS } from '../buffs.js';
import { btn } from '../ui/ui.js';
import { app } from '../app.js';
import { bg, title } from './common.js';

let T = 0, idx = 0, burst0 = false;

export default {
  enter() { T = 0; idx = 0; burst0 = false; },
  update(dt) { T += dt; },
  draw(c, t) {
    bg(c);
    const s = app.summary, unl = s.won.map(a => a.unlock);
    if (idx < unl.length) { // unlock reveal
      title(c, 'NEW PIECE UNLOCKED!', 20);
      c.save(); c.translate(fx.ox, fx.oy);
      panel(c, 48, 52, 80, 80, { fill: '1' });
      const p = Math.min(1, T / 2.2);
      drawUnlock(c, unl[idx], 88, 92, p, t);
      c.restore();
      if (p >= 0.45 && !burst0) { burst0 = true; burst(88, 92, 40, ['5', '4', 'w'], { spd: 70, life: 0.8 }); shake(3); }
      if (p >= 1) {
        text(c, PIECES[unl[idx]].name, W / 2, 144, '5', { align: 'c', shadow: '0' });
        text(c, s.won[idx].name, W / 2, 158, '4', { align: 'c' });
        if (btn(c, 'CONTINUE', 28, 200, 120, 24)) { idx++; T = 0; burst0 = false; }
      }
      drawParticles(c);
      return;
    }
    title(c, s.died ? 'CHECKMATE' : 'RUN ENDED', 14);
    panel(c, 8, 30, 160, 84, { fill: '1' });
    [['PIECE', PIECES[s.piece].name], ['WAVE REACHED', s.wave], ['ENEMIES KILLED', s.kills], ['ABILITIES USED', s.abil], ['BUFFS TAKEN', s.buffs.length]].forEach(([k, v], i) => {
      text(c, k, 16, 40 + i * 14, '4'); text(c, v, 160, 40 + i * 14, '5', { align: 'r' });
    });
    s.buffs.slice(0, 6).forEach((b, i) => text(c, BUFFS[b].name, 12 + (i % 2) * 80, 124 + ((i / 2) | 0) * 10, '3'));
    if (btn(c, 'PLAY AGAIN', 8, 200, 160, 24)) app.go('characters', { mode: 'pick' });
    if (btn(c, 'MENU', 8, 230, 160, 24)) app.go('title');
  },
};
