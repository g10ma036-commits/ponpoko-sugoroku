import { useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sound';
import { CARDS, HAND_MAX } from '../../data/cards';
import { CHARACTERS } from '../../data/characters';
import { CATEGORY_LABEL, PROPS_BY_STATION } from '../../data/properties';
import { formatRyo } from '../../engine/format';
import { SELL_RATE, assets, income, isMonopoly, ownedProps, round100, stationName, yearlyIncome } from '../../engine/game';
import type { Action, CardId, GameState, Property } from '../../engine/types';
import { Btn, CharFace, Money, Sheet } from '../common';

type Dispatch = (a: Action) => boolean;

function PropRow({ pr, right }: { pr: Property; right: ReactNode }) {
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
            年収益 <b className="inc">{formatRyo(income(pr))}</b>
          </span>
        </div>
      </div>
      <div className="prop-right">{right}</div>
    </div>
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
        return <PropRow key={pr.id} pr={pr} right={right} />;
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
        <div className="num-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
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
      {p.cards.length === 0 && <div className="empty">カードを持っていません。ふだマスやカード屋さんで手に入るよ。</div>}
      {p.cards.map((id, i) => {
        const c = CARDS[id];
        const disabled = c.passive || (id === 'teruteru' && game.kumo !== p.id);
        const note = c.passive ? '持っているだけで効く' : id === 'teruteru' && game.kumo !== p.id ? 'くもすけがいないと使えない' : null;
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
