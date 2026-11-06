# Visual redesign (v0.2)

## Direction
Original retro pixel art. One cold blue-gray ramp (6 shades) + one red accent pair. Dark, dithered, CRT-optional.
No emoji, no unicode chess glyphs, no CSS gradients. Pieces are hand-built pixel grids; motion is procedural.

## Pixel density rule
The whole game renders to a 176x288 logical canvas and is scaled by an integer (computed in device pixels, so
pixels stay square on any phone). UI, text and sprites all live on that grid. Only titles use scaled text.

## Pipeline (all code, no image files)
| Module | Role |
|---|---|
| art/palette.js | palette, logical size, board layout constants |
| art/font.js | 5px bitmap font, wrap, measure |
| art/icons.js, art/sprites-data.js | ASCII pixel grids (half-grids are mirrored) |
| gfx/pixel.js | bake grid -> canvas with auto outline, silhouettes, dither, rings, lines, bevel panels |
| gfx/sprites.js | sprite cache; per-character idle / move / capture / ability animation; portraits, icons, unlock art |
| gfx/board.js | pre-rendered stone board, frame, coordinates, move/capture/check markers |
| gfx/fx.js | particles, floating text, screen shake, ambient dust, vignette/dither overlays |
| ui/ui.js | immediate-mode buttons and bars drawn on the canvas |
| scenes/* | title, characters (select + collection), achievements, settings, play (pause, upgrade cards), summary (unlock reveal) |
| main.js | scene manager, dither-block transitions, integer scaling, optional CRT scanlines |

## Characters
| Piece | Silhouette | Idle | Ability animation |
|---|---|---|---|
| VOID | hooded wraith | bob, orbiting wisps | imploding ring |
| ERROR | monitor on legs | periodic row glitch | glitch bars + screen tearing |
| TIME | hourglass | falling sand | clock ring + sweeping hand |
| SPACE | crystal + 4 shards | orbiting shards | converging warp streaks, line trail |
| BLACK HOLE | accretion disc + sphere | rotating bright arc, jets | spiral pull over the whole board |
| PARASITE | tick, procedural legs | leg cycle | spore drip, red spray at target |

Move: hop + lean + dust. Capture: white flash, lunge, impact ring, shake. Death: pixel dissolve.

## Feedback
Check = player tile is attacked: pulsing red frame, red brackets on attackers, CHECK! label.
Checkmate = HP 0: red flash, CHECKMATE banner, dissolve, then run summary.

## Gameplay changes
None to rules. game.js only emits events (`g.ev`) that the renderer turns into animation. UI text is now English
(the bitmap font is uppercase ASCII).

## Not done
Sound, animated enemy attacks (enemies only flash the player), high-DPI portrait art above 1x.
