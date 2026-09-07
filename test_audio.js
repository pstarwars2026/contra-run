const { chromium } = require('playwright');
const { GAME_URL } = require('./test_helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const check = (name, ok, value) => {
    if (!ok) throw new Error(`${name}: ${JSON.stringify(value)}`);
    console.log(`PASS ${name}`, JSON.stringify(value));
  };

  await page.goto(GAME_URL);
  await page.waitForTimeout(500);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(120);
  let s = await page.evaluate(() => ({ game: window.__api.game.state, music: window.__api.musicState }));
  check('title theme', s.game === 'title' && s.music === 'title', s);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(180);
  s = await page.evaluate(() => ({ game: window.__api.game.state, stage: window.__api.game.stage, music: window.__api.musicState }));
  check('zone 1 gameplay theme', s.game === 'play' && s.stage === 0 && s.music === 'stage1', s);

  await page.evaluate(() => { const a=window.__api; a.player.x=1860; a.player.y=100; a.player.invuln=99999; });
  await page.waitForFunction(() => window.__api.boss.active && window.__api.musicState === 'boss', null, { timeout: 5000 });
  s = await page.evaluate(() => ({ active: window.__api.boss.active, music: window.__api.musicState }));
  check('boss theme', s.active && s.music === 'boss', s);

  await page.evaluate(() => { const a=window.__api; a.boss.pods.forEach(p=>p.dead=true); a.boss.core.dead=true; a.boss.dying=1; });
  await page.waitForFunction(() => window.__api.game.state === 'victory', null, { timeout: 5000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__api.game.state === 'play' && window.__api.game.stage === 1, null, { timeout: 5000 });
  s = await page.evaluate(() => ({ stage: window.__api.game.stage, music: window.__api.musicState }));
  check('zone 2 gameplay theme', s.stage === 1 && s.music === 'stage2', s);

  await page.evaluate(() => { const a=window.__api; a.boss.active=true; a.boss.pods.forEach(p=>p.dead=true); a.boss.core.dead=true; a.boss.dying=1; });
  await page.waitForFunction(() => window.__api.game.state === 'victory', null, { timeout: 5000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__api.game.state === 'play' && window.__api.game.stage === 2, null, { timeout: 5000 });
  s = await page.evaluate(() => ({ stage: window.__api.game.stage, music: window.__api.musicState }));
  check('zone 3 gameplay theme', s.stage === 2 && s.music === 'stage3', s);

  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__api.paused && window.__api.audioState === 'suspended');
  check('pause state', await page.evaluate(() => window.__api.paused), true);
  await page.keyboard.press('m');
  await page.keyboard.press('m');
  await page.waitForTimeout(100);
  s = await page.evaluate(() => ({paused: window.__api.paused, muted: window.__api.muted, audio: window.__api.audioState}));
  check('unmuting while paused stays silent', s.paused && !s.muted && s.audio === 'suspended', s);

  await page.locator('#musicVolume').evaluate(el => { el.value='0'; el.dispatchEvent(new Event('input', {bubbles:true})); });
  check('music can be silenced independently', await page.evaluate(() => window.__api.musicVolume === 0 && !window.__api.muted), true);
  await page.keyboard.press('m');
  await page.keyboard.press('p');
  await page.waitForFunction(() => !window.__api.paused);
  await page.waitForTimeout(100);
  s = await page.evaluate(() => ({paused: window.__api.paused, muted: window.__api.muted, audio: window.__api.audioState}));
  check('resuming while muted stays silent', !s.paused && s.muted && s.audio === 'suspended', s);
  await page.keyboard.press('m');
  await page.waitForFunction(() => window.__api.audioState === 'running');
  await page.waitForTimeout(180);
  s = await page.evaluate(() => ({level: musicBus.gain.value, muted, audio: AC.state}));
  check('music-off leaves effects output running', s.level < .01 && !s.muted && s.audio === 'running', s);

  await page.keyboard.press('m');
  await page.waitForTimeout(80);
  check('mute state', await page.evaluate(() => window.__api.muted), true);
  await page.keyboard.press('m');
  await page.waitForTimeout(80);
  check('unmute state', !(await page.evaluate(() => window.__api.muted)), false);

  if (errors.length) throw new Error(errors.join(' | '));
  console.log('PASS audio state machine + three zone tracks');
  await browser.close();
})().catch(err => { console.error('FAIL', err); process.exit(1); });
