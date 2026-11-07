// Character selection (mode 'pick') and collection (mode 'view') share one screen.
import { W } from '../art/palette.js';
import { text, wrap } from '../art/font.js';
import { panel, rect } from '../gfx/pixel.js';
import { accOf } from '../art/palette.js';
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
    const p = PIECES[sel], open = app.sv.unlocked.includes(sel), A = accOf(sel);
    drawPortrait(c, sel, 8, 20, 56, 56, t, !open);
    text(c, open ? p.name : '???', 72, 22, open ? A.l : '5', { shadow: '0' });
    const lines = open ? wrap(p.desc, 96) : wrap('LOCKED. ' + unlockText(sel), 96);
    lines.slice(0, 6).forEach((l, i) => text(c, l, 72, 32 + i * 8, open ? '4' : 'R'));
    if (open) {
      panel(c, 8, 82, 160, 66, { fill: '1', hi: A.m });
      p.abilities.forEach((ab, i) => {
        const y = 88 + i * 30;
        rect(c, 12, y, 1, 24, A.m);
        text(c, ab.name, 16, y, A.l);
        wrap(ab.desc, 146).slice(0, 2).forEach((l, k) => text(c, l, 16, y + 9 + k * 8, '4'));
      });
      text(c, 'BUFFS', 8, 154, '3');
      wrap(p.buffs.map(b => BUFFS[b].name).join(', '), 160).slice(0, 2).forEach((l, i) => text(c, l, 8, 164 + i * 8, '5'));
    } else {
      panel(c, 8, 82, 160, 40, { fill: '1' });
      wrap('COMPLETE THE ACHIEVEMENT TO UNLOCK THIS PIECE.', 148).forEach((l, i) => text(c, l, 14, 90 + i * 8, '3'));
    }
    // collection icons
    CHARS.forEach((id, i) => {
      const x = 9 + i * 23, y = 200;
      drawIcon(c, id, x, y, !app.sv.unlocked.includes(id), id === sel);
      if (tap(x, y, 22, 22)) sel = id;
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
