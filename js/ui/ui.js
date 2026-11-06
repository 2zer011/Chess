// Immediate-mode canvas UI: widgets draw and report clicks in the same call.
import { panel, rect } from '../gfx/pixel.js';
import { text, textW } from '../art/font.js';

export const ui = { x: -1, y: -1, down: false, click: null };
export const inside = (px, py, x, y, w, h) => px >= x && py >= y && px < x + w && py < y + h;

// Returns true when clicked. o: disabled, sel, draw(c,x,y,w,h) for custom content.
export function btn(c, label, x, y, w, h, o = {}) {
  const hot = !o.disabled && ui.down && inside(ui.x, ui.y, x, y, w, h);
  const d = hot ? 1 : 0;
  panel(c, x, y + d, w, h - d, { fill: o.disabled ? '1' : (o.sel || hot) ? '3' : '2', hi: o.disabled ? '2' : '4', lo: '1' });
  if (label) text(c, label, x + w / 2, y + ((h - 5) >> 1) + d, o.disabled ? '3' : '5', { align: 'c', shadow: '0' });
  if (o.draw) o.draw(c, x, y + d, w, h);
  if (!o.disabled && ui.click && inside(ui.click.x, ui.click.y, x, y, w, h)) { ui.click = null; return true; }
  return false;
}

// Consume a click inside a rect and return its position, or null.
export function tap(x, y, w, h) {
  if (ui.click && inside(ui.click.x, ui.click.y, x, y, w, h)) { const p = ui.click; ui.click = null; return p; }
  return null;
}

export function bar(c, x, y, w, frac) {
  rect(c, x, y, w, 5, '0'); rect(c, x + 1, y + 1, w - 2, 3, '1');
  rect(c, x + 1, y + 1, Math.round((w - 2) * Math.min(1, frac)), 3, frac >= 1 ? '5' : '4');
}
export { text, textW };
