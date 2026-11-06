// Display-side piece. Logic positions are final instantly; an Actor shows where the piece *looks* to be.
import { BX, BY, TILE } from '../art/palette.js';

export class Actor {
  constructor(kind, tx, ty, ref = null, isPlayer = false) {
    Object.assign(this, {
      kind, tx, ty, ref, isPlayer,
      ox: 0, oy: 0, sx: 1, sy: 1, lean: 0,       // transform: pixel offset, squash/stretch, lean
      flash: false, hidden: false, dead: false, flip: false,
      glitch: 0, pop: 0, ab: null, frost: false, stunShown: false, infShown: false,
      trail: [], ghost: null, owner: null, ph: Math.random() * 6,
    });
  }
  get px() { return BX + Math.round(this.tx * TILE) + this.ox; }
  get py() { return BY + Math.round(this.ty * TILE) + this.oy; }
  get cx() { return this.px + 10; }
  get cy() { return this.py + 10; }
  // One step at a time may drive an actor.
  claim(step) {
    if (this.owner && this.owner !== step) throw new Error(`actor conflict: ${this.owner.name} vs ${step.name}`);
    this.owner = step;
  }
  release(step) { if (this.owner === step) this.owner = null; }
  reset() { this.ox = 0; this.oy = 0; this.sx = 1; this.sy = 1; this.lean = 0; this.flash = false; this.ab = null; }
  get xformed() { return this.sx !== 1 || this.sy !== 1 || this.lean !== 0 || this.ox !== 0 || this.oy !== 0; }
}
