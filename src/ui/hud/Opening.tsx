// ゲーム開始のオープニング。参加するキャラが1人ずつ登場して あいさつし、「いざ、しゅっぱつ！」で始まる。
// どこを押しても とばせる。
import { useEffect, useState, type CSSProperties } from 'react';
import { sfx } from '../../audio/sound';
import { CharSvg } from '../../characters/Characters';
import { CHARACTERS, PERSONA, quipFor } from '../../data/characters';
import type { GameState } from '../../engine/types';
import { Confetti } from './Celebrate';

const LEVEL = ['', 'よわい', 'ふつう', 'つよい'];
const FIRST = 1100;
const EACH = 600;

export function Opening({ game, onDone }: { game: GameState; onDone: () => void }) {
  const n = game.players.length;
  const goAt = FIRST + n * EACH + 200;
  const [go, setGo] = useState(false);

  useEffect(() => {
    sfx.drumroll();
    const ts = game.players.map((_, i) => window.setTimeout(() => sfx.pop(), FIRST + i * EACH + 150));
    ts.push(
      window.setTimeout(() => {
        setGo(true);
        sfx.fanfare();
      }, goAt),
    );
    ts.push(window.setTimeout(onDone, goAt + 1700));
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="opening" onClick={onDone}>
      <div className="op-rays" />
      <div className="op-bunting" />
      <div className="op-title">
        <div className="op-sub">ぽんぽこ列島すごろく</div>
        <div className="op-main">{game.years}年勝負 開幕！</div>
      </div>
      <div className="op-cards">
        {game.players.map((p, i) => (
          <div
            key={p.id}
            className={`op-card ${i % 2 ? 'from-right' : 'from-left'}`}
            style={{ ['--pc' as string]: CHARACTERS[p.charId].color, animationDelay: `${(FIRST + i * EACH) / 1000}s` } as CSSProperties}
          >
            <CharSvg id={p.charId} expr="happy" size={70} className="bob" />
            <div className="op-info">
              <div className="op-name">
                {p.name}
                {p.isCpu && (
                  <span className="op-cpu">
                    CPU・{LEVEL[p.cpuLevel]}・{PERSONA[p.charId].label}
                  </span>
                )}
              </div>
              <div className="op-hello">「{quipFor(p.charId, 'hello', p.name) ?? 'よろしくね！'}」</div>
            </div>
          </div>
        ))}
      </div>
      {go && (
        <>
          <Confetti count={40} />
          <div className="op-go">いざ、しゅっぱつ！</div>
        </>
      )}
      <div className="op-skip">タップで とばす</div>
    </div>
  );
}
