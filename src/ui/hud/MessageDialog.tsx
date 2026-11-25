import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sound';
import { CHARACTERS, quipFor, type Quips } from '../../data/characters';
import { assets } from '../../engine/game';
import type { CharId, GameState, Msg, SettlementRow } from '../../engine/types';
import { CharSvg } from '../../characters/Characters';
import { formatRyo, signedRyo } from '../../engine/format';
import { CharFace, useCountUp } from '../common';
import { Confetti, Fireworks } from './Celebrate';

const TONE_SOUND: Record<Msg['tone'], () => void> = {
  good: sfx.coin,
  bad: sfx.bad,
  arrival: sfx.festival,
  kumo: sfx.kumo,
  event: sfx.event,
  info: sfx.card,
};

function soundFor(msg: Msg): () => void {
  if (msg.settlement) return sfx.event;
  if (msg.news) return sfx.news;
  if (msg.celebrate) return sfx.monopoly;
  return TONE_SOUND[msg.tone];
}

/** ふきだしに出す口ぐせ（同じ場面なら同じセリフ） */
function quipOf(game: GameState, msg: Msg): { id: CharId; text: string } | null {
  const who = msg.player !== undefined ? game.players[msg.player] : null;
  if (!who) return null;
  const seed = `${msg.title}|${msg.text}|${game.rollId}|${game.month}`;
  let kind: keyof Quips | null = null;
  if (msg.speaker === who.charId) {
    if (msg.tone === 'arrival') kind = 'arrive';
    else if (msg.celebrate) kind = 'buy';
    else if (msg.tone === 'bad') kind = 'sad';
    // うれしい場面は、毎回だと くどいので 半分くらい
    else if (msg.tone === 'good' && msg.expr === 'happy' && seed.length % 2 === 0) kind = 'happy';
  } else if (msg.tone === 'kumo' && msg.speaker === 'kumo' && msg.expr === 'happy') {
    kind = 'kumo';
  }
  if (!kind) return null;
  const text = quipFor(who.charId, kind, seed);
  return text ? { id: who.charId, text } : null;
}

interface Props {
  game: GameState;
  msg: Msg;
  /** CPUの番などで、自動で次へ進むとき */
  auto: boolean;
  onNext: () => void;
}

export function MessageDialog({ game, msg, auto, onNext: next }: Props) {
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
    soundFor(msg)();
  }, [msg]);
  // 出たばかりのメッセージは、連打で飛ばさないように少し待つ
  const onNext = () => {
    if (Date.now() - shownAt.current > 350) next();
  };

  if (msg.settlement) return <Settlement game={game} msg={msg} rows={msg.settlement} auto={auto} onNext={onNext} />;

  const speaker = msg.speaker ?? 'hoo';
  const who = msg.player !== undefined ? game.players[msg.player] : null;
  const quip = quipOf(game, msg);
  const ownerColor = who ? CHARACTERS[who.charId].color : '#ffc93c';

  return (
    <div className="dialog-backdrop" onClick={onNext}>
      {msg.tone === 'arrival' && (
        <>
          <Fireworks />
          <Confetti />
        </>
      )}
      {msg.celebrate && <Confetti colors={[ownerColor, '#ffc93c', '#fff6c8', ownerColor]} count={30} />}
      <div className={`dialog tone-${msg.tone} ${msg.news ? 'news' : ''} ${msg.tone === 'arrival' ? 'arrival-pop' : ''}`}>
        {msg.news && <div className="news-mast">📰 ぽんぽこ新聞</div>}
        <div className="dialog-face">
          <CharSvg id={speaker} expr={msg.expr ?? 'normal'} size={msg.news ? 64 : 92} className="bob" />
        </div>
        {quip && (
          <div className="quip">
            {quip.id !== speaker && <CharFace id={quip.id} size={22} />}「{quip.text}」
          </div>
        )}
        {msg.tone === 'arrival' && <div className="arrival-stamp">祝</div>}
        {msg.title && <div className="dialog-title">{msg.title}</div>}
        {who && speaker !== who.charId && (
          <div className="dialog-who">
            <CharFace id={who.charId} size={22} /> {who.name}さん
          </div>
        )}
        <p className={`dialog-text ${msg.news ? 'news-text' : ''}`}>{msg.text}</p>
        {msg.delta !== undefined && msg.delta !== 0 && <Delta value={msg.delta} />}
        <div className="dialog-next">{auto ? '…' : '▶ タップでつぎへ'}</div>
      </div>
    </div>
  );
}

