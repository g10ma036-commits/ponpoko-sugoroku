// フェリーの画面テスト：光るフェリーマスを押す →「やめる」→ もう一度押して「ここへ行く！」→
// フェリーに乗るか聞かれる →「乗る！」→ 船が航路をわたって、相手の乗り場に着く
//   node scripts/smoke-ferry.mjs <URL> <出力フォルダ>
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const KEY = 'ponpoko-sugoroku/save/v1';
const FROM = 'natto'; // なっとう町。となりにフェリーマスがある
const FERRY = 'natto~nigiwai~0';
const TO = 'koori~bokujo~1';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const tapText = async (text) => page.getByText(text, { exact: false }).first().click();
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
// オープニングは押してとばす
await page.waitForTimeout(500);
if (await page.locator('.opening').count()) await page.locator('.opening').click();
await page.waitForTimeout(1500);

// セーブを書きかえて、なっとう町の分かれ道で「あと1マス」の状態にする（おまつり会場は北海道のこおり湖）
await page.evaluate(
  ({ KEY, FROM }) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    s.queue = [];
    s.turn = 0;
    s.destination = 'koori';
    s.players[0].pos = FROM;
    s.phase = { t: 'moving', steps: 1, dice: [1], prev: null, options: ['tanabata~natto~4', 'natto~nigiwai~0'], walked: 0 };
    localStorage.setItem(KEY, JSON.stringify(s));
  },
  { KEY, FROM },
);
await page.reload();
await page.waitForTimeout(800);
await tapText('つづきから');
await page.waitForTimeout(1200);
await shot('f01-fork');

const hit = page.locator(`[data-goal="${FERRY}"]`);
if (!(await hit.count())) fail('フェリーマスが光っていない');
// 1回目は「やめる」
await hit.dispatchEvent('click');
await page.waitForTimeout(400);
await shot('f02-confirm');
if (!(await page.getByText('フェリーで', { exact: false }).count())) fail('フェリーマスの説明が出ない');
await page.locator('.sheet .btn', { hasText: 'やめる' }).click();
await page.waitForTimeout(400);
if (await page.locator('.sheet').count()) fail('「やめる」でとじない');
if (!(await page.locator('.dir-opt').count())) fail('「やめる」のあと分かれ道の矢印が消えた');
// 2回目は「ここへ行く！」
await hit.dispatchEvent('click');
await page.waitForTimeout(400);
await page.locator('.sheet .btn-primary', { hasText: 'ここへ行く' }).click();
await page.waitForTimeout(2200);
await shot('f03-ferry-ask');
const ride = page.locator('.sheet .btn-primary', { hasText: '乗る' });
if (!(await ride.count())) fail('フェリーに乗るか聞かれない');
const askText = await page.locator('.sheet').innerText().catch(() => '');
console.log(askText.replace(/\s+/g, ' ').slice(0, 160));
await ride.click();
await page.waitForTimeout(1100);
await shot('f04-voyage');
if (!(await page.locator('.voyage').count())) fail('船のアニメーションが出ない');
await page.waitForTimeout(2500);
await shot('f05-arrived');
if (!(await page.getByText('着いた', { exact: false }).count())) fail('「着いた！」が出ない');
const pos = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).players[0].pos, KEY);
console.log(`pos=${pos} ${pos === TO ? 'OK' : 'NG'}`);
if (pos !== TO) fail('相手の乗り場に着いていない');
await page.locator('.dialog').click();
await page.waitForTimeout(800);
await shot('f06-after');

// CPU（2人目）がフェリーの乗り場で考える番：おまつり会場に近づくので乗るはず
await page.evaluate(
  ({ KEY, FERRY }) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    s.queue = [];
    s.turn = 1;
    s.destination = 'koori';
    s.players[1].pos = FERRY;
    s.phase = { t: 'ferry', to: 'koori~bokujo~1' };
    localStorage.setItem(KEY, JSON.stringify(s));
  },
  { KEY, FERRY },
);
await page.reload();
await page.waitForTimeout(800);
await tapText('つづきから');
let sawCpuShip = false;
for (let i = 0; i < 40 && !sawCpuShip; i++) {
  await page.waitForTimeout(100);
  if (await page.locator('.voyage').count()) sawCpuShip = true;
}
await page.waitForTimeout(600);
await shot('f07-cpu-voyage');
if (!sawCpuShip) fail('CPUがフェリーに乗らない（船が出ない）');
await page.waitForTimeout(4000);
const cpuPos = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).players[1].pos, KEY);
console.log(`cpu pos=${cpuPos} ${cpuPos === TO ? 'OK' : 'NG'}`);
if (cpuPos !== TO) fail('CPUが相手の乗り場に着いていない');

console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
