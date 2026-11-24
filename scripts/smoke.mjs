// 画面の動作確認（PCに入っている Edge をスマホの大きさで動かして、スクリーンショットを撮る）
//   node scripts/smoke.mjs <URL> <出力フォルダ>
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const tapText = async (text) => page.getByText(text, { exact: false }).first().click();

await page.goto(url);
await page.waitForTimeout(800);
await shot('01-title');
await tapText('はじめから');
await page.waitForTimeout(300);
await shot('02-setup');
await tapText('ゲームスタート');
await page.waitForTimeout(600);
await shot('03-welcome');
// ようこそメッセージを進める
for (let i = 0; i < 2; i++) {
  await page.locator('.dialog').click();
  await page.waitForTimeout(600);
}
await shot('04-game');
await tapText('サイコロをふる');
await page.waitForTimeout(700);
await shot('05-dice');
// 人間の手番：分かれ道なら最初の矢印、パネルが出たら「おわる」系で進める
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(600);
  if (await page.locator('.dialog').count()) {
    if (i < 12) await shot(`06-msg-${i}`);
    await page.locator('.dialog').click();
    continue;
  }
  if (await page.locator('.dir-arrow').count()) {
    await shot(`07-branch-${i}`);
    await page.locator('.dir-arrow').first().dispatchEvent('click');
    continue;
  }
  if (await page.locator('.sheet').count()) {
    await shot(`08-sheet-${i}`);
    const buy = page.locator('.sheet .btn-primary:not([disabled])', { hasText: '買う' });
    if (await buy.count()) await buy.first().click();
    await page.waitForTimeout(300);
    const done = page.locator('.sheet-foot .btn-primary');
    if (await done.count()) await done.click();
    else await page.locator('.sheet-foot .btn, .sheet .btn-danger').first().click();
    continue;
  }
  if (await page.getByText('サイコロをふる').count()) {
    await shot(`09-myturn-${i}`);
    break;
  }
}
await page.locator('[aria-label="全体マップ"]').click();
await page.waitForTimeout(700);
await shot('10-overview');
await page.locator('.chip').nth(1).click();
await page.waitForTimeout(300);
await shot('11-player');
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
