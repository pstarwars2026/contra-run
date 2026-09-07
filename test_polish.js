const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { GAME_URL } = require('./test_helpers');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  let failures = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    // Drive the real simulation explicitly so frame rate cannot hide a regression.
    await context.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(GAME_URL);
    const check = async (name, test) => {
      try { await test(); console.log('PASS', name); }
      catch (error) { failures++; console.error('FAIL', name, error.message); }
    };
    const reset = async (stage = 0) => page.evaluate(stage => {
      clearInputSources(); paused = false; game.state = 'play'; game.stage = stage;
      resetStage(); enemies = []; player.invuln = 99999;
      player.x = 80; player.y = GROUND * 16 - 0.01; player.onGround = true;
    }, stage);

    await check('jump + Control fire + Up shoots straight up', async () => {
      await reset();
      await page.keyboard.down('ArrowUp'); await page.keyboard.down('Control'); await page.keyboard.down('Space');
      const shot = await page.evaluate(() => {
        stepGame();
        return { airborne: !player.onGround, aim: player.aim, vx: bullets[0]?.vx, vy: bullets[0]?.vy };
      });
      await page.keyboard.up('Space'); await page.keyboard.up('Control'); await page.keyboard.up('ArrowUp');
      assert.ok(shot.airborne && shot.aim === 'up' && Math.abs(shot.vx) < 0.001 && shot.vy < 0, JSON.stringify(shot));
    });
    await check('direction + Up retains diagonal airborne fire', async () => {
      for (const [key, aim] of [['ArrowRight', 'ur'], ['ArrowLeft', 'ul']]) {
        await reset();
        await page.keyboard.down(key); await page.keyboard.down('ArrowUp');
        await page.keyboard.down('Control'); await page.keyboard.down('Space');
        const actual = await page.evaluate(() => { stepGame(); return player.aim; });
        await page.keyboard.up('Space'); await page.keyboard.up('Control');
        await page.keyboard.up('ArrowUp'); await page.keyboard.up(key);
        assert.equal(actual, aim);
      }
    });
    await check('every zone respawns on permanent ground with clear space', async () => {
      for (let stage = 0; stage < 3; stage++) {
        await reset(stage);
        const spawns = await page.evaluate(() => {
          const results = [];
          for (const x of CPS.slice(1)) {
            player.x = x + 40; player.y = GROUND * 16 - 0.01;
            player.onGround = true; player.inWater = false; updatePlayer();
            player.dead = true; player.deadT = TUNE.respawnFrames; lives = 9; updatePlayer();
            const feet = [-8, 0, 8].map(dx => tileAt(player.x + dx, player.y + 1));
            results.push({ x: player.x, feet, head: tileAt(player.x, player.y - player.h) });
          }
          return results;
        });
        for (const spawn of spawns) assert.ok(spawn.feet.every(tile => ['G', 'D', 'S'].includes(tile)) && spawn.head === '.', JSON.stringify({ stage, ...spawn }));
      }
    });
    await check('pause freezes simulation, messages, and camera effects', async () => {
      await reset();
      const result = await page.evaluate(() => {
        game.msgT = 120; game.introT = 100; game.warnT = 80; game.shake = 4;
        setPaused(true); sync3D();
        const snapshot = () => ({ t: game.t, msg: game.msgT, intro: game.introT, warn: game.warnT, shake: game.shake, camera: camera.position.toArray() });
        const before = snapshot();
        for (let i = 0; i < 30; i++) { stepGame(); sync3D(); syncHUD(); }
        const after = snapshot(); setPaused(false); return { before, after };
      });
      assert.deepEqual(result.after, result.before);
    });
    await check('a spent projectile cannot hit an enemy and boss node', async () => {
      await reset();
      const result = await page.evaluate(() => {
        boss.active = true; camX = boss.x - 200;
        const pod = boss.pods[0], x = boss.x + pod.ox, y = GROUND * 16 - 14 + pod.oy, initial = pod.hp;
        enemies = [{ x, y: y + 8, w: 12, h: 16, type: 'sniper', hp: 3, alive: true }];
        bullets = [{ x, y, vx: 0, vy: 0, t: 0, dmg: 1, kind: 'n' }]; updateBullets();
        return { initial, podHp: pod.hp, enemyHp: enemies[0].hp, bullets: bullets.length };
      });
      assert.equal(result.enemyHp, 2); assert.equal(result.podHp, result.initial); assert.equal(result.bullets, 0);
    });
    await check('hostile projectiles expire above the screen and by age', async () => {
      await reset();
      const count = await page.evaluate(() => {
        ebullets = [{ x: 24, y: -20, vx: 0, vy: -1, t: 0 }, { x: 40, y: 20, vx: 0, vy: 0, t: 599 }];
        updateBullets(); return ebullets.length;
      });
      assert.equal(count, 0);
    });
    await check('next zone preserves campaign score and earned extra lives', async () => {
      await reset();
      const result = await page.evaluate(() => {
        game.state = 'victory'; score = 23000; lives = 5; next1up = 70000; startTap = true; stepGame();
        return { stage: game.stage, score, lives, next1up };
      });
      assert.deepEqual(result, { stage: 1, score: 23000, lives: 5, next1up: 70000 });
    });

    await check('checkpoint sites survive bridge collapse in all three zones', async () => {
      for (let stage = 0; stage < 3; stage++) {
        await reset(stage);
        const valid = await page.evaluate(() => {
          for (const column of map) if (column[GROUND] === 'B') column[GROUND] = '.';
          return checkpointSpawns.length >= 4 && checkpointSpawns.every(site =>
            [-16, 0, 16].every(dx => ['G', 'D', 'S'].includes(tileAt(site.x + dx, site.y + 1))));
        });
        assert.ok(valid, `zone ${stage + 1}`);
      }
    });
    await check('airborne crossings do not secure a checkpoint until landing', async () => {
      await reset();
      const result = await page.evaluate(() => {
        const site = checkpointSpawns[1];
        player.x = site.x + 20; player.y = 100; player.onGround = false; player.vy = 0;
        updatePlayer(); const airborneCp = lastCp;
        player.y = GROUND * 16 - 0.01; player.onGround = true; player.vy = 0;
        updatePlayer(); buildCheckpointMarkers(); sync3D();
        return { airborneCp, groundedCp: lastCp, expected: site.x, message: game.msg,
          activeFlag: checkpointGroup.children[0].userData.flag.material === checkpointActiveMaterial };
      });
      assert.equal(result.airborneCp, 24); assert.equal(result.groundedCp, result.expected);
      assert.equal(result.message, 'CHECKPOINT SECURED'); assert.ok(result.activeFlag);
    });
    await check('a fresh pointer dash works while keyboard dash remains held', async () => {
      await reset();
      await page.keyboard.down('Shift');
      await page.evaluate(() => { stepGame(); player.dashT = 0; player.dashCd = 0; });
      await page.locator('#touch .dash').dispatchEvent('pointerdown', { pointerId: 71, pointerType: 'touch' });
      const active = await page.evaluate(() => { stepGame(); return player.dashT > 0; });
      await page.locator('#touch .dash').dispatchEvent('pointerup', { pointerId: 71, pointerType: 'touch' });
      await page.keyboard.up('Shift'); assert.ok(active);
    });
    await check('volume, mute, and reduced effects survive reload', async () => {
      await reset();
      await page.evaluate(() => setPaused(true));
      await page.locator('#musicVolume').evaluate(el => { el.value = '30'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.locator('#reducedEffects').check(); await page.locator('#muteButton').click();
      await page.reload();
      const settings = await page.evaluate(() => ({ volume: musicVolume, muted, reduced: preferences.reducedEffects,
        slider: document.getElementById('musicVolume').value, label: document.getElementById('muteButton').textContent,
        classActive: document.documentElement.classList.contains('reduced-effects') }));
      assert.deepEqual(settings, { volume: 0.3, muted: true, reduced: true, slider: '30', label: 'Unmute', classActive: true });
    });
    await check('corrupt preferences fall back to system reduced-motion preference', async () => {
      await page.evaluate(() => localStorage.setItem(PREFERENCES_KEY, '{broken'));
      await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload();
      assert.deepEqual(await page.evaluate(() => ({ volume: musicVolume, muted, reduced: preferences.reducedEffects })),
        { volume: 0.65, muted: false, reduced: true });
    });
    await check('blocked browser storage does not prevent settings or play', async () => {
      await page.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      });
      await page.reload();
      const result = await page.evaluate(() => { Music.setVolume(0.4); startTap = true; stepGame(); return { volume: musicVolume, state: game.state }; });
      assert.deepEqual(result, { volume: 0.4, state: 'play' });
    });
    await check('portrait and landscape preserve the full playfield without stretching', async () => {
      for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
        await page.setViewportSize(viewport);
        const view = await page.evaluate(() => {
          window.dispatchEvent(new Event('resize'));
          const r = renderer.domElement.getBoundingClientRect();
          return { ratio: r.width / r.height, expected: (camera.right - camera.left) / (camera.top - camera.bottom),
            left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: innerWidth, height: innerHeight,
            worldWidth: camera.right - camera.left, worldHeight: camera.top - camera.bottom };
        });
        assert.ok(Math.abs(view.ratio - view.expected) < 0.001, JSON.stringify(view));
        assert.ok(view.left >= -0.1 && view.top >= -0.1 && view.right <= view.width + 0.1 && view.bottom <= view.height + 0.1, JSON.stringify(view));
        assert.equal(view.worldWidth, 344); assert.equal(view.worldHeight, 272);
      }
    });
    await check('reduced effects suppress shake without changing the simulation', async () => {
      await reset();
      const result = await page.evaluate(() => {
        preferences.reducedEffects = true; game.shake = 5; game.warnT = 10; sync3D(); syncHUD();
        return { x: camera.position.x, expected: camX + 128, shake: game.shake,
          warning: document.getElementById('warn').style.opacity, visible: playerModel.visible };
      });
      assert.equal(result.x, result.expected); assert.equal(result.shake, 5);
      assert.equal(result.warning, '0.9'); assert.ok(result.visible);
    });
    await check('every original song has four distinct arrangements and a quieter interlude', async () => {
      const arrangements = await page.evaluate(() => Object.entries(SONGS).map(([name, song]) => {
        const length = song.seq.length * 16;
        const phrases = Array.from({ length: 4 }, (_, phrase) => Array.from({ length }, (_, i) => {
          const a = musicArrangement(song, phrase * length + i);
          return { lead: a.lead, kind: a.kind, drum: a.drum };
        }));
        return { name, distinct: new Set(phrases.map(p => JSON.stringify(p))).size,
          counts: phrases.map(p => p.filter(n => n.lead).length) };
      }));
      for (const a of arrangements) { assert.equal(a.distinct, 4, a.name); assert.ok(a.counts[2] < a.counts[0], a.name); }
    });
    await check('complete original arrangements render audible audio without clipping', async () => {
      const levels = await page.evaluate(async () => {
        Music.stop(); muted = false; paused = false; focusLost = false;
        const results = [];
        for (const [name, song] of Object.entries(SONGS)) {
          const steps = song.seq.length * 16 * 4, stepDur = 60 / song.bpm / 4, duration = steps * stepDur + 1;
          AC = new OfflineAudioContext(1, Math.ceil(duration * 22050), 22050);
          musicBus = AC.createGain(); musicBus.gain.value = 0.65; musicBus.connect(AC.destination);
          for (let step = 0; step < steps; step++) scheduleMusicStep(song, step, 0.02 + step * stepDur);
          const rendered = await AC.startRendering(), data = rendered.getChannelData(0);
          let peak = 0, sum = 0;
          for (const sample of data) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
          results.push({ name, peak, rms: Math.sqrt(sum / data.length) });
        }
        return results;
      });
      for (const level of levels) assert.ok(Number.isFinite(level.peak) && level.peak > 0.01 && level.peak < 0.98 && level.rms > 0.002, JSON.stringify(level));
      console.log('Audio render levels:', JSON.stringify(levels));
    });
    assert.deepEqual(errors, [], 'browser errors');
    assert.equal(failures, 0, `${failures} polish regressions failed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
