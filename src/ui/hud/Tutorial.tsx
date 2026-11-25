// はじめての人向けの案内。人間の番に、そのとき役に立つ説明を ホー博士が ふきだしで1つずつ出す。
// 一度「わかった」を押した案内は もう出ない（せってい画面で もう一度見られる）。
import { CharSvg } from '../../characters/Characters';
import type { GameState } from '../../engine/types';

export const TIPS: Record<string, string> = {
  roll: 'まずは「🎲 サイコロをふる」を押してみよう！ 上の 🏮 が おまつり会場。一番に着くと 賞金が もらえるよ。',
  fork: '分かれ道だ！ 矢印で 道をえらぶか、光っているマスを押すと そこまで 一気に行けるよ。矢印の 🏮の数字は おまつり会場までの マス数だよ。',
  reach: '光っているマスが 止まれるマスだよ。押すと 説明が出て、「ここへ行く！」で そこまで 一気に進めるんだ。',
  buy: '駅に止まると 物件が買えるよ。物件は 12月の決算で お金を生むんだ。同じ駅の物件を ぜんぶ買うと「ひとりじめ」で 収益2倍！',
  shop: 'カード屋さんだ。お金に よゆうがあれば、役に立つカードを 買っておこう。',
  kumo: 'くもすけに くっつかれた！ おみくじマスで 吉以上を引くか、「てるてる坊主」で 追いはらえるよ。だれかと すれちがうと うつることも。',
  cards: '「🃏 カード」から カードが使えるよ。サイコロの前に使うんだ。かけあし靴なら サイコロが 2こになる！',
  news: '📰 景気ニュースは 右上の 📰 ボタンで いつでも 見なおせるよ。好景気の地方の物件は ねらい目だ！',
  map: 'マスや駅を押すと 説明が見られるよ。右上の 🗺️ で 全体マップ。上の みんなの顔を押すと 持ち物も わかるよ。',
};

/** いま出す案内（なければ null） */
export function currentTip(game: GameState, humanTurn: boolean, ends: number, seen: string[]): string | null {
  if (!humanTurn) return null;
  const p = game.players[game.turn];
  const ph = game.phase;
  const ok = (id: string) => !seen.includes(id);
  const later = game.year > 1 || game.month >= 2;
  if (ph.t === 'action' && game.kumo === p.id && ok('kumo')) return 'kumo';
  if (ph.t === 'moving' && !ph.goal && ph.options && ok('fork')) return 'fork';
  if (ph.t === 'moving' && !ph.goal && !ph.options && ends > 1 && ok('reach')) return 'reach';
  if (ph.t === 'buy' && ok('buy')) return 'buy';
  if (ph.t === 'shop' && ok('shop')) return 'shop';
  if (ph.t === 'action') {
    if (ok('roll')) return 'roll';
    if (later && p.cards.length > 0 && ok('cards')) return 'cards';
    if (later && ok('news')) return 'news';
    if ((game.year > 1 || game.month >= 3) && ok('map')) return 'map';
  }
  return null;
}

export function TutorialBubble({ tip, onOk, onStop }: { tip: string; onOk: () => void; onStop: () => void }) {
  return (
    <div className="tutorial" key={tip}>
      <CharSvg id="hoo" expr="happy" size={54} className="bob" />
      <div className="tutorial-body">
        <div className="tutorial-text">{TIPS[tip]}</div>
        <div className="tutorial-btns">
          <button type="button" className="tutorial-stop" onClick={onStop}>
            案内をもう出さない
          </button>
          <button type="button" className="tutorial-ok" onClick={onOk}>
            わかった！
          </button>
        </div>
      </div>
    </div>
  );
}
