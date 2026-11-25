// 人間2人のときに「○○さんの番です」の画面が出るか確認する
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.getByText('はじめから').click();
await page.locator('.slot').nth(1).locator('.seg-btn', { hasText: '人間' }).click();
await page.locator('.slot').nth(2).locator('.seg-btn', { hasText: 'なし' }).click();
await page.locator('.slot').nth(3).locator('.seg-btn', { hasText: 'なし' }).click();
await page.getByText('ゲームスタート').click();
const seen = [];
for (let i = 0; i < 80 && seen.length < 2; i++) {
  await page.waitForTimeout(500);
  if (await page.locator('.handoff').count()) {
    const name = await page.locator('.handoff-name').textContent();
    seen.push(name);
    if (seen.length === 2) await page.screenshot({ path: `${out}/40-handoff.png` });
    await page.locator('.handoff .btn').click();
    continue;
  }
  if (await page.locator('.dialog').count()) { await page.locator('.dialog').click(); continue; }
  if (await page.locator('.dir-arrow').count()) { await page.locator('.dir-arrow').first().dispatchEvent('click'); continue; }
  if (await page.locator('.sheet-foot .btn-primary').count()) { await page.locator('.sheet-foot .btn-primary').click(); continue; }
  if (await page.locator('.roll-btn').count()) await page.locator('.roll-btn').click();
}
console.log('handoff screens:', seen.join(' / '));
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
