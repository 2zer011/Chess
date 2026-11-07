// Sequencer: a queue of Steps, one active at a time; each Step is a list of timed phases.
// Phase: { name, dur, enter?(step), tick?(p 0..1, dt, step), exit?(step) }. Time is delta-time based.
import { Actor } from './actor.js';
import { accOf } from '../art/palette.js';

export class Director {
  constructor(v, piece = 'void') { this.v = v; this.piece = piece; this.acc = accOf(piece); this.reset(); }

  reset() {
    if (this.cur) for (const a of this.cur.actors) a.release(this.cur);
    this.queue = []; this.cur = null; this.map = new Map(); this.effects = []; this.log = []; this.active = 0; this.time = 0;
    this.player = new Actor(this.piece, 3, 7, null, true);
    this.actors = [this.player];
    this.disp = { hp: 0, maxHp: 0, shield: 0, kills: 0, wave: 0 };
  }

  get idle() { return !this.cur && !this.queue.length; }
  get stepName() { return this.cur ? this.cur.name : ''; }

  init(g) { this.player.tx = g.p.x; this.player.ty = g.p.y; this.sync(g); }
  sync(g) { Object.assign(this.disp, { hp: g.p.hp, maxHp: g.p.maxHp, shield: g.p.shield, kills: g.kills, wave: g.wave }); }

  addEnemy(e) {
    if (this.map.has(e)) return this.map.get(e);
    const a = new Actor(e.kind, e.x, e.y, e); a.hidden = true;
    this.map.set(e, a); this.actors.push(a);
    return a;
  }
  actorOf(e) { // enemies normally arrive via 'spawn'; create on demand if state was injected
    const a = this.map.get(e) || this.addEnemy(e);
    if (!this.map.has(e) || a.hidden && !this.cur) a.hidden = false;
    return a;
  }
  push(step) { this.queue.push(step); }

  update(dt) {
    this.time += dt;
    let rem = dt;
    for (let guard = 0; guard < 600; guard++) {
      if (!this.cur) { const s = this.queue.shift(); if (!s) break; this.begin(s); }
      const st = this.cur, ph = st.phases[st.i], spd = st.spd || 1;
      const left = (ph.dur - st.t) / spd;
      if (rem < left) { st.t += rem * spd; ph.tick?.(ph.dur ? st.t / ph.dur : 1, rem * spd, st); break; }
      rem -= left; st.t = ph.dur;
      ph.tick?.(1, 0, st); ph.exit?.(st);
      this.log.push(`${st.name}:${ph.name}`);
      st.i++; st.t = 0;
      if (st.i >= st.phases.length) this.finish(st); else st.phases[st.i].enter?.(st);
    }
    for (const a of this.actors) {
      a.glitch = Math.max(0, a.glitch - dt); a.pop = Math.max(0, a.pop - dt);
      for (const t of a.trail) t.age += dt;
      if (a.trail.length) a.trail = a.trail.filter(t => t.age < 0.18);
    }
    for (const e of this.effects) e.t += dt;
    if (this.effects.length) this.effects = this.effects.filter(e => e.t < e.dur);
  }

  begin(st) {
    for (const a of st.actors) a.claim(st);
    this.cur = st; this.active++; st.i = 0; st.t = 0;
    this.log.push(`>${st.name}`);
    st.phases[0].enter?.(st);
  }

  finish(st) {
    for (const a of st.actors) {
      a.reset(); a.release(st);
      if (a.dead && !a.isPlayer) { this.actors.splice(this.actors.indexOf(a), 1); this.map.delete(a.ref); }
    }
    this.cur = null; this.active--;
    this.log.push(`<${st.name}`);
    st.onDone?.(st);
  }

  // Skip ahead to the end of everything queued (used when a run is aborted).
  flush() { for (let i = 0; i < 2000 && !this.idle; i++) this.update(10); }
}
