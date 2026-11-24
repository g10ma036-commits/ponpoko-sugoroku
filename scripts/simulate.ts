// CPU だけで何試合も対戦させて、止まる・落ちる・終わらないが無いか、バランスはどうかを調べる。
//   npm run sim -- --games 1000 --years 3
import { decide } from '../src/engine/ai';
import { assets, createGame, reduce } from '../src/engine/game';
import type { CharId, CpuLevel, GameState } from '../src/engine/types';

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const GAMES = opt('games', 200);
const YEARS = opt('years', 3);
const PLAYERS = opt('players', 4);
const lvArg = args.indexOf('--levels'); // 例: --levels 1,2,3,2
const MIX = lvArg >= 0;

const chars: CharId[] = ['pokota', 'mikeko', 'shibamaru', 'penkichi'];
const levels: CpuLevel[] = MIX ? (args[lvArg + 1].split(',').map(Number) as CpuLevel[]) : [2, 2, 2, 2];

export function runGame(seed: number, years = YEARS) {
  let s: GameState = createGame({
    players: Array.from({ length: PLAYERS }, (_, i) => ({ name: `CPU${i + 1}`, charId: chars[i], isCpu: true, cpuLevel: levels[i] })),
    years,
    kumosuke: true,
    seed,
  });
  let actions = 0;
  const LIMIT = 200000;
  while (s.phase.t !== 'gameOver' || s.queue.length > 0) {
    const a = decide(s);
    if (!a) throw new Error(`seed ${seed}: CPU が何もできない phase=${s.phase.t}`);
    const next = reduce(s, a);
    if (next === s) throw new Error(`seed ${seed}: 不正な行動 ${JSON.stringify(a)} phase=${JSON.stringify(s.phase)}`);
    s = next;
    if (++actions > LIMIT) throw new Error(`seed ${seed}: 終わらない`);
  }
  return { s, actions };
}

const isMain = process.argv[1]?.includes('simulate');
if (isMain) {
  const t0 = Date.now();
  const wins = new Array(PLAYERS).fill(0);
  let failures = 0;
  const finalAssets: number[] = [];
  const spreads: number[] = [];
  let totalActions = 0;
  let totalArrivals = 0;
  let totalProps = 0;
  let negatives = 0;
  for (let g = 0; g < GAMES; g++) {
    try {
      const { s, actions } = runGame(1000 + g);
      totalActions += actions;
      const a = s.players.map((p) => assets(s, p.id));
      const best = a.indexOf(Math.max(...a));
      wins[best]++;
      finalAssets.push(...a);
      spreads.push(Math.max(...a) - Math.min(...a));
      totalArrivals += s.players.reduce((x, p) => x + p.arrivals, 0);
      totalProps += Object.keys(s.owner).length;
      negatives += s.players.filter((p) => p.money < 0).length;
    } catch (e) {
      failures++;
      console.error(String(e));
    }
  }
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1));
  const sorted = [...finalAssets].sort((a, b) => a - b);
  console.log(`試合数 ${GAMES}（${YEARS}年・${PLAYERS}人${MIX ? `・強さ ${levels.join('/')}` : ''}）  失敗 ${failures}  ${Date.now() - t0}ms`);
  console.log(`勝った回数（席順）: ${wins.join(' / ')}`);
  console.log(`最終資産 平均 ${avg(finalAssets)}  中央値 ${sorted[Math.floor(sorted.length / 2)]}  最小 ${sorted[0]}  最大 ${sorted[sorted.length - 1]}`);
  console.log(`1位と最下位の差 平均 ${avg(spreads)}`);
  console.log(`1試合あたり 行動数 ${Math.round(totalActions / GAMES)}  到着 ${(totalArrivals / GAMES).toFixed(1)}回  売れた物件 ${(totalProps / GAMES).toFixed(1)}件  借金で終了 ${negatives}人`);
  if (failures > 0) process.exit(1);
}
