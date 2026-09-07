const { chromium } = require('playwright');
const { GAME_URL } = require('./test_helpers');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(GAME_URL);
  await page.waitForFunction(() => window.__api?.game?.state === 'title', null, { timeout: 10000 });
  const touchVisible = await page.evaluate(() => getComputedStyle(document.getElementById('touch')).display !== 'none');
  if (!touchVisible) throw new Error('touch controls are not visible in a touch context');

  await page.locator('#ov').tap({ position: { x: 500, y: 500 } });
  await page.waitForFunction(() => window.__api.game.state === 'play', null, { timeout: 5000 });
  if (await page.evaluate(() => window.__api.game.state) !== 'play') throw new Error('tap-to-start failed');

  const x0 = await page.evaluate(() => window.__api.player.x);
  await page.locator('#touch .right').dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch' });
  let moved = true;
  try {
    await page.waitForFunction(startX => window.__api.player.x > startX + 20, x0, { timeout: 5000 });
  } catch (_err) {
    moved = false;
  } finally {
    await page.locator('#touch .right').dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch' });
  }
  const x1 = await page.evaluate(() => window.__api.player.x);
  if (!moved || !(x1 > x0 + 20)) throw new Error(`touch movement failed: ${x0} -> ${x1}`);

  const signatures = [];
  for (let expectedStage = 0; expectedStage < 3; expectedStage++) {
    const before = await page.evaluate(() => {
      const a = window.__api;
      const sig = Array.from({ length: a.MAPW }, (_, c) => a.map[c][a.GROUND]).join('');
      return { stage: a.game.stage, sig, enemies: a.enemies.length, enemyVisuals: a.enemyVisualCount };
    });
    if (before.stage !== expectedStage) throw new Error(`expected stage ${expectedStage}, got ${before.stage}`);
    if (before.enemyVisuals !== before.enemies) throw new Error(`enemy visual leak in stage ${expectedStage}: ${before.enemyVisuals} visuals for ${before.enemies} enemies`);
    signatures.push(before.sig);

    if (expectedStage === 1) {
      await page.evaluate(() => {
        const a = window.__api, p = a.player;
        p.x = 32 * 16 + 8; p.y = a.GROUND * 16 - 0.01; p.vx = 0; p.vy = 0; p.onGround = true; p.invuln = 99999;
      });
      await page.waitForFunction(() => window.__api.map[31][window.__api.GROUND] !== 'B', null, { timeout: 5000 });
      console.log('PASS zone 2 dynamic bridge span');
    }

    // Boss combat itself is covered by e2e_game.js. This test owns campaign
    // progression, so enter the boss's short deterministic death countdown
    // directly and wait on state instead of a wall-clock render budget.
    await page.evaluate(() => {
      const a = window.__api;
      a.player.invuln = 99999;
      a.boss.active = true;
      a.boss.pods.forEach(p => { p.dead = true; });
      a.boss.core.dead = true;
      a.boss.dying = 2;
    });
    await page.waitForFunction(() => window.__api.game.state === 'victory', null, { timeout: 5000 });
    const state = await page.evaluate(() => window.__api.game.state);
    if (state !== 'victory') throw new Error(`stage ${expectedStage} did not reach victory: ${state}`);

    await page.locator('#ov').tap({ position: { x: 500, y: 500 } });
    await page.waitForFunction(stage => window.__api.game.state === 'play' && window.__api.game.stage === stage, (expectedStage + 1) % 3, { timeout: 5000 });
  }

  if (new Set(signatures).size !== 3) throw new Error('campaign stages do not have distinct ground/bridge layouts');
  const loop = await page.evaluate(() => ({ stage: window.__api.game.stage, clears: window.__api.game.campaignClears, finished: window.__api.game.finished, state: window.__api.game.state }));
  if (!(loop.stage === 0 && loop.clears === 1 && loop.finished === 3 && loop.state === 'play')) throw new Error(`campaign loop failed: ${JSON.stringify(loop)}`);
  if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);

  console.log('PASS touch start + movement');
  console.log('PASS three distinct campaign zones');
  console.log('PASS final campaign clear -> New Game+ loop', JSON.stringify(loop));
  await browser.close();
})().catch(async err => {
  console.error('FAIL', err);
  process.exit(1);
});
