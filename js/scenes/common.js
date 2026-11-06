import { W, H } from '../art/palette.js';
import { overlays, drawMotes } from '../gfx/fx.js';
import { text } from '../art/font.js';

export function bg(c) {
  const o = overlays();
  c.fillStyle = '#0a0c12'; c.fillRect(0, 0, W, H);
  c.drawImage(o.floor, 0, 0);
  drawMotes(c);
  c.drawImage(o.vig, 0, 0);
}
export const title = (c, s, y = 8) => { text(c, s, W / 2, y, '5', { align: 'c', shadow: '0' }); };
