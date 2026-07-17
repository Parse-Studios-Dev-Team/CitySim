import { chromium } from 'playwright';

const url = process.env.CITYSIM_URL || 'http://127.0.0.1:4173/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await page.goto(url, { waitUntil: 'networkidle' });

await page.click('#btn-new');
await page.waitForSelector('#game-shell.active');
await page.waitForTimeout(200);

// Select Lower tool
await page.click('.tool-btn[data-tool="lower"]');
await page.waitForTimeout(50);

const fundsBefore = await page.locator('#hud-funds').innerText();
const canvas = page.locator('#game-canvas');
const box = await canvas.boundingBox();
if (!box) throw new Error('no canvas box');

const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;

// Pointer path
await page.mouse.click(cx, cy);
await page.waitForTimeout(100);

// Touch drag path
await page.touchscreen.tap(cx, cy + 20);
await page.waitForTimeout(100);

const fundsAfter = await page.locator('#hud-funds').innerText();
const hoverShown = await page.evaluate(() => {
  // funds string like $20,000
  return document.querySelector('#hud-funds')?.textContent ?? '';
});

const pointerAlive = await page.evaluate(() => {
  // canvas should still have listeners; check game still active
  return document.querySelector('#game-shell')?.classList.contains('active') === true;
});

console.log(JSON.stringify({ fundsBefore, fundsAfter, hoverShown, pointerAlive, canvas: box }, null, 2));

if (fundsBefore === fundsAfter) {
  // Try drag paint
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}
const fundsFinal = await page.locator('#hud-funds').innerText();
console.log('fundsFinal', fundsFinal);

if (fundsBefore === fundsFinal) {
  console.error('FAIL: funds unchanged — map interaction did not spend/place');
  await page.screenshot({ path: '/tmp/citysim-touch-fail.png' });
  await browser.close();
  process.exit(1);
}

console.log('OK: map interaction spent funds');
await page.screenshot({ path: '/tmp/citysim-touch-ok.png' });
await browser.close();
