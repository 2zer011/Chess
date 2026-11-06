export const N = 8;
export const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const DIRS = { rook: ORTH, bishop: DIAG, queen: [...ORTH, ...DIAG] };

// Squares a piece can move to or hit. Ignores who stands there except that
// sliders stop at the first occupied square (g.at) and include it.
export function targets(g, p, kind, range = 8) {
  if (kind === 'king' && range > 1) kind = 'queen'; // king with extra range = short queen
  const out = [];
  if (kind === 'knight' || kind === 'king') {
    for (const [dx, dy] of kind === 'knight' ? KNIGHT : DIRS.queen) {
      const x = p.x + dx, y = p.y + dy;
      if (inb(x, y)) out.push({ x, y });
    }
    return out;
  }
  for (const [dx, dy] of DIRS[kind]) {
    for (let i = 1; i <= range; i++) {
      const x = p.x + dx * i, y = p.y + dy * i;
      if (!inb(x, y)) break;
      out.push({ x, y });
      if (g.at(x, y)) break;
    }
  }
  return out;
}
