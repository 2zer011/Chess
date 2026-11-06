// Logical resolution: every pixel in the game lives on this grid and is scaled by an integer.
export const W = 176, H = 288, TILE = 20, BX = 8, BY = 40;

// One cold blue-gray ramp (0 darkest .. 5 lightest) plus a single red accent pair.
export const C = {
  0: '#0a0c12', 1: '#161a29', 2: '#262d48', 3: '#44527f', 4: '#7f90c0', 5: '#cfd7f0',
  r: '#7c2433', R: '#d8505e', w: '#f2f5ff',
};
