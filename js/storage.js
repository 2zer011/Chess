const KEY = 'chess-war-save';
const fresh = () => ({ stats: { kills: 0, best: 0, runs: 0, abil: 0 }, unlocked: ['void'], done: [], settings: { crt: true, shake: true, ambient: true } });

export function load() {
  try {
    const sv = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)));
    sv.settings = { ...fresh().settings, ...sv.settings };
    return sv;
  }
  catch { return fresh(); }
}

export function save(sv) {
  try { localStorage.setItem(KEY, JSON.stringify(sv)); } catch { /* private mode: progress not kept */ }
}
