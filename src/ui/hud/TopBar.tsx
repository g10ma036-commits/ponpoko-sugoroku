import { CHARACTERS } from '../../data/characters';
import { dist } from '../../engine/graph';
import { stationName } from '../../engine/game';
import type { GameState } from '../../engine/types';
import { CharFace, Money } from '../common';

export function TopBar({ game, onPlayer, onDest }: { game: GameState; onPlayer: (id: number) => void; onDest: () => void }) {
  const p = game.players[game.turn];
  const monthsLeft = (game.years - game.year) * 12 + (12 - game.month) + 1;
  const d = dist(p.pos, game.destination);
  return (
    <div className="topbar">
      <div className="topbar-row">
        <div className="date">
          <b>{game.year}</b>年目 <b>{game.month}</b>月<span className="left">のこり{monthsLeft}か月</span>
        </div>
        <button type="button" className="dest" onClick={onDest} aria-label="おまつり会場の説明">
          <span className="dest-icon">🏮</span>
          <span className="dest-name">{stationName(game.destination)}</span>
          <span className="dest-d">あと{d}マス</span>
        </button>
      </div>
      <div className="chips">
        {game.players.map((q) => (
          <button
            type="button"
            key={q.id}
            className={`chip ${q.id === game.turn ? 'cur' : ''}`}
            style={{ ['--pc' as string]: CHARACTERS[q.charId].color }}
            onClick={() => onPlayer(q.id)}
          >
            <CharFace id={q.charId} size={30} expr={game.kumo === q.id ? 'sad' : 'normal'} />
            <span className="chip-text">
              <span className="chip-name">
                {q.name}
                {game.kumo === q.id && <span title="くもすけ">☁️</span>}
                {q.sleep > 0 && <span title="ねむり">💤</span>}
              </span>
              <Money value={q.money} className="chip-money" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
