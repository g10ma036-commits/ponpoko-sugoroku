// CPUだけの1年対戦を画面で最後まで動かして、決算と結果画面を確認する
//   node scripts/smoke-cpu.mjs <URL> <出力フォルダ>
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

await page.goto(url);
await page.getByText('はじめから').click();
await page.locator('.seg-btn', { hasText: '1年' }).first().click();
await page.locator('.slot').first().locator('.seg-btn', { hasText: 'CPU' }).click();
await page.getByText('ゲームスタート').click();
await page.waitForTimeout(500);
await page.getByText('はやおくり').click();
let settled = false;
const t0 = Date.now();
while (Date.now() - t0 < 240000) {
  await page.waitForTimeout(400);
  if (!settled && (await page.locator('.settle').count())) {
    await page.screenshot({ path: `${out}/20-settlement.png` });
    settled = true;
  }
  if (await page.locator('.result').count()) break;
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/21-result.png` });
console.log('settlement shown:', settled, ' result shown:', (await page.locator('.result').count()) > 0, ' time', Math.round((Date.now() - t0) / 1000), 's');
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
