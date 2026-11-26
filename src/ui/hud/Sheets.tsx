import { useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sound';
import { CARDS, HAND_MAX } from '../../data/cards';
import { CHARACTERS, PERSONA } from '../../data/characters';
import { FERRY, NODE, REGIONS } from '../../data/map';
import { CATEGORY_LABEL, PROPS_BY_STATION } from '../../data/properties';
import { formatRyo } from '../../engine/format';
import {
  BOOM_MULT,
  FORTUNES,
  HOT_MULT,
  SLUMP_MULT,
  newsMult,
  propIncome,
  MINUS_RANGE,
  PLUS_RANGE,
  SELL_RATE,
  arrivalBonus,
  assets,
  cardBlocked,
  pittariMax,
  ferryPlace,
  isMonopoly,
  ownedProps,
  round100,
  stationName,
  yearFactor,
  yearlyIncome,
} from '../../engine/game';
import { dist } from '../../engine/graph';
import type { Action, CardId, GameState, Property } from '../../engine/types';
import { SQUARE_STYLE } from '../board/Squares';
import { Btn, CharFace, Money, Sheet } from '../common';

type Dispatch = (a: Action) => boolean;

/** 景気ニュースの印（📈 好景気・📉 不景気・🔥 ニュース速報） */
function NewsBadge({ game, pr }: { game: GameState; pr: Property }) {
  const e = game.economy;
  if (!e) return null;
  const marks: string[] = [];
  if (NODE[pr.station].region === e.boom) marks.push('📈');
  if (pr.cat === e.slump) marks.push('📉');
  if (e.hot === pr.station) marks.push('🔥');
  if (marks.length === 0) return null;
  const m = newsMult(game, pr);
  return (
    <span className={`news-badge ${m >= 1 ? 'up' : 'down'}`}>
      {marks.join('')}×{Math.round(m * 100) / 100}
    </span>
  );
}

function PropRow({ pr, right, game }: { pr: Property; right: ReactNode; game: GameState }) {
  const cat = CATEGORY_LABEL[pr.cat];
  return (
    <div className="prop-row">
      <div className="prop-main">
        <div className="prop-name">
          <span className="cat" style={{ background: cat.color }}>
            {cat.label}
          </span>
          {pr.name}
        </div>
        <div className="prop-sub">
          <span>
            値段 <b>{formatRyo(pr.price)}</b>
          </span>
          <span>
            年収益 <b className="inc">{formatRyo(propIncome(game, pr))}</b>
            <NewsBadge game={game} pr={pr} />
          </span>
        </div>
      </div>
      <div className="prop-right">{right}</div>
    </div>
  );
}

/** この駅に関係する今年の景気ニュース */
function StationNews({ game, station }: { game: GameState; station: string }) {
  const e = game.economy;
  if (!e) return null;
  const lines: string[] = [];
  const region = NODE[station].region;
  if (region === e.boom) lines.push(`📈 今年は${REGIONS[region].name}が 好景気！ 収益${BOOM_MULT}倍`);
  if (e.hot === station) lines.push(`🔥 ニュース速報の駅！ 収益${HOT_MULT}倍`);
  if (PROPS_BY_STATION[station].some((p) => p.cat === e.slump)) lines.push(`📉 ${CATEGORY_LABEL[e.slump].label}の物件は 不景気（${SLUMP_MULT}倍）`);
  if (lines.length === 0) return null;
  return (
    <div className="hint news-hint">
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- 景気ニュース
export function NewsSheet({ game, onClose }: { game: GameState; onClose: () => void }) {
  const e = game.economy;
  return (
    <Sheet title="📰 今年の景気ニュース" onClose={onClose}>
      {!e && <div className="empty">今年の景気ニュースは まだ出ていません。1月に 発表されるよ。</div>}
      {e && (
        <>
          <div className="news-card up">
            <div className="news-card-head">📈 好景気</div>
            <div className="news-card-main">
              <span className="region-dot" style={{ background: REGIONS[e.boom].color }} />
              {REGIONS[e.boom].name}の物件
            </div>
            <div className="news-card-sub">決算の収益が {BOOM_MULT}倍</div>
          </div>
          <div className="news-card down">
            <div className="news-card-head">📉 不景気</div>
            <div className="news-card-main">
              <span className="cat" style={{ background: CATEGORY_LABEL[e.slump].color }}>
                {CATEGORY_LABEL[e.slump].label}
              </span>
              の物件
            </div>
            <div className="news-card-sub">決算の収益が {SLUMP_MULT}倍</div>
          </div>
          <div className={`news-card ${e.hot ? 'hot' : 'wait'}`}>
            <div className="news-card-head">🔥 ニュース速報</div>
            {e.hot ? (
              <>
                <div className="news-card-main">{stationName(e.hot)}の物件</div>
                <div className="news-card-sub">決算の収益が {HOT_MULT}倍（{REGIONS[NODE[e.hot].region].name}）</div>
              </>
            ) : (
              <div className="news-card-sub">6月に 発表されるよ。</div>
            )}
          </div>
          <p className="note">
            景気は 12月の決算の収益に 効きます。ほかの年は 毎年1月に 新しい景気が発表されるよ。物件の 年収益の横の 📈📉🔥 が 景気の印です。
          </p>
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- 物件を買う
export function BuySheet({ game, station, dispatch }: { game: GameState; station: string; dispatch: Dispatch }) {
  const p = game.players[game.turn];
  const props = PROPS_BY_STATION[station];
  const free = props.filter((pr) => game.owner[pr.id] === undefined);
  const others = props.some((pr) => game.owner[pr.id] !== undefined && game.owner[pr.id] !== p.id);
  const mono = isMonopoly(game, station, p.id);
  return (
    <Sheet
      title={<>🏠 {stationName(station)}の物件</>}
      footer={
        <>
          <div className="foot-money">
            所持金 <Money value={p.money} />
          </div>
          <Btn variant="primary" onClick={() => dispatch({ t: 'DONE' })}>
            {free.length === props.length ? '買わずに すすむ' : 'おわる'}
          </Btn>
        </>
      }
    >
      <div className={`hint ${mono ? 'good' : ''}`}>
        {mono ? '🎉 ひとりじめ中！ 決算の収益が2倍' : others ? 'ほかの人も持っている駅です' : '全部買うと「ひとりじめ」で収益2倍！'}
      </div>
      <StationNews game={game} station={station} />
      {props.map((pr) => {
        const o = game.owner[pr.id];
        const right =
          o !== undefined ? (
            <span className="owner" style={{ borderColor: CHARACTERS[game.players[o].charId].color }}>
              <CharFace id={game.players[o].charId} size={26} />
              {o === p.id ? 'あなた' : game.players[o].name}
            </span>
          ) : (
            <Btn
              variant="primary"
              disabled={p.money < pr.price}
              onClick={() => {
                if (dispatch({ t: 'BUY', prop: pr.id })) sfx.buy();
              }}
            >
              買う
            </Btn>
          );
        return <PropRow key={pr.id} pr={pr} right={right} game={game} />;
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------- みせ
export function ShopSheet({ game, items, dispatch }: { game: GameState; items: CardId[]; dispatch: Dispatch }) {
  const p = game.players[game.turn];
  const full = p.cards.length >= HAND_MAX;
  return (
    <Sheet
      title="🏪 カード屋さん"
      footer={
        <>
          <div className="foot-money">
            所持金 <Money value={p.money} /> ・ 手札 {p.cards.length}/{HAND_MAX}
          </div>
          <Btn variant="primary" onClick={() => dispatch({ t: 'DONE' })}>
            おわる
          </Btn>
        </>
      }
    >
      <div className="hint">いらっしゃい！ ほしいカードはあるかな？</div>
      {items.map((id) => {
        const c = CARDS[id];
        return (
          <div className="card-row" key={id}>
            <span className="card-icon">{c.icon}</span>
            <div className="card-main">
              <div className="card-name">{c.name}</div>
              <div className="card-desc">{c.desc}</div>
            </div>
            <Btn
              variant="primary"
              disabled={full || p.money < c.price}
              onClick={() => {
                if (dispatch({ t: 'BUY_CARD', card: id })) sfx.buy();
              }}
            >
              {formatRyo(c.price)}
            </Btn>
          </div>
        );
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------- 物件を売る
export function SellSheet({ game, dispatch }: { game: GameState; dispatch: Dispatch }) {
  const p = game.players[game.turn];
  const props = ownedProps(game, p.id).sort((a, b) => a.price - b.price);
  return (
    <Sheet
      title="😣 物件を売ってお金をつくる"
      footer={
        <div className="foot-money">
          所持金 <Money value={p.money} />（0両以上になるまで売ってね）
        </div>
      }
    >
      {props.map((pr) => (
        <PropRow
          key={pr.id}
          pr={pr}
          game={game}
          right={
            <Btn variant="danger" onClick={() => dispatch({ t: 'SELL', prop: pr.id })}>
              {formatRyo(round100(pr.price * SELL_RATE))}で売る
            </Btn>
          }
        />
      ))}
    </Sheet>
  );
}

// ---------------------------------------------------------------- 手札
export function CardSheet({ game, dispatch, onClose }: { game: GameState; dispatch: Dispatch; onClose: () => void }) {
  const p = game.players[game.turn];
  const [pending, setPending] = useState<{ index: number; kind: 'num' | 'target' } | null>(null);
  const use = (index: number, extra: { num?: number; target?: number } = {}) => {
    if (dispatch({ t: 'USE_CARD', index, ...extra })) {
      sfx.card();
      onClose();
    }
  };

  if (pending?.kind === 'num') {
    return (
      <Sheet title="🎯 何マス進む？" onClose={() => setPending(null)}>
        {p.sleep > 0 && <div className="sleep-note">💤 ねむっているので、1〜3マスまで</div>}
        <div className="num-grid">
          {Array.from({ length: pittariMax(p) }, (_, k) => k + 1).map((n) => (
            <Btn key={n} variant="primary" big onClick={() => use(pending.index, { num: n })}>
              {n}
            </Btn>
          ))}
        </div>
      </Sheet>
    );
  }
  if (pending?.kind === 'target') {
    return (
      <Sheet title="🔄 だれと手札を入れかえる？" onClose={() => setPending(null)}>
        {game.players
          .filter((q) => q.id !== p.id)
          .map((q) => (
            <button type="button" key={q.id} className="target-row" onClick={() => use(pending.index, { target: q.id })}>
              <CharFace id={q.charId} size={36} />
              <span>{q.name}</span>
              <span className="target-cards">手札 {q.cards.length}枚</span>
            </button>
          ))}
      </Sheet>
    );
  }

  return (
    <Sheet title={`🃏 ${p.name}の手札（${p.cards.length}/${HAND_MAX}）`} onClose={onClose}>
      {p.sleep > 0 && (
        <div className="sleep-note">
          💤 ねむり中（あと{p.sleep}回）：1〜3マスしか進めない。靴のカードも使えないよ。
        </div>
      )}
      {p.cards.length === 0 && <div className="empty">カードを持っていません。ふだマスやカード屋さんで手に入るよ。</div>}
      {p.cards.map((id, i) => {
        const c = CARDS[id];
        const blocked = cardBlocked(game, p, id);
        const disabled = blocked !== null;
        const note = blocked ?? (id === 'pittari' && p.sleep > 0 ? 'ねむり中は 1〜3マスまで' : null);
        return (
          <div className="card-row" key={`${id}-${i}`}>
            <span className="card-icon">{c.icon}</span>
            <div className="card-main">
              <div className="card-name">{c.name}</div>
              <div className="card-desc">{note ?? c.desc}</div>
            </div>
            <Btn
              variant="primary"
              disabled={disabled}
              onClick={() => {
                if (c.needsNum) setPending({ index: i, kind: 'num' });
                else if (c.needsTarget) setPending({ index: i, kind: 'target' });
                else use(i);
              }}
            >
              使う
            </Btn>
          </div>
        );
      })}
    </Sheet>
  );
}

// ---------------------------------------------------------------- マスの説明（盤面のマスを押したとき）
/**
 * マスの説明。onGo があるときは「光るマス」を押したときで、そこへ行くか えらべる。
 */
export function SquareSheet({ game, node, onClose, onGo }: { game: GameState; node: string; onClose: () => void; onGo?: () => void }) {
  const n = NODE[node];
  const p = game.players[game.turn];
  const d = dist(p.pos, node);
  const yf = yearFactor(game.year);
  const range = (r: readonly [number, number]) => `${formatRyo(round100(r[0] * 100 * yf))}〜${formatRyo(round100(r[1] * 100 * yf))}`;
  const here = game.players.filter((q) => q.pos === node);
  const st = n.kind === 'station' ? null : SQUARE_STYLE[n.kind];

  let body: ReactNode;
  if (n.kind === 'station') {
    const props = PROPS_BY_STATION[node];
    const owners = props.map((pr) => game.owner[pr.id]);
    const monoOwner = owners.every((o) => o !== undefined && o === owners[0]) ? owners[0] : undefined;
    const free = owners.filter((o) => o === undefined).length;
    body = (
      <>
        {node === game.destination && (
          <div className="hint good">
            🏮 いまの おまつり会場！ 一番に着くと 賞金 <b>{formatRyo(arrivalBonus(game))}</b>
          </div>
        )}
        <p className="sq-desc">止まると、この町の物件を買えるよ。物件は毎年12月の決算で 収益を生むんだ。</p>
        <StationNews game={game} station={node} />
        <div className={`hint ${monoOwner !== undefined ? 'good' : ''}`}>
          {monoOwner !== undefined
            ? `🎉 ${game.players[monoOwner].name}さんの ひとりじめ（決算の収益が2倍）`
            : `売り物 ${free}件 ・ 全部買うと「ひとりじめ」で収益2倍！`}
        </div>
        {props.map((pr) => {
          const o = game.owner[pr.id];
          const right =
            o !== undefined ? (
              <span className="owner" style={{ borderColor: CHARACTERS[game.players[o].charId].color }}>
                <CharFace id={game.players[o].charId} size={26} />
                {game.players[o].name}
              </span>
            ) : (
              <span className="tag">売り物</span>
            );
          return <PropRow key={pr.id} pr={pr} right={right} game={game} />;
        })}
      </>
    );
  } else if (n.kind === 'plus') {
    body = (
      <>
        <p className="sq-desc">止まると お金がもらえるよ。</p>
        <div className="hint good">いまは {range(PLUS_RANGE)}（年がたつほど 多くなる）</div>
      </>
    );
  } else if (n.kind === 'minus') {
    body = (
      <>
        <p className="sq-desc">止まると お金をはらうことに…。</p>
        <div className="hint">いまは {range(MINUS_RANGE)}（年がたつほど 多くなる）</div>
        <p className="sq-note">
          {CARDS.omamori.icon} 「{CARDS.omamori.name}」を持っていれば 1回ふせげるよ。お金がマイナスになったら、物件を売ってうめるんだ。
        </p>
      </>
    );
  } else if (n.kind === 'card') {
    body = (
      <p className="sq-desc">
        止まると カードが1枚もらえるよ。手札は{HAND_MAX}枚まで持てる。カードは、サイコロをふる前に「🃏 カード」から使えるよ。
      </p>
    );
  } else if (n.kind === 'shop') {
    body = <p className="sq-desc">止まると カード屋さんで カードを買えるよ。毎回5種類が ならぶんだ。</p>;
  } else if (n.kind === 'ferry') {
    const to = FERRY[node];
    const dest = game.destination;
    const [dHere, dThere] = [dist(node, dest), dist(to, dest)];
    body = (
      <>
        <p className="sq-desc">
          ぴったり止まると、フェリーで <b>{ferryPlace(to)}</b>の乗り場まで 一気に行けるよ。乗るかどうかは えらべる。通りすぎるだけでは 乗れないよ。
        </p>
        <div className={`hint ${dThere < dHere ? 'good' : ''}`}>
          🏮 おまつり会場まで：ここから {dHere}マス ／ フェリーの行き先から {dThere}マス
        </div>
      </>
    );
  } else {
    const total = FORTUNES.reduce((a, f) => a + f.w, 0);
    body = (
      <>
        <p className="sq-desc">止まると おみくじを引くよ。</p>
        <div className="fortunes">
          {FORTUNES.map((f) => (
            <div key={f.name} className="fortune-row">
              <b>{f.name}</b>
              <span>{f.help}</span>
              <span className="pct">{Math.round((f.w / total) * 100)}%</span>
            </div>
          ))}
        </div>
        <p className="sq-note">☁️ 吉・中吉・大吉が出ると、くもすけを おはらいできるよ。</p>
      </>
    );
  }

  return (
    <Sheet
      title={
        <span className="ps-title">
          {st ? (
            <span className="sq-dot" style={{ background: st.fill }}>
              {st.label}
            </span>
          ) : (
            <span className="sq-dot station">駅</span>
          )}
          {n.kind === 'station' ? n.name : st!.name}
          {n.kind === 'station' && <span className="tag">{REGIONS[n.region].name}</span>}
        </span>
      }
      onClose={onClose}
      footer={
        onGo && (
          <>
            <Btn onClick={onClose}>やめる</Btn>
            <Btn variant="primary" onClick={onGo}>
              🚩 ここへ行く！
            </Btn>
          </>
        )
      }
    >
      {onGo && <div className="hint good go-hint">✨ このマスに 止まれるよ。ここまで 一気に進む？</div>}
      {body}
      <div className="sq-where">
        {d === 0 ? `${p.name}さんが いまいるマス` : `${p.name}さんの いる場所から ${d}マス`}
        {here.length > 0 && (
          <span className="sq-here">
            ここにいる人：
            {here.map((q) => (
              <CharFace key={q.id} id={q.charId} size={24} />
            ))}
          </span>
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- フェリーに乗るか
export function FerrySheet({ game, to, dispatch }: { game: GameState; to: string; dispatch: Dispatch }) {
  const p = game.players[game.turn];
  const here = dist(p.pos, game.destination);
  const there = dist(to, game.destination);
  const st = SQUARE_STYLE.ferry;
  return (
    <Sheet
      title={
        <span className="ps-title">
          <span className="sq-dot" style={{ background: st.fill }}>
            {st.label}
          </span>
          フェリー乗り場
        </span>
      }
      footer={
        <>
          <Btn onClick={() => dispatch({ t: 'DONE' })}>乗らない</Btn>
          <Btn variant="primary" onClick={() => dispatch({ t: 'RIDE' })}>
            ⛴ 乗る！
          </Btn>
        </>
      }
    >
      <p className="sq-desc">
        フェリーに乗ると <b>{ferryPlace(to)}</b>の乗り場まで 一気に行けるよ。地図の 青い点線が 航路だよ。
      </p>
      <div className={`hint ${there < here ? 'good' : ''}`}>
        🏮 {stationName(game.destination)}まで：いま あと{here}マス → 乗ると あと{there}マス
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- プレイヤーの情報
export function PlayerSheet({ game, player, onClose }: { game: GameState; player: number; onClose: () => void }) {
  const q = game.players[player];
  const props = ownedProps(game, player);
  const stations = [...new Set(props.map((p) => p.station))];
  const { income: inc, monopolies } = yearlyIncome(game, player);
  return (
    <Sheet
      title={
        <span className="ps-title">
          <CharFace id={q.charId} size={34} /> {q.name}
          {q.isCpu && <span className="tag">CPU</span>}
        </span>
      }
      onClose={onClose}
    >
      {q.isCpu && (
        <div className="hint persona-hint">
          <b>性格：{PERSONA[q.charId].label}</b> … {PERSONA[q.charId].desc}
        </div>
      )}
      <div className="stats">
        <div>
          所持金<b>{formatRyo(q.money)}</b>
        </div>
        <div>
          総資産<b>{formatRyo(assets(game, player))}</b>
        </div>
        <div>
          決算の見込み<b>{formatRyo(inc)}</b>
        </div>
        <div>
          一番のり<b>{q.arrivals}回</b>
        </div>
      </div>
      <div className="ps-cards">
        手札：{q.cards.length === 0 ? 'なし' : q.cards.map((c, i) => <span key={i} title={CARDS[c].name}>{CARDS[c].icon}</span>)}
      </div>
      <div className="ps-sub">
        物件 {props.length}件{monopolies > 0 && `（ひとりじめ ${monopolies}駅）`}
      </div>
      {stations.length === 0 && <div className="empty">まだ物件を持っていません。</div>}
      {stations.map((st) => (
        <div key={st} className="ps-station">
          <div className="ps-st-name">
            {stationName(st)} {isMonopoly(game, st, player) && <span className="tag good">ひとりじめ</span>}
          </div>
          {props
            .filter((p) => p.station === st)
            .map((p) => (
              <div key={p.id} className="ps-prop">
                <span>{p.name}</span>
                <span>{formatRyo(p.price)}</span>
              </div>
            ))}
        </div>
      ))}
    </Sheet>
  );
}
