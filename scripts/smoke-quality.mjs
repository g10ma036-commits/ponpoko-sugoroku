// 演出・景気ニュース・案内・決算・結果画面・図鑑の画面テスト（スクリーンショットを撮って目で確かめる）
//   node scripts/smoke-quality.mjs <URL> <出力フォルダ>
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const KEY = 'ponpoko-sugoroku/save/v1';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const tapText = async (text) => page.getByText(text, { exact: false }).first().click();
const wait = (ms) => page.waitForTimeout(ms);
const fail = (m) => {
  console.log(`FAIL: ${m}`);
  errors.push(m);
};
const has = async (sel) => (await page.locator(sel).count()) > 0;
/** セーブを書きかえて「つづきから」で再開する */
const inject = async (fn, arg) => {
  await page.evaluate(
    ({ KEY, src, arg }) => {
      const s = JSON.parse(localStorage.getItem(KEY));
      // eslint-disable-next-line no-new-func
      new Function('s', 'arg', src)(s, arg);
      localStorage.setItem(KEY, JSON.stringify(s));
    },
    { KEY, src: fn, arg },
  );
  await page.reload();
  await wait(700);
  await tapText('つづきから');
  await wait(900);
};

await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(800);
if (!(await page.getByText('図鑑').count())) fail('タイトルに図鑑ボタンがない');
await tapText('はじめから');
await wait(300);
await shot('q00-setup');
await tapText('ゲームスタート');
await wait(1200);

// はじめのメッセージ：ようこそ → おまつり会場 → 景気ニュース
for (let i = 0; i < 2; i++) {
  await page.locator('.dialog').click();
  await wait(700);
}
await shot('q01-news');
if (!(await has('.news-mast'))) fail('景気ニュースが新聞ふうに出ない');
await page.locator('.dialog').click();
await wait(900);

// 案内のふきだし
await shot('q02-tip');
if (!(await has('.tutorial'))) fail('はじめての案内が出ない');
await page.locator('.tutorial-ok').click();
await wait(400);

// 景気ニュースの画面
await page.locator('[aria-label="景気ニュース"]').click();
await wait(400);
await shot('q03-news-sheet');
if (!(await page.getByText('好景気').count())) fail('景気ニュースの画面が出ない');
await page.locator('.sheet-close').click();
await wait(300);

// お金のカウントアップ：こばんを使う
await inject(`s.queue = []; s.players[0].cards = ['koban']; s.phase = { t: 'action' }; s.turn = 0;`);
await page.locator('.cards-btn').click();
await wait(300);
await page.locator('.sheet .btn-primary', { hasText: '使う' }).first().click();
await wait(250);
await shot('q04-money');
if (!(await has('.money-pop'))) fail('お金の増減がふわっと出ない');
await wait(700);
await page.locator('.dialog').click();
await wait(500);

// ひとりじめ：しかの都を全部持っている＋お祝いのメッセージ
await inject(`
  s.queue = [{ tone: 'good', celebrate: true, title: 'ひとりじめ！', text: 'しかの都の物件を ぜんぶ手に入れた！', speaker: s.players[0].charId, expr: 'happy', player: 0 }];
  for (const id of arg.ids) s.owner[id] = 0;
  s.players[0].pos = 'shika';
  s.phase = { t: 'end' };
  s.turn = 0;
`, { ids: ['shika#0', 'shika#1', 'shika#2', 'shika#3'] });
await shot('q05-monopoly-msg');
if (!(await has('.quip'))) fail('口ぐせのふきだしが出ない');

// 到着：花火
await inject(`s.queue = [{ tone: 'arrival', title: 'おまつり会場に一番のり！', text: 'おめでとう！\\n賞金 1万両', speaker: s.players[0].charId, expr: 'happy', player: 0, delta: 10000 }]; s.phase = { t: 'end' }; s.turn = 0;`);
await wait(500);
await shot('q06-arrival');
if (!(await has('.fireworks'))) fail('到着の花火が出ない');

