const { chromium } = require('playwright');
const { GAME_URL } = require('./test_helpers');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 960, height: 640 } });
  const page = await context.newPage();
  const errors = [];
  let pass = 0;
  let fail = 0;

  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const check = (name, ok, detail = '') => {
    if (ok) { pass++; console.log(`PASS ${name}${detail ? ' ' + detail : ''}`); }
    else { fail++; console.log(`FAIL ${name}${detail ? ' ' + detail : ''}`); }
  };
  const state = () => page.evaluate(() => ({
    held: window.__api.inputState,
    sources: window.__api.inputSourceCount,
    buffer: window.__api.inputBuffer,
    paused: window.__api.paused,
  }));

  await page.goto(GAME_URL);
  await page.waitForFunction(() => window.__api && window.__api.game.state === 'title');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__api.game.state === 'play');
  await page.evaluate(() => { window.__api.player.invuln = 99999; });

  const controlsVisible = await page.evaluate(() => getComputedStyle(document.getElementById('touch')).display === 'flex');
  check('on-screen controls are available to desktop mouse', controlsVisible);

  await page.keyboard.down('ArrowRight');
  let s = await state();
  check('keydown holds movement', s.held.right && s.sources === 1, JSON.stringify(s));
  await page.keyboard.up('ArrowRight');
  s = await state();
  check('keyup releases movement', !s.held.right && s.sources === 0, JSON.stringify(s));

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true })));
  s = await state();
  check('keyboard source uses physical code when available', s.held.right && s.sources === 1, JSON.stringify(s));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', code: '', bubbles: true })));
  s = await state();
  check('mismatched keyup identity still releases control', !s.held.right && s.sources === 0, JSON.stringify(s));

  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  s = await state();
  check('blur clears held controls', !s.held.right && s.sources === 0, JSON.stringify(s));
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('ArrowLeft');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  s = await state();
  check('visibility loss clears held controls', !s.held.left && s.sources === 0, JSON.stringify(s));
  await page.keyboard.up('ArrowLeft');

  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowLeft');
  s = await state();
  check('opposite-direction release ordering', !s.held.left && s.held.right && s.sources === 1, JSON.stringify(s));
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('Control');
  s = await state();
  check('Control maps to fire', s.held.fire, JSON.stringify(s));
  await page.keyboard.up('Control');
  await page.keyboard.down('Shift');
  s = await state();
  check('Shift maps to dash', s.held.dash, JSON.stringify(s));
  await page.keyboard.up('Shift');
  s = await state();
  check('modifier release clears actions', !s.held.fire && !s.held.dash && s.sources === 0, JSON.stringify(s));

  const fire = page.locator('#touch .fire');
  await fire.hover();
  await page.mouse.down();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('x');
  s = await state();
  check('mouse fire combines with keyboard move + jump', s.held.fire && s.held.right && s.held.jump && s.sources === 3, JSON.stringify(s));
  await page.keyboard.up('x');
  await page.keyboard.up('ArrowRight');
  s = await state();
  check('releasing keyboard leaves mouse fire held', s.held.fire && !s.held.right && !s.held.jump && s.sources === 1, JSON.stringify(s));
  await page.mouse.up();
  s = await state();
  check('mouse release clears its own fire source', !s.held.fire && s.sources === 0, JSON.stringify(s));

  await page.keyboard.down('ArrowRight');
  await page.locator('#touch .right').hover();
  await page.mouse.down();
  s = await state();
  check('keyboard and mouse can own the same direction together', s.held.right && s.sources === 2, JSON.stringify(s));
  await page.mouse.up();
  s = await state();
  check('mouse release preserves keyboard ownership', s.held.right && s.sources === 1, JSON.stringify(s));
  await page.keyboard.up('ArrowRight');
  s = await state();
  check('final keyboard release clears shared direction', !s.held.right && s.sources === 0, JSON.stringify(s));

  await page.evaluate(() => {
    const a = window.__api, p = a.player;
    p.y = a.GROUND * 16 - 0.01; p.vx = 0; p.vy = 0; p.onGround = true;
    p.jumping = false; p.jumpHeld = false; p.fireCd = 0; p.aim = 'right'; a.bullets.length = 0;
  });
  await page.keyboard.down('z');
  await page.keyboard.down('x');
  await page.waitForTimeout(5);
  await page.keyboard.up('z');
  await page.keyboard.up('x');
  let rapidWorked = true;
  try {
    await page.waitForFunction(() => window.__api.player.fireCd > 0 || window.__api.bullets.length > 0, null, { timeout: 1500 });
    await page.waitForFunction(() => !window.__api.player.onGround, null, { timeout: 1500 });
  } catch (_err) { rapidWorked = false; }
  check('5ms fire + jump taps are buffered', rapidWorked);

  await page.waitForFunction(() => window.__api.player.onGround, null, { timeout: 4000 });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__api.paused);
  s = await state();
  check('pause clears active movement', s.paused && !s.held.right && s.sources === 0, JSON.stringify(s));
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('p');
  await page.waitForFunction(() => !window.__api.paused);
  s = await state();
  check('resume starts from neutral input', !s.held.right && s.sources === 0, JSON.stringify(s));

  const right = page.locator('#touch .right');
  await right.dispatchEvent('pointerdown', { pointerId: 77, pointerType: 'touch', bubbles: true });
  s = await state();
  check('touch pointerdown holds movement', s.held.right, JSON.stringify(s));
  await page.locator('body').dispatchEvent('pointercancel', { pointerId: 77, pointerType: 'touch', bubbles: true });
  s = await state();
  check('global pointercancel releases touch', !s.held.right && s.sources === 0, JSON.stringify(s));

  await right.dispatchEvent('pointerdown', { pointerId: 78, pointerType: 'touch', bubbles: true });
  await right.dispatchEvent('lostpointercapture', { pointerId: 78, pointerType: 'touch', bubbles: true });
  s = await state();
  check('lost pointer capture releases touch', !s.held.right && s.sources === 0, JSON.stringify(s));

  console.log(`\n==== INPUT FINAL: ${pass} passed, ${fail} failed ====`);
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})().catch(err => { console.error('FATAL', err); process.exit(1); });
