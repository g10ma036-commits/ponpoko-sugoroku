# ぽんぽこ列島すごろく（仮題）

動物たちと日本列島をめぐる、オリジナルのすごろくゲームです（地方名は本物、駅名はオリジナル）。
スマホ1台で遊べるPWA（ホーム画面に追加するとアプリのように動くWebアプリ）で、iPhone・Androidの両方に対応しています。無料・広告なし・オフラインでも遊べます。

**▶ 遊ぶ：https://g10ma036-commits.github.io/ponpoko-sugoroku/**

## ゲームの内容

- 1〜4人。空いた席はCPU（よわい／ふつう／つよい）が担当し、人間どうしは1台のスマホを順番にわたして遊びます
- 1・3・5・10年から期間を選び、最後に総資産（お金＋物件）がいちばん多い人が優勝
- 北海道から沖縄まで9地方・53駅・マス約180・物件228件
- 「おまつり会場」に一番に着くと賞金。駅では物件を買え、12月の決算で収益が入ります
- マス：ふくマス・とほほマス・ふだマス・みせマス・おみくじマス・フェリーマス・駅
- フェリーマスにぴったり止まると、青い点線の航路で遠くの乗り場まで一気に行ける（北海道↔関東、北海道↔北陸、近畿↔九州、東海↔沖縄）
- カード10種類、季節のイベント、いたずら雨雲「くもすけ」

## スマホで試す（同じWi-Fiにつないだ状態で）

```
npm install
npm run dev
```

表示される `Network: http://192.168.x.x:5173/` をスマホのブラウザで開きます。
Windowsのファイアウォールの確認が出たら「許可」してください。
（この方法ではホーム画面への追加・オフライン動作は使えません。公開後に使えます）

## 公開する（GitHub Pages・無料）

1. GitHubで新しいリポジトリを作り、このフォルダをpushする（ブランチ名は `main`）
2. リポジトリの Settings → Pages → Source を「GitHub Actions」にする
3. `main` にpushするたびに `.github/workflows/deploy.yml` が自動でビルドして公開します
4. 公開されたURLをスマホで開き、ホーム画面に追加する
   - iPhone：Safariの共有ボタン →「ホーム画面に追加」
   - Android：Chromeのメニュー →「アプリをインストール」

## 開発用コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm test` | ゲームのルールのテスト |
| `npm run sim -- --games 1000 --years 3` | CPUだけで何試合も対戦させて、止まらないか・バランスを確認 |
| `npm run sim -- --games 600 --levels 1,2,3,2` | CPUの強さを混ぜて勝率を比べる |
| `npm run build` | 本番用ビルド（`dist/`） |
| `npm run icons` | アプリのアイコンを作り直す |
| `npx tsx scripts/preview-chars.tsx out.png` | キャラ一覧の画像を作る |
| `npm run map:check` | マップの点検（駅やマスが海に落ちていないか、近すぎないか、駅名の札が重なっていないか） |
| `npx tsx scripts/preview-map.tsx out.png 0.5 grid` | マップ全体の画像を作る（grid で座標の方眼つき） |
| `node scripts/smoke.mjs` など | PCのEdgeをスマホの大きさで動かす画面テスト（開発サーバー起動中に）。`smoke-ferry.mjs` はフェリー、`smoke-reach.mjs` は光るマスの確認 |

## フォルダ構成

```
src/
  engine/      ゲームのルール（React に依存しない）。game.ts が状態遷移の中心、ai.ts がCPU
  data/        マップ・物件・カード・キャラの設定データ
  characters/  キャラクターのSVG（すべてコードで描画）
  ui/          画面（screens）・盤面（board）・操作パネル（hud）
  store/       画面とゲームの状態、自動セーブ
  audio/       効果音とBGM（Web Audioでその場で合成）
scripts/       シミュレーション、アイコン生成、画面テスト
```

島の形は `src/data/japan.ts`（経度・緯度で書いた輪郭）、駅の座標と道、フェリーの航路（`FERRY_DEFS`）は `src/data/map.ts` です。道のあいだのマスは、道の長さに合わせて自動で並びます。変えたら `npm run map:check` で点検してください。
物件は `src/data/properties.ts`、カードは `src/data/cards.ts` です。変えたら `npm run sim` でバランスを確認してください。

## 素材とライセンス

- キャラクター・マップ・効果音・BGMはすべてこのゲームのためにコードで作ったオリジナルです
- フォント：Zen Maru Gothic（SIL Open Font License 1.1）
