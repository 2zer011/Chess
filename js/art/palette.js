// Logical resolution: every pixel in the game lives on this grid and is scaled by an integer.
export const W = 176, H = 288, TILE = 20, BX = 8, BY = 40;

// One cold blue-gray ramp (0 darkest .. 5 lightest) plus a single red accent pair.
export const C = {
  0: '#0a0c12', 1: '#161a29', 2: '#262d48', 3: '#44527f', 4: '#7f90c0', 5: '#cfd7f0',
  r: '#7c2433', R: '#d8505e', w: '#f2f5ff',
};

// Each special piece owns one vivid accent ramp (dark / mid / light) that pops against the blue-gray board.
export const ACC = {
  void: { d: '#4a2490', m: '#9a5cff', l: '#d9bfff' },
  error: { d: '#8f1f6a', m: '#ff3fb4', l: '#ffb0e6' },
  time: { d: '#8a6208', m: '#ffc83d', l: '#fff0a8' },
  space: { d: '#12687d', m: '#3de0ff', l: '#c4f6ff' },
  blackhole: { d: '#8a3d08', m: '#ff8a1f', l: '#ffd29a' },
  parasite: { d: '#2f7a1a', m: '#7dff4a', l: '#d4ffb8' },
  blackking: { d: '#7a1616', m: '#e23b3b', l: '#ff9a8a' },
};
export const accOf = id => ACC[id] || ACC.void;
