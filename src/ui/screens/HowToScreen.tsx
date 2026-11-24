import { CharSvg } from '../../characters/Characters';
import { CARDS, CARD_IDS } from '../../data/cards';
import { useApp } from '../../store/gameStore';
import { SQUARE_STYLE } from '../board/Squares';
import { CharFace } from '../common';

const SQUARE_HELP: Record<string, string> = {
  plus: 'お金がもらえる',
  minus: 'お金をはらう',
  card: 'カードが1枚もらえる',
  shop: 'カードを買える',
  omikuji: 'おみくじを引く。吉以上なら くもすけも はらえる',
};

export function HowToScreen() {
  const setScreen = useApp((s) => s.setScreen);
  return (
    <div className="page howto">
      <header className="page-head">
        <button type="button" className="back" onClick={() => setScreen('title')}>
          ‹ もどる
        </button>
        <h2>あそびかた</h2>
      </header>

      <section className="panel intro">
        <CharSvg id="hoo" expr="happy" size={80} />
        <p>
          ホー博士だよ。サイコロをふって列島をめぐり、
          <b>決められた年数のあとに 総資産（お金＋物件）がいちばん多い人</b>が優勝だ！
        </p>
      </section>

      <section className="panel">
        <h3>🏮 おまつり会場をめざそう</h3>
        <p>
          地図の上の赤い旗が「おまつり会場」。<b>一番に着いた人に賞金</b>が出るよ。通りかかるだけでも到着になるから、サイコロの目が多くても大丈夫。着いたら次の会場が決まるよ。
        </p>
      </section>

      <section className="panel">
        <h3>👆 そうさのコツ</h3>
        <p>
          サイコロをふると、<b>止まれるマスが光る</b>よ。光ったマスを押すと、分かれ道でも止まらずに<b>そこまで一気に進む</b>んだ。矢印で1マスずつ道をえらんでもいいよ。
        </p>
        <p>
          地図の<b>マスや駅を押すと、どんなマスか説明</b>が出るよ。コマを押すと、その人の持ち物が見られる。
        </p>
      </section>

      <section className="panel">
        <h3>🏠 物件を買おう</h3>
        <p>
          駅に止まると、その町の物件を買えるよ。物件は毎年12月の<b>決算</b>で収益を生むんだ。
          ひとつの駅の物件を全部買うと<b>「ひとりじめ」で収益が2倍</b>！ 駅の下の点の色で、だれが持っているかわかるよ。
        </p>
      </section>

      <section className="panel">
        <h3>マスのしゅるい</h3>
        <div className="sq-help">
          {Object.entries(SQUARE_STYLE).map(([k, st]) => (
            <div key={k} className="sq-help-row">
              <span className="sq-dot" style={{ background: st.fill }}>
                {st.label}
              </span>
              <b>{st.name}</b>
              <span>{SQUARE_HELP[k]}</span>
            </div>
          ))}
          <div className="sq-help-row">
            <span className="sq-dot station">駅</span>
            <b>駅</b>
            <span>物件を買える</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>🃏 カード</h3>
        <div className="card-help">
          {CARD_IDS.map((id) => (
            <div key={id} className="card-help-row">
              <span className="card-icon">{CARDS[id].icon}</span>
              <b>{CARDS[id].name}</b>
              <span>{CARDS[id].desc.replace('\n', '')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel intro">
        <CharSvg id="kumo" expr="happy" size={80} />
        <p>
          ぼく、<b>くもすけ</b>！ だれかがおまつり会場に着くと、<b>いちばん遠くにいる人</b>にくっついて いたずらしちゃうよ。
          ほかの人と<b>すれちがうと乗りうつる</b>し、おみくじマスで吉以上を引かれたら にげちゃうんだ…。
        </p>
      </section>

      <section className="panel">
        <h3>📅 季節のイベント</h3>
        <ul className="season">
          <li>1月：お正月のお年玉</li>
          <li>2月：北海道の雪まつり（北海道の物件がもうかる）</li>
          <li>4月：お花見（観光の物件がもうかる）</li>
          <li>8月：夏祭り（おまつり会場の賞金が2倍）</li>
          <li>10月：収穫祭（農業の物件がもうかる）</li>
          <li>12月：決算（物件の収益が入る）</li>
        </ul>
      </section>

      <section className="panel">
        <h3>なかまたち</h3>
        <div className="friends">
          {(['pokota', 'mikeko', 'shibamaru', 'penkichi', 'usami', 'konko'] as const).map((id) => (
            <CharFace key={id} id={id} size={48} expr="happy" />
          ))}
        </div>
      </section>
    </div>
  );
}
