// 本番ビルドを開いてサービスワーカーが入ったあと、ネットを切って再読み込みしても起動するか確認する
//   node scripts/smoke-offline.mjs <URL> <出力フォルダ>
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
const page = await ctx.newPage();
await page.goto(url);
await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return !!reg.active;
});
// プリキャッシュが終わるまで少し待つ
await page.waitForTimeout(4000);
const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
console.log('manifest:', manifest.name, manifest.display, manifest.orientation, manifest.icons.length, 'icons');
await ctx.setOffline(true);
await page.reload();
await page.waitForTimeout(1500);
const title = await page.locator('.logo').textContent();
const fontOk = await page.evaluate(() => document.fonts.check('900 20px "Zen Maru Gothic"', 'ぽんぽこ列島すごろく'));
console.log('offline title:', title, ' font loaded:', fontOk);
await page.getByText('はじめから').click();
await page.getByText('ゲームスタート').click();
// オープニングは押してとばす
await page.waitForTimeout(500);
if (await page.locator('.opening').count()) await page.locator('.opening').click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/30-offline-game.png` });
console.log('offline game started:', (await page.locator('.board').count()) > 0);
await browser.close();
