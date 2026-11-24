import { useEffect, useRef } from 'react';
import { sfx } from '../../audio/sound';
import { CHARACTERS } from '../../data/characters';
import { signedRyo } from '../../engine/format';
import { assets } from '../../engine/game';
import type { GameState, Msg } from '../../engine/types';
import { CharSvg } from '../../characters/Characters';
import { CharFace, Money } from '../common';

const TONE_SOUND: Record<Msg['tone'], () => void> = {
  good: sfx.coin,
  bad: sfx.bad,
  arrival: sfx.fanfare,
  kumo: sfx.kumo,
  event: sfx.event,
  info: sfx.card,
};

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
    TONE_SOUND[msg.tone]();
  }, [msg]);
  // 出たばかりのメッセージは、連打で飛ばさないように少し待つ
  const onNext = () => {
    if (Date.now() - shownAt.current > 350) next();
  };

  const speaker = msg.speaker ?? 'hoo';
  const who = msg.player !== undefined ? game.players[msg.player] : null;

  if (msg.settlement) {
    const rows = [...msg.settlement].sort((a, b) => b.income - a.income);
    const ranking = [...game.players].sort((a, b) => assets(game, b.id) - assets(game, a.id));
    const maxAssets = Math.max(...ranking.map((p) => assets(game, p.id)), 1);
    return (
      <div className="dialog-backdrop" onClick={onNext}>
        <div className="dialog dialog-wide tone-event">
          <div className="dialog-title">📜 {msg.title}</div>
          <p className="dialog-text">{msg.text}</p>
          <table className="settle">
            <tbody>
              {rows.map((r) => {
                const p = game.players[r.player];
                return (
                  <tr key={r.player}>
                    <td>
                      <CharFace id={p.charId} size={32} expr={r.income > 0 ? 'happy' : 'normal'} />
                    </td>
                    <td className="settle-name">{p.name}</td>
                    <td className="settle-inc">{signedRyo(r.income)}</td>
                    <td className="settle-tags">
                      {r.monopolies > 0 && <span className="tag">ひとりじめ×{r.monopolies}</span>}
                      {r.maneki && <span className="tag">🐈1.5倍</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="rank-title">いまの総資産ランキング</div>
          <div className="rank-bars">
            {ranking.map((p, i) => {
              const a = assets(game, p.id);
              return (
                <div key={p.id} className="rank-row">
                  <span className="rank-no">{i + 1}位</span>
                  <CharFace id={p.charId} size={26} />
                  <div className="rank-bar">
                    <div style={{ width: `${Math.max(4, (a / maxAssets) * 100)}%`, background: CHARACTERS[p.charId].color }} />
                  </div>
                  <Money value={a} className="rank-money" />
                </div>
              );
            })}
          </div>
          <div className="dialog-next">{auto ? '…' : '▶ タップでつぎへ'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop" onClick={onNext}>
      {msg.tone === 'arrival' && <Confetti />}
      <div className={`dialog tone-${msg.tone}`}>
        <div className="dialog-face">
          <CharSvg id={speaker} expr={msg.expr ?? 'normal'} size={92} className="bob" />
        </div>
        {msg.title && <div className="dialog-title">{msg.title}</div>}
        {who && speaker !== who.charId && (
          <div className="dialog-who">
            <CharFace id={who.charId} size={22} /> {who.name}さん
          </div>
        )}
        <p className="dialog-text">{msg.text}</p>
        {msg.delta !== undefined && msg.delta !== 0 && <div className={`dialog-delta ${msg.delta > 0 ? 'plus' : 'minus'}`}>{signedRyo(msg.delta)}</div>}
        <div className="dialog-next">{auto ? '…' : '▶ タップでつぎへ'}</div>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#ff5a5a', '#ffc93c', '#4fc3f7', '#81c784', '#ba68c8', '#ff8a65'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.08}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
