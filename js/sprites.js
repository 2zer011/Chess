// All art is canvas paths. No image files.
const TAU = Math.PI * 2;

const pen = (c, x, y, s) => ({
  poly(pts) {
    c.beginPath();
    pts.forEach(([a, b], i) => c[i ? 'lineTo' : 'moveTo'](x + a * s, y + b * s));
    c.closePath(); c.fill(); c.stroke();
  },
  dot(a, b, r) { c.beginPath(); c.arc(x + a * s, y + b * s, r * s, 0, TAU); c.fill(); c.stroke(); },
});

const BASE = [[-.6, .7], [.6, .7], [.5, .5], [-.5, .5]];
const ENEMY = {
  pawn: p => { p.poly(BASE); p.poly([[-.3, .5], [.3, .5], [.12, -.05], [-.12, -.05]]); p.dot(0, -.3, .26); },
  knight: p => { p.poly(BASE); p.poly([[-.4, .5], [-.1, -.5], [-.3, -.3], [0, -.7], [.3, -.55], [.45, -.1], [.2, 0], [.4, .5]]); },
  bishop: p => { p.poly(BASE); p.poly([[-.35, .5], [-.15, -.1], [0, -.6], [.15, -.1], [.35, .5]]); p.dot(0, -.7, .12); },
  rook: p => {
    p.poly(BASE);
    p.poly([[-.4, .5], [-.3, -.3], [-.45, -.3], [-.45, -.7], [-.2, -.7], [-.2, -.55], [-.07, -.55], [-.07, -.7],
      [.07, -.7], [.07, -.55], [.2, -.55], [.2, -.7], [.45, -.7], [.45, -.3], [.3, -.3], [.4, .5]]);
  },
  queen: p => { p.poly(BASE); p.poly([[-.4, .5], [-.5, -.5], [-.22, -.15], [0, -.65], [.22, -.15], [.5, -.5], [.4, .5]]); p.dot(0, -.75, .1); },
};

export function drawEnemy(c, kind, x, y, s) {
  c.save();
  c.fillStyle = '#e8e6ff'; c.strokeStyle = '#14141f'; c.lineWidth = Math.max(1, s * .07);
  ENEMY[kind](pen(c, x, y, s));
  c.restore();
}

const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };

const PLAYER = {
  void(c, x, y, s, t) {
    const g = c.createRadialGradient(x, y, s * .1, x, y, s);
    g.addColorStop(0, '#000'); g.addColorStop(.65, '#14002b'); g.addColorStop(1, '#a020ff');
    c.fillStyle = g; circle(c, x, y, s); c.fill();
    c.strokeStyle = '#d9a0ff'; c.lineWidth = s * .08;
    c.setLineDash([s * .25, s * .2]); c.lineDashOffset = -t * s;
    circle(c, x, y, s * .85); c.stroke();
  },
  error(c, x, y, s, t) {
    const j = Math.sin(t * 41) * s * .12 * (Math.sin(t * 3) > .3 ? 1 : .2);
    c.globalCompositeOperation = 'lighter';
    [['#f00', -j], ['#0f0', 0], ['#00f', j]].forEach(([col, o]) => { c.fillStyle = col; c.fillRect(x - s * .7 + o, y - s * .7, s * 1.4, s * 1.4); });
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    for (let i = 0; i < 3; i++) c.fillRect(x - s * .7, y - s * .7 + ((t * s * 2 + i * s * .5) % (s * 1.4)), s * 1.4, s * .08);
    c.fillStyle = '#fff'; c.font = `bold ${s}px monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('!', x, y);
  },
  time(c, x, y, s, t) {
    const hand = (a, l) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * s * l, y - Math.cos(a) * s * l); c.stroke(); };
    c.fillStyle = '#2a2208'; c.strokeStyle = '#ffd34d'; c.lineWidth = s * .1;
    circle(c, x, y, s * .85); c.fill(); c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      c.beginPath(); c.moveTo(x + Math.cos(a) * s * .7, y + Math.sin(a) * s * .7);
      c.lineTo(x + Math.cos(a) * s * .8, y + Math.sin(a) * s * .8); c.stroke();
    }
    hand(t * 2, .65); hand(t * .17, .4);
  },
  space(c, x, y, s, t) {
    c.strokeStyle = '#5ff'; c.lineWidth = s * .07;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x, y, s * .9, s * .35, t * .8 + i * Math.PI / 3, 0, TAU); c.stroke(); }
    c.fillStyle = '#fff'; circle(c, x, y, s * .18); c.fill();
  },
  blackhole(c, x, y, s, t) {
    const disk = (col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, s * .95, s * .35, Math.sin(t) * .3, 0, TAU); c.stroke(); };
    disk('#ff9a1f', s * .16); disk('#ffe0a0', s * .05);
    c.fillStyle = '#000'; c.strokeStyle = '#fff'; c.lineWidth = s * .05;
    circle(c, x, y, s * .5); c.fill(); c.stroke();
  },
  parasite(c, x, y, s, t) {
    c.strokeStyle = '#4f4'; c.lineWidth = s * .09;
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7 + t * .5;
      c.beginPath();
      for (let k = 0; k <= 8; k++) {
        const r = s * (.4 + k * .08), w = Math.sin(t * 4 + i + k) * .15;
        c.lineTo(x + Math.cos(a + w) * r, y + Math.sin(a + w) * r);
      }
      c.stroke();
    }
    c.fillStyle = '#2a8a2a'; circle(c, x, y, s * (.5 + Math.sin(t * 5) * .04)); c.fill();
    c.fillStyle = '#f33'; circle(c, x, y, s * .15); c.fill();
  },
};

export function drawPlayer(c, id, x, y, s, t) {
  c.save();
  PLAYER[id](c, x, y, s, t);
  c.restore();
}
