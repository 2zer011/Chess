const heal = (g, n) => { g.p.hp = Math.min(g.p.maxHp, g.p.hp + n); };
const B = (name, desc, apply) => ({ name, desc, apply });

// Buffs mutate g.p or push hooks (g.hooks.kill(g, enemy) / g.hooks.ability(g)).
export const BUFFS = {
  // common
  vit: B('VITALITY', '+1 MAX HP AND HEAL 1.', g => { g.p.maxHp++; heal(g, 1); }),
  haste: B('HASTE', 'ABILITY COOLDOWNS -1.', g => { g.p.cdMax = Math.max(1, g.p.cdMax - 1); g.p.cdMax2 = Math.max(1, g.p.cdMax2 - 1); }),
  shield: B('SHIELD', '+1 SHIELD. BLOCKS ONE HIT.', g => { g.p.shield++; }),
  // void
  abyss: B('ABYSS', 'ERASE REACHES 1 TILE FARTHER.', g => { g.p.radius++; }),
  hungry: B('HUNGER', 'EACH KILL CUTS COOLDOWN BY 1.', g => g.hooks.kill.push(h => { h.p.cd = Math.max(0, h.p.cd - 1); })),
  rift: B('RIFT', 'MOVE RANGE +1.', g => { g.p.range++; }),
  // error
  glitch: B('STATIC', 'ENEMIES STRAY 20% MORE OFTEN.', g => { g.p.glitch += 0.2; }),
  segfault: B('SEGFAULT', 'KILLS HAVE A 25% CHANCE TO KILL ANOTHER.', g => g.hooks.kill.push(h => {
    if (h.busy || !h.enemies.length || h.rng() > 0.25) return;
    h.busy = true;
    h.kill(h.enemies[Math.floor(h.rng() * h.enemies.length)]);
    h.busy = false;
  })),
  bsod: B('BLUE SCREEN', 'SWAP STUNS 2 TURNS LONGER.', g => { g.p.stunT += 2; }),
  // time
  stasis: B('STASIS', 'FREEZE LASTS 1 TURN LONGER.', g => { g.p.freezeT++; }),
  sprint: B('SPRINT', 'MOVE RANGE +1.', g => { g.p.range++; }),
  paradox: B('PARADOX', 'USING FREEZE GIVES +1 SHIELD.', g => g.hooks.ability.push(h => { h.p.shield++; })),
  // space
  expand: B('EXPAND', 'MOVE RANGE +1.', g => { g.p.range++; }),
  fold: B('FOLD', 'WARP CAN LAND ON ENEMIES.', g => { g.p.capWarp = true; }),
  shock: B('SHOCKWAVE', 'AFTER A WARP, ADJACENT ENEMIES ARE STUNNED.', g => { g.p.shock = true; }),
  // black hole
  gravity: B('GRAVITY', 'PULL 1 STEP FARTHER.', g => { g.p.pull++; }),
  horizon: B('EVENT HORIZON', 'CONSUME RADIUS +1.', g => { g.p.radius++; }),
  accretion: B('ACCRETION', 'EVERY 4 KILLS HEAL 1.', g => {
    g.acc = g.acc || 0;
    g.hooks.kill.push(h => { if (++h.acc % 4 === 0) heal(h, 1); });
  }),
  // black king
  barrel: B('LONG BARREL', 'SHOTGUN REACHES 1 TILE FARTHER.', g => { g.p.shot++; }),
  spread: B('WIDE SPREAD', 'SHOTGUN CONE GETS WIDER.', g => { g.p.cone = 0.5; }),
  plate: B('PLATE ARMOR', '+1 MAX HP AND +1 SHIELD.', g => { g.p.maxHp++; heal(g, 1); g.p.shield++; }),
  // parasite
  virulent: B('VIRULENT', 'INFECTION KILLS 1 TURN FASTER.', g => { g.p.infT = Math.max(1, g.p.infT - 1); }),
  plague: B('PLAGUE', 'INFECTION SPREADS 1 TILE FARTHER.', g => { g.p.spread++; }),
  devour: B('DEVOUR', 'KILLING ROOKS OR QUEENS HEALS 1.', g => g.hooks.kill.push((h, e) => {
    if (e.kind === 'rook' || e.kind === 'queen') heal(h, 1);
  })),
};

export const COMMON = ['vit', 'haste', 'shield'];
