import { useEffect } from 'react';
import { sfx } from '../../audio/sound';
import { CharSvg } from '../../characters/Characters';
import { CHARACTERS } from '../../data/characters';
import { formatRyo } from '../../engine/format';
import { assets, ownedProps } from '../../engine/game';
import type { GameState } from '../../engine/types';
import { useApp } from '../../store/gameStore';
import { Btn, CharFace } from '../common';

interface Award {
  title: string;
  icon: string;
  player: number;
  value: string;
}

function awards(game: GameState): Award[] {
  const best = (score: (id: number) => number) => {
    let id = 0;
    for (const p of game.players) if (score(p.id) > score(id)) id = p.id;
    return score(id) > 0 ? id : null;
  };
  const list: Award[] = [];
  const propValue = (id: number) => ownedProps(game, id).reduce((a, p) => a + p.price, 0);
  const a = best(propValue);
  if (a !== null) list.push({ title: '物件王', icon: '🏯', player: a, value: formatRyo(propValue(a)) });
  const b = best((id) => game.players[id].arrivals);
  if (b !== null) list.push({ title: 'おまつり名人', icon: '🏮', player: b, value: `一番のり ${game.players[b].arrivals}回` });
  const c = best((id) => game.players[id].money);
  if (c !== null) list.push({ title: 'お金もち', icon: '💰', player: c, value: formatRyo(game.players[c].money) });
  const d = best((id) => game.players[id].kumoDamage);
  if (d !== null) list.push({ title: 'くもすけの友だち', icon: '☁️', player: d, value: `いたずら ${formatRyo(game.players[d].kumoDamage)}` });
  return list;
}

export function ResultScreen({ game }: { game: GameState }) {
  const startGame = useApp((s) => s.startGame);
  const quitToTitle = useApp((s) => s.quitToTitle);
  const ranking = [...game.players].sort((a, b) => assets(game, b.id) - assets(game, a.id));
  const winner = ranking[0];

  useEffect(() => {
    sfx.fanfare();
  }, []);

  return (
    <div className="result">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 29) % 100}%`, background: ['#ff5a5a', '#ffc93c', '#4fc3f7', '#81c784', '#ba68c8'][i % 5], animationDelay: `${(i % 10) * 0.15}s` }} />
        ))}
      </div>
      <h1 className="result-title">🎉 結果発表 🎉</h1>
      <div className="winner" style={{ ['--pc' as string]: CHARACTERS[winner.charId].color }}>
        <CharSvg id={winner.charId} expr="happy" size={150} className="bob" />
        <div className="winner-name">{winner.name}さんの優勝！</div>
        <div className="winner-money">総資産 {formatRyo(assets(game, winner.id))}</div>
      </div>
      <ol className="result-list">
        {ranking.map((p, i) => (
          <li key={p.id} style={{ ['--pc' as string]: CHARACTERS[p.charId].color }}>
            <span className="rl-rank">{i + 1}位</span>
            <CharFace id={p.charId} size={40} expr={i === 0 ? 'happy' : i === ranking.length - 1 && ranking.length > 1 ? 'sad' : 'normal'} />
            <span className="rl-name">{p.name}</span>
            <span className="rl-money">{formatRyo(assets(game, p.id))}</span>
          </li>
        ))}
      </ol>
      <div className="awards">
        {awards(game).map((a) => (
          <div key={a.title} className="award">
            <span className="award-icon">{a.icon}</span>
            <div>
              <div className="award-title">{a.title}</div>
              <div className="award-who">
                {game.players[a.player].name}（{a.value}）
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="result-buttons">
        <Btn
          variant="primary"
          big
          onClick={() =>
            startGame({
              players: game.players.map(({ name, charId, isCpu, cpuLevel }) => ({ name, charId, isCpu, cpuLevel })),
              years: game.years,
              kumosuke: game.kumosukeOn,
            })
          }
        >
          同じメンバーで もう一回
        </Btn>
        <Btn onClick={quitToTitle}>タイトルへ</Btn>
      </div>
    </div>
  );
}
