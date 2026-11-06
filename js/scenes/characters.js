// Character selection (mode 'pick') and collection (mode 'view') share one screen.
import { W } from '../art/palette.js';
import { text, wrap } from '../art/font.js';
import { panel } from '../gfx/pixel.js';
import { drawPortrait, drawIcon, CHARS } from '../gfx/sprites.js';
import { PIECES } from '../pieces.js';
import { BUFFS } from '../buffs.js';
import { ACH } from '../achievements.js';
import { btn, tap } from '../ui/ui.js';
import { app } from '../app.js';
import { bg, title } from './common.js';

let mode = 'pick', sel = 'void';

export default {
  enter(a = {}) { mode = a.mode || 'pick'; if (!app.sv.unlocked.includes(sel)) sel = 'void'; },
  update() {},
  draw(c, t) {
    bg(c);
    title(c, mode === 'pick' ? 'CHOOSE YOUR PIECE' : 'COLLECTION');
    const p = PIECES[sel], open = app.sv.unlocked.includes(sel);
    drawPortrait(c, sel, 8, 20, 56, 56, t, !open);
    text(c, open ? p.name : '???', 72, 22, '5', { shadow: '0' });
    const lines = open ? wrap(p.desc, 96) : wrap('LOCKED. ' + unlockText(sel), 96);
    lines.slice(0, 6).forEach((l, i) => text(c, l, 72, 32 + i * 8, open ? '4' : 'R'));
    if (open) {
      panel(c, 8, 82, 160, 40, { fill: '1' });
      text(c, p.ability.name, 14, 88, '5');
      wrap(p.ability.desc, 148).slice(0, 3).forEach((l, i) => text(c, l, 14, 98 + i * 8, '4'));
      p.buffs.forEach((b, i) => {
        text(c, BUFFS[b].name, 8, 130 + i * 24, '5');
        wrap(BUFFS[b].desc, 160).slice(0, 2).forEach((l, k) => text(c, l, 8, 138 + i * 24 + k * 8, '3'));
      });
    } else {
      panel(c, 8, 82, 160, 40, { fill: '1' });
      wrap('COMPLETE THE ACHIEVEMENT TO UNLOCK THIS PIECE.', 148).forEach((l, i) => text(c, l, 14, 90 + i * 8, '3'));
    }
    // collection icons
    CHARS.forEach((id, i) => {
      const x = 8 + i * 27, y = 208;
      drawIcon(c, id, x, y, !app.sv.unlocked.includes(id), id === sel);
      if (tap(x, y, 24, 24)) sel = id;
    });
    if (mode === 'pick') {
      if (btn(c, 'PLAY', 8, 240, 100, 24, { disabled: !open })) app.go('play', { id: sel });
      if (btn(c, 'BACK', 112, 240, 56, 24)) app.go('title');
    } else if (btn(c, 'BACK', 8, 240, 160, 24)) app.go('title');
  },
};

function unlockText(id) {
  const a = ACH.find(x => x.unlock === id);
  return a ? a.desc + '.' : '';
}
