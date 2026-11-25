// 「マスを押すと説明」「止まれるマスが光り、押すと説明が出て、そこまで一気に進める」の画面テスト
//   node scripts/smoke-reach.mjs <URL> <出力フォルダ>
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
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('ponpoko-sugoroku/save/v1') ?? 'null'));
const fail = (m) => {
  console.log(`FAIL: ${m}`);
  errors.push(m);
};

await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(800);
await tapText('はじめから');
await page.waitForTimeout(300);
await tapText('ゲームスタート');
await page.waitForTimeout(600);
while (await page.locator('.dialog').count()) {
  await page.locator('.dialog').click();
  await page.waitForTimeout(500);
}

// 1) 盤面のマスを実際にタップ → 説明が出る
// 画面の中に見えていて、コマが乗っていないマスを探して、その場所をタップする
const spot = await page.evaluate(() => {
  const board = document.querySelector('.board').getBoundingClientRect();
  for (const g of document.querySelectorAll('[data-node]')) {
    if (g.getAttribute('data-node').includes('~') === false) continue; // 駅以外
    const r = g.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x < board.left + 30 || x > board.right - 80 || y < board.top + 30 || y > board.bottom - 30) continue;
    const hit = document.elementFromPoint(x, y);
    if (hit && hit.closest('[data-node]') === g) return { x, y, id: g.getAttribute('data-node') };
  }
  return null;
});
if (!spot) fail('画面の中にタップできるマスがない');
else await page.touchscreen.tap(spot.x, spot.y);
await page.waitForTimeout(400);
if (!(await page.locator('.sheet .sq-desc').count())) fail('マスをタップしても説明が出ない');
await shot('r01-square-info');
await page.locator('.sheet-close').click();
await page.waitForTimeout(300);

// 2) 駅（スタート地点）の説明
await page.locator('[data-node="nigiwai"]').dispatchEvent('click');
await page.waitForTimeout(400);
await shot('r02-station-info');
await page.locator('.sheet-close').click();
await page.waitForTimeout(300);

// 3) おまつり会場（上のバー）
await page.locator('button.dest').click();
await page.waitForTimeout(400);
if (!(await page.getByText('いまの おまつり会場').count())) fail('おまつり会場の説明が出ない');
await shot('r03-dest-info');
await page.locator('.sheet-close').click();
await page.waitForTimeout(300);

// 4) 人間の番で、分かれ道に止まるまで何ターンか遊ぶ。分かれ道で光るマスを押して、そこに止まるか確かめる
let checked = false;
let sawRingsWhileWalking = false;
for (let i = 0; i < 400 && !checked; i++) {
  await page.waitForTimeout(250);
  if (await page.locator('.dialog').count()) {
    await page.locator('.dialog').click();
    continue;
  }
  const fast = page.getByText('はやおくり', { exact: true });
  if (await fast.count()) {
    await fast.click();
    continue;
  }
  if (await page.locator('.handoff').count()) {
    await page.locator('.handoff .btn').click();
    continue;
  }
  if ((await page.locator('.reach-ring').count()) > 1 && !(await page.locator('.dir-arrow').count())) {
    if (!sawRingsWhileWalking) await shot('r04-rings-walking');
    sawRingsWhileWalking = true;
  }
  if (await page.locator('.dir-arrow').count()) {
    const n = await page.locator('.reach-hit').count();
    await page.waitForTimeout(600); // カメラが引くのを待つ
    await shot('r05-fork-rings');
    if (n < 1) {
      fail('分かれ道なのに光るマスがない');
      break;
    }
    const hit = page.locator('.reach-hit').nth(n - 1);
    const goal = await hit.getAttribute('data-goal');
    await hit.dispatchEvent('click');
    await page.waitForTimeout(400);
    // 光るマスを押すと、まず説明と「ここへ行く！」が出る
    const go = page.locator('.sheet .btn-primary', { hasText: 'ここへ行く' });
    if (!(await go.count())) {
      fail('光るマスを押しても「ここへ行く！」が出ない');
      break;
    }
    await shot('r06a-goal-confirm');
    await go.click();
    await page.waitForTimeout(300);
    await shot('r06-goal-chosen');
    // 止まるまで待つ（途中で矢印が出たら失敗）
    for (let k = 0; k < 120; k++) {
      await page.waitForTimeout(250);
      if (await page.locator('.dir-arrow').count()) {
        fail('行き先を選んだのに、また分かれ道で止まった');
        break;
      }
      const s = await save();
      if (s && s.phase.t !== 'moving') {
        const pos = s.players[0].pos;
        console.log(`goal=${goal} landed=${pos} ${pos === goal ? 'OK' : 'NG'}`);
        if (pos !== goal) fail('選んだマスに止まっていない');
        break;
      }
      if (await page.locator('.dialog').count()) await page.locator('.dialog').click();
    }
    await page.waitForTimeout(500);
    await shot('r07-landed');
    checked = true;
    break;
  }
  if (await page.locator('.sheet').count()) {
    const done = page.locator('.sheet-foot .btn-primary');
    if (await done.count()) await done.click();
    else if (await page.locator('.sheet-close').count()) await page.locator('.sheet-close').click();
    else await page.locator('.sheet .btn-danger').first().click();
    continue;
  }
  if (await page.locator('.roll-btn').count()) {
    await page.locator('.roll-btn').click();
    continue;
  }
}
if (!checked) fail('分かれ道に一度も止まらなかった');
console.log(`rings while walking: ${sawRingsWhileWalking}`);
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
