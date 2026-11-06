// Optional browser smoke test. Needs playwright + a static server on :8000 (npm start).
// PLAYWRIGHT=/path/to/playwright/index.mjs node tests/e2e.mjs
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 700 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(process.env.URL || 'http://localhost:8000/index.html'); await p.waitForTimeout(600);
const box = await p.locator('#view').boundingBox();
const tap = async (x, y) => { await p.mouse.click(box.x + x / 176 * box.width, box.y + y / 288 * box.height); await p.waitForTimeout(700); };
await tap(88, 145); await tap(60, 252);                 // PLAY -> pick VOID -> PLAY
await tap(88, 265);                                      // ability
await tap(158, 17); await tap(88, 120);                  // pause, resume
const wave = await p.evaluate(() => __app.g.wave);
if (wave !== 1 || errs.length) { console.error('FAIL', wave, errs); process.exit(1); }
console.log('e2e ok'); await b.close();
