// 手番のカットイン。番が来るたびに、キャラの色の帯がシュッと横切り、キャラが大きく出る。
// 押しても下のボタンにとどく（すぐサイコロをふれる）。
import { useEffect, type CSSProperties } from 'react';
import { sfx } from '../../audio/sound';
import { CharSvg } from '../../characters/Characters';
import { CHARACTERS } from '../../data/characters';
import type { Player } from '../../engine/types';

/** カットインの長さ（ふつうの速さのとき） */
export const CUTIN_MS = 1000;

export function CutIn({ player, sub, ms }: { player: Player; sub: string; ms: number }) {
  useEffect(() => {
    sfx.whoosh();
  }, []);
  const c = CHARACTERS[player.charId];
  return (
    <div className="cutin" style={{ ['--pc' as string]: c.color, ['--dur' as string]: `${ms}ms` } as CSSProperties} aria-hidden="true">
      <div className="cutin-band">
        <div className="cutin-lines" />
        <div className="cutin-char">
          <CharSvg id={player.charId} expr="happy" size={150} />
        </div>
        <div className="cutin-text">
          <div className="cutin-name">{player.name}の番！</div>
          <div className="cutin-sub">{sub}</div>
        </div>
      </div>
    </div>
  );
}