// ひとりじめの旗（盤面）
await inject(`s.queue = []; s.phase = { t: 'action' }; s.turn = 0; s.players[0].pos = 'shika'; for (const id of arg) s.owner[id] = 0;`, ['shika#0', 'shika#1', 'shika#2', 'shika#3']);
await page.locator('.tutorial-stop').click().catch(() => {});
await wait(500);
await shot('q07-mono-flag');
if (!(await has('.mono-flag'))) fail('ひとりじめの旗が出ない');

// 決算：1人ずつ入って順位が入れかわる
await inject(`
  s.queue = [{ tone: 'event', title: '1年目の決算', text: '1年間の物件の収益が入ったよ！', speaker: 'hoo',
    settlement: [
      { player: 0, income: 3000, monopolies: 1, maneki: false, before: 20000, after: 23000 },
      { player: 1, income: 12000, monopolies: 0, maneki: true, before: 18000, after: 30000 },
      { player: 2, income: 800, monopolies: 0, maneki: false, before: 22000, after: 22800 },
      { player: 3, income: 0, monopolies: 0, maneki: false, before: 15000, after: 15000 },
    ] }];
  s.phase = { t: 'end' }; s.turn = 0;
`);
await wait(200);
await shot('q08-settle-start');
await wait(3000);
await shot('q09-settle-end');
if (!(await page.getByText('いまの総資産ランキング').count())) fail('決算の順位入れかえまで進まない');

// 結果画面：最後の月の最後の人の番から終わらせる
await inject(`
  s.queue = [];
  s.years = 1; s.year = 1; s.month = 12;
  s.turn = s.players.length - 1;
  s.phase = { t: 'end' };
  s.queue = [{ tone: 'info', title: 'テスト', text: 'もうすぐ おわり', speaker: 'hoo' }];
  const n = s.players.length;
  s.history = [];
  for (let m = 0; m < 12; m++) s.history.push(s.players.map((p, k) => Math.round(10000 + m * (900 + k * 700) + Math.sin(m + k) * 3000)));
  s.highlights = {
    buy: { player: 1, amount: 18000, text: 'しろくま港の「かに缶工場」を 1万8000両で 買った', year: 1, month: 5 },
    luck: { player: 0, amount: 4500, text: 'おみくじで 大吉！ 4500両 もらった', year: 1, month: 3 },
    kumo: { player: 2, amount: 2400, text: 'くもすけの雨で さいふから 2400両 流された', year: 1, month: 9 },
    prize: { player: 3, amount: 9000, text: 'しかの都に 一番のりして 賞金 9000両', year: 1, month: 7 },
  };
`);
// CPUの番のメッセージは自動で進む → 決算（タップ2回）→ ゲーム終了（タップ）
for (let i = 0; i < 12 && !(await has('.result')); i++) {
  await wait(900);
  if (await has('.dialog')) await page.locator('.dialog').click();
}
await wait(1200);
await shot('q10-result');
if (!(await has('.asset-chart'))) fail('結果画面にグラフがない');
if (!(await has('.hl'))) fail('結果画面に名場面がない');
await page.locator('.chart-svg').scrollIntoViewIfNeeded();
const box = await page.locator('.chart-svg').boundingBox();
if (box) await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
await wait(300);
await shot('q11-result-chart');
if (!(await has('.chart-tip'))) fail('グラフを押しても金額が出ない');
await page.locator('.hl').first().scrollIntoViewIfNeeded();
await shot('q12-result-highlights');

// 図鑑
await page.getByText('📖 図鑑・記録').click();
await wait(500);
await shot('q13-zukan-stations');
await page.locator('.seg-btn', { hasText: '物件' }).click();
await wait(300);
await shot('q14-zukan-props');
await page.locator('.seg-btn', { hasText: '記録' }).click();
await wait(300);
await shot('q15-zukan-records');
const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('ponpoko-sugoroku/records/v1') ?? 'null'));
console.log(`records: games=${rec?.games} stations=${rec?.stations?.length} props=${rec?.props?.length} best=${rec?.best?.value}`);
if (!rec || rec.games < 1) fail('記録が残っていない');

console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
