const { chromium } = require('playwright');
const { GAME_URL } = require('./test_helpers');

// Real browser keyboard chords exercise the full input -> physics -> weapon
// path. Synthetic events below explicitly model missed/browser-altered events;
// they do not claim to reproduce OS-level shortcut interception.
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const failures = [], errors = [];
  let passed = 0;
  page.on('pageerror', e => errors.push(e.message));
  const check = (name, ok, detail) => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail || '');
    if (ok) passed++; else failures.push(name);
  };
  const reset = () => page.evaluate(() => {
    clearInputSources();
    Object.assign(player, newPlayer(64, GROUND * 16 - 0.01), { onGround: true, invuln: 99999 });
    bullets.length = 0;
  });
  const outcome = () => page.evaluate(() => ({
    airborne: !player.onGround && player.y < GROUND * 16 - 2,
    shots: bullets.length, x: player.x, held: window.__api.inputState,
  }));
  try {
    await page.goto(GAME_URL);
    await page.waitForFunction(() => window.__api);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__api.game.state === 'play');
    for (const [name, keys] of [
      ['Control then Space', ['ControlLeft', 'Space']],
      ['Space then Control', ['Space', 'ControlLeft']],
      ['right Control + Space', ['ControlRight', 'Space']],
      ['movement + Control + Space', ['ArrowRight', 'ControlLeft', 'Space']],
    ]) {
      await reset();
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForFunction(() => !player.onGround && bullets.length > 0);
      const s = await outcome();
      check(`${name} jumps and fires`, s.airborne && s.shots > 0, s);
      check(`${name} shows both held actions`, await page.locator('#touch .fire.held').count() === 1 && await page.locator('#touch .jump.held').count() === 1);
      // Both release orders must preserve whichever action is still held.
      await page.keyboard.up(keys[keys.length - 1]);
      const held = await page.evaluate(() => window.__api.inputState);
      check(`${name} release preserves the other action`, keys[0] === 'Space' ? held.jump : held.fire, held);
      for (const key of keys.slice(0, -1).reverse()) await page.keyboard.up(key);
    }
    await reset();
    await page.keyboard.down('ControlLeft');
    for (let n = 1; n <= 3; n++) {
      await page.keyboard.press('Space', { delay: 5 });
      await page.waitForFunction(() => !player.onGround && bullets.length > 0);
      check(`held Control with repeated Space jump ${n}`, (await outcome()).airborne);
      await page.waitForFunction(() => player.onGround);
    }
    await page.keyboard.up('ControlLeft');

    await reset();
    await page.evaluate(() => {
      // A modifier can already be down when this page gains focus. Space's
      // ctrlKey is the browser's current modifier snapshot even without a
      // preceding Control keydown delivered to the game.
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ', code: 'Space', ctrlKey: true, bubbles: true, cancelable: true,
      }));
    });
    await page.waitForFunction(() => !player.onGround);
    let s = await outcome();
    check('Space recovers an already-held Control modifier', s.airborne && s.shots > 0 && s.held.fire, s);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', {
      key: ' ', code: 'Space', ctrlKey: false, bubbles: true, cancelable: true,
    })));
    s = await outcome();
    check('modifier snapshot releases a missed Control keyup', !s.held.fire && !s.held.jump, s);

    await reset();
    await page.locator('#touch .jump').hover();
    await page.mouse.down();
    await page.waitForFunction(() => !player.onGround);
    await page.waitForFunction(() => player.onGround);
    await page.keyboard.down('ControlLeft');
    await page.keyboard.press('Space', { delay: 5 });
    await page.waitForTimeout(100);
    s = await outcome();
    check('new Space press jumps while mouse Jump remains held', s.airborne && s.shots > 0, s);
    await page.keyboard.up('ControlLeft');
    await page.mouse.up();

    await reset();
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'z', code: 'Space', bubbles: true, cancelable: true,
    })));
    s = await outcome();
    check('physical Space takes precedence over a changed key value', s.held.jump && !s.held.fire, s);

    await reset();
    await page.keyboard.down('ArrowRight');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowRight', code: 'ArrowRight', repeat: true, bubbles: true,
    })));
    s = await outcome();
    check('lost focus pauses play and ignores stale repeats', !s.held.right && await page.evaluate(() => paused), s);
    await page.keyboard.up('ArrowRight');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    if (await page.evaluate(() => paused)) {
      await page.keyboard.press('p');
      await page.waitForFunction(() => !paused);
    }

    // A quick complete chord between simulation frames must queue both actions.
    await reset();
    await page.evaluate(() => {
      for(const [type,key,code,ctrlKey] of [
        ['keydown','Control','ControlLeft',true], ['keydown',' ','Space',true],
        ['keyup',' ','Space',true], ['keyup','Control','ControlLeft',false],
      ])window.dispatchEvent(new KeyboardEvent(type,{key,code,ctrlKey,bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(() => !player.onGround && bullets.length > 0);
    check('complete between-frame Control + Space tap jumps and fires', (await outcome()).airborne);

    for(const viewport of [{width:320,height:640},{width:390,height:844},{width:844,height:390},{width:1280,height:720}]){
      await page.setViewportSize(viewport);
      const fit = await page.evaluate(() => {
        const rect=selector=>document.querySelector(selector).getBoundingClientRect();
        const a=rect('#touch .pad'), b=rect('#touch .actions');
        const hud=rect('#hud'), utility=rect('#utility'), boss=rect('#bossHud');
        const buttons=[...document.querySelectorAll('#touch button,#utility button')].map(e=>e.getBoundingClientRect());
        return { gap:b.left-a.right, right:b.right, width:innerWidth,
          hudGap:utility.left-hud.right, bossGap:boss.top-hud.bottom,
          usable:buttons.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight) };
      });
      check(`${viewport.width}x${viewport.height} controls and HUD fit`, fit.gap>=6&&fit.right<=fit.width&&fit.hudGap>=4&&fit.bossGap>=4&&fit.usable,fit);
    }
    await page.locator('#pauseButton').click();
    check('on-screen pause opens the music panel', await page.locator('#pausePanel').isVisible() && await page.evaluate(()=>paused));
    await page.locator('#resumeButton').click();
    check('mouse resume leaves gameplay active', !await page.evaluate(()=>paused));
    check('no browser runtime errors', errors.length === 0, errors);
    console.log(`CHORDS: ${passed} passed, ${failures.length} failed`);
  } finally { await browser.close(); }
  if (failures.length || errors.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