/** お金の増減を 0 から数えあげる */
function Delta({ value }: { value: number }) {
  const shown = useCountUp(value, 650, 0);
  return <div className={`dialog-delta ${value > 0 ? 'plus' : 'minus'}`}>{signedRyo(shown)}</div>;
}

// ---------------------------------------------------------------- 決算
const ROW_MS = 480;
const RANK_H = 34;

/**
 * 決算：収益の多い順に1人ずつ「チャリン」と入り、最後に総資産の順位が入れかわる。
 * 演出中にタップすると最後まで飛ばし、もう一度タップで次へ。
 */
function Settlement({ game, msg, rows, auto, onNext }: { game: GameState; msg: Msg; rows: SettlementRow[]; auto: boolean; onNext: () => void }) {
  const sorted = [...rows].sort((a, b) => b.income - a.income);
  const n = sorted.length;
  const done = n + 1; // n 人ぶん出たあと、順位の入れかえ
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= done) return;
    const t = window.setTimeout(() => setStep((v) => v + 1), step === 0 ? 350 : step < n ? ROW_MS : ROW_MS + 200);
    return () => window.clearTimeout(t);
  }, [step, n, done]);
  useEffect(() => {
    if (step >= 1 && step <= n && sorted[step - 1].income > 0) sfx.chaching();
    if (step === done) sfx.coin();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // 古いセーブには before/after が無いので、いまの総資産で代わりにする
  const after = (r: SettlementRow) => r.after ?? assets(game, r.player);
  const before = (r: SettlementRow) => r.before ?? after(r) - r.income;
  const swapped = step >= done;
  const value = (r: SettlementRow) => (swapped ? after(r) : before(r));
  const order = [...rows].sort((a, b) => value(b) - value(a));
  const maxV = Math.max(...rows.map(after), 1);

  return (
    <div className="dialog-backdrop" onClick={() => (step < done ? setStep(done) : onNext())}>
      <div className="dialog dialog-wide tone-event">
        <div className="dialog-title">📜 {msg.title}</div>
        <p className="dialog-text">{msg.text}</p>
        <table className="settle">
          <tbody>
            {sorted.map((r, i) => {
              const p = game.players[r.player];
              const shown = i < step;
              return (
                <tr key={r.player} className={shown ? 'in' : 'wait'}>
                  <td>
                    <CharFace id={p.charId} size={32} expr={shown && r.income > 0 ? 'happy' : 'normal'} />
                  </td>
                  <td className="settle-name">{p.name}</td>
                  <td className="settle-inc">{shown ? <IncomeCount value={r.income} /> : '…'}</td>
                  <td className="settle-tags">
                    {shown && r.monopolies > 0 && <span className="tag">ひとりじめ×{r.monopolies}</span>}
                    {shown && r.maneki && <span className="tag">🐈1.5倍</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="rank-title">{swapped ? 'いまの総資産ランキング' : '決算の前の総資産'}</div>
        <div className="rank-bars" style={{ height: n * RANK_H }}>
          {rows.map((r) => {
            const p = game.players[r.player];
            const rank = order.indexOf(r);
            const moved = swapped && rank !== [...rows].sort((a, b) => before(b) - before(a)).indexOf(r);
            return (
              <div key={r.player} className={`rank-row ${moved ? 'moved' : ''}`} style={{ transform: `translateY(${rank * RANK_H}px)` }}>
                <span className="rank-no">{rank + 1}位</span>
                <CharFace id={p.charId} size={26} />
                <div className="rank-bar">
                  <div style={{ width: `${Math.max(4, (value(r) / maxV) * 100)}%`, background: CHARACTERS[p.charId].color }} />
                </div>
                <RankMoney value={value(r)} />
              </div>
            );
          })}
        </div>
        <div className="dialog-next">{step < done ? 'タップで とばす' : auto ? '…' : '▶ タップでつぎへ'}</div>
      </div>
    </div>
  );
}

function IncomeCount({ value }: { value: number }) {
  const shown = useCountUp(value, 420, 0);
  return <>{signedRyo(shown)}</>;
}

function RankMoney({ value }: { value: number }) {
  const shown = useCountUp(value, 600);
  return <span className={`money rank-money ${shown < 0 ? 'neg' : ''}`}>{formatRyo(shown)}</span>;
}
