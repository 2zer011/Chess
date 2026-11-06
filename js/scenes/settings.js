import { text } from '../art/font.js';
import { btn } from '../ui/ui.js';
import { app, persist } from '../app.js';
import { bg, title } from './common.js';
import { W } from '../art/palette.js';

let sure = false;
const ROWS = [['crt', 'CRT FILTER'], ['shake', 'SCREEN SHAKE'], ['ambient', 'AMBIENT FX']];

export default {
  enter() { sure = false; },
  update() {},
  draw(c) {
    bg(c);
    title(c, 'SETTINGS');
    const s = app.sv.settings;
    ROWS.forEach(([k, label], i) => {
      const y = 30 + i * 30;
      text(c, label, 12, y + 9, '5');
      if (btn(c, s[k] ? 'ON' : 'OFF', 112, y, 56, 24, { sel: s[k] })) { s[k] = !s[k]; persist(); }
    });
    if (btn(c, sure ? 'SURE? TAP AGAIN' : 'RESET SAVE', 8, 130, 160, 24)) {
      if (sure) { const f = { stats: { kills: 0, best: 0, runs: 0, abil: 0 }, unlocked: ['void'], done: [] }; Object.assign(app.sv, f); persist(); sure = false; } else sure = true;
    }
    if (btn(c, 'BACK', 8, 240, 160, 24)) app.go(app.from === 'play' ? 'play' : 'title', app.from === 'play' ? { resume: true } : undefined);
  },
};
