// Each achievement unlocks one piece. val(stats) >= goal => done.
export const ACH = [
  { id: 'kills25', name: 'WARMING UP', desc: 'KILL 25 ENEMIES (TOTAL)', val: s => s.kills, goal: 25, unlock: 'error' },
  { id: 'wave5', name: 'HOLDING ON', desc: 'REACH WAVE 5', val: s => s.best, goal: 5, unlock: 'time' },
  { id: 'abil20', name: 'SORCERER', desc: 'USE ABILITIES 20 TIMES (TOTAL)', val: s => s.abil, goal: 20, unlock: 'space' },
  { id: 'kills80', name: 'BUTCHER', desc: 'KILL 80 ENEMIES (TOTAL)', val: s => s.kills, goal: 80, unlock: 'blackhole' },
  { id: 'wave8', name: 'IMMORTAL', desc: 'REACH WAVE 8', val: s => s.best, goal: 8, unlock: 'parasite' },
];

// Marks newly finished achievements on the save, returns them.
export function check(sv) {
  const won = ACH.filter(a => !sv.done.includes(a.id) && a.val(sv.stats) >= a.goal);
  for (const a of won) {
    sv.done.push(a.id);
    if (!sv.unlocked.includes(a.unlock)) sv.unlocked.push(a.unlock);
  }
  return won;
}
