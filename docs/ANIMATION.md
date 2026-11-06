# Animation system

## Principle
Game logic (`game.js`) resolves a turn instantly and records **ordered events** (`g.ev`).
The renderer never reads final logic positions while animating; it replays events as **Steps**
through a Director, so what you see is always the board *as it was at that moment*.
Input is locked until the queue is idle and every sprite is back in Idle.

## Pipeline
| File | Role |
|---|---|
| `js/anim/director.js` | queue + state machine: one Step at a time, phases with enter/tick/exit, delta-time, `reset()` cancels, `flush()` fast-forwards |
| `js/anim/actor.js` | display piece (tile pos, offset, squash/stretch, lean, flags). `claim()` throws if two steps drive one piece |
| `js/anim/steps.js` | events -> Steps (move, capture, enemy move, enemy attack, stun, debuff, death, spawn, buff, clear, 6 special attacks) |
| `js/anim/ease.js` | ease-in / out / in-out / out-back |
| `js/gfx/fx.js` | particles (2 layers, capped), rings, flashes, floating text, shake (clamped), hit-stop |
| `js/scenes/play.js` | visual adapter (`V`) + layered rendering |

## Phase order (every action)
Idle -> **Anticipation** (squash, lean back) -> **Movement** (ease-in-out, hop arc, stretch, lean, pixel trail)
-> **Action** -> **Impact** (flash, hit-stop, particles, ring, limited shake) -> **Reaction** (flash/knockback/dodge, blink then
pixel-scatter death, debuff glitch) -> **Resolution** (state/HUD updates, piece removed, final tile) -> **Recovery** (landing squash, dust, back to Idle).

## Rules enforced (and tested in `tests/anim.test.mjs`)
- One step active at a time; enemies move strictly one after another (long enemy turns play faster, never in parallel).
- A piece is owned by one step; conflicts throw.
- After every action display == logic, all transforms identity, no leftover actors.
- Same result at 20 / 60 / 144 fps (progress is time-based).
- `Director.reset()` cancels everything (new run, resign).

## Effects
| Effect | Where |
|---|---|
| Critical hit | capturing a rook/queen or 3+ kills: bigger flash, double particles, shake 4, "CRITICAL!" |
| Dodge | shield absorbs a hit: sidestep with afterimage, "BLOCK" |
| Teleport | SPACE warp, ERROR swap: sprite shatters into its own pixels, gathers at the destination |
| Death | blink, then the sprite's real pixels fly apart and fade |
| Buff | ring of light orbits the piece when an upgrade is taken |
| Debuff | glitch rows + "STUN"/"INFECT" (swap, shockwave, infection spread) |
| Special attacks | each piece has its own anticipation/action/impact/recovery (see PLAN in steps.js) |

## Rendering layers (back to front)
board -> threat/move markers -> ground FX (dust, rings) -> shadows -> afterimages -> sprites -> buff rings -> brackets
-> air FX (particles, flash, text) -> screen tear -> UI (never shaken, never covered by effects).

## Low-end Android
Particle cap 220; automatic quality drop (half particles) when frames are slow; shadows, threat tiles, overlays and
portrait backdrops are cached; pixel lists for enemy death are cached; no per-frame allocation in hot paths except scratch canvases reused.
