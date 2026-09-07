const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { GAME_URL } = require('../test_helpers');

(async () => {
  const destination = path.resolve(__dirname, '../docs/images');
  fs.mkdirSync(destination, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    await page.goto(GAME_URL);
    await page.waitForFunction(() => window.__api);
    await page.screenshot({ path: path.join(destination, 'title-screen.png') });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__api.game.state === 'play');
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => window.__api.player.x >= 160);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(destination, 'gameplay-zone-1.png') });
    await page.keyboard.press('p');
    await page.waitForFunction(() => window.__api.paused);
    await page.screenshot({ path: path.join(destination, 'pause-and-music.png') });
    await page.locator('#resumeButton').click();
    await page.waitForFunction(() => !window.__api.paused);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(destination, 'portrait-controls.png') });
    console.log('Refreshed four screenshots in docs/images.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
