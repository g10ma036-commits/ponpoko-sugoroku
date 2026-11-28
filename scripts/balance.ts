// CPU の強さの目安を測る。「ふつうの人」をまねたプレイヤー1人と CPU3人を対戦させて、人が1位になる割合を出す。
//   npm run balance -- --games 800 --years 3
// 目安：よわい 約65%・ふつう 約43%・つよい 約28%（強さは src/engine/ai.ts の LEVEL_TUNING で変える）
import { decide } from '../src/engine/ai';
import { assets, cardBlocked, createGame, cur, pittariMax, reduce, yearFactor } from '../src/engine/game';
import { dist, reachableEnds } from '../src/engine/graph';
import { PROPS_BY_STATION } from '../src/data/properties';
import { CARDS, HAND_MAX } from '../src/data/cards';
import type { Action, CardId, CharId, CpuLevel, GameState } from '../src/engine/types';

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const ALL: CharId[] = ['pokota', 'mikeko', 'shibamaru', 'penkichi', 'usami', 'konko'];

let r = 99;
const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);

/** ふつうの人：道は近道（画面に距離が出るので）、物件は買えるものを気分で、カードはわかりやすい場面で */
export function human(s: GameState): Action {
  if (s.queue.length) return { t: 'ACK' };
  const p = cur(s);
  const ph = s.phase;
  const yf = yearFactor(s.year);
  switch (ph.t) {
    case 'action': {
      const d = dist(p.pos, s.destination);
      const can = (id: CardId) => p.cards.includes(id) && !cardBlocked(s, p, id);
      const use = (id: CardId, extra = {}): Action => ({ t: 'USE_CARD', index: p.cards.indexOf(id), ...extra });
      if (can('koban')) return use('koban');
      if (can('teruteru')) return use('teruteru');
      if (can('pittari') && d <= pittariMax(p)) return use('pittari', { num: d });
      if (can('maneki') && s.month >= 6) return use('maneki');
      if (can('hayate') && d >= 10) return use('hayate');
      if (can('kakeashi') && d >= 6) return use('kakeashi');
      if (can('nemuri') && rnd() < 0.5) return use('nemuri');
      return { t: 'ROLL' };
    }
    case 'moving': {
      // 会場が光っていたら（ぴったり止まれるなら）そこを押す
      if (!ph.goal && ph.walked === 0 && reachableEnds(p.pos, ph.prev, ph.steps).has(s.destination)) return { t: 'GOAL', to: s.destination };
      if (!ph.options) return { t: 'STEP' };
      const best = Math.min(...ph.options.map((o) => dist(o, s.destination)));
      const good = ph.options.filter((o) => dist(o, s.destination) === best);
      return { t: 'DIR', to: good[Math.floor(rnd() * good.length)] };
    }
    case 'ferry':
      return dist(ph.to, s.destination) < dist(p.pos, s.destination) ? { t: 'RIDE' } : { t: 'DONE' };
    case 'buy': {
      const keep = 1000 * yf;
      const ok = PROPS_BY_STATION[ph.station].filter((pr) => s.owner[pr.id] === undefined && pr.price <= p.money - keep);
      if (!ok.length || rnd() < 0.15) return { t: 'DONE' };
      return { t: 'BUY', prop: ok[Math.floor(rnd() * ok.length)].id };
    }
    case 'shop': {
      const ok = ph.items.filter((id) => CARDS[id].price <= p.money - 5000 * yf);
      if (!ok.length || p.cards.length >= HAND_MAX - 2 || rnd() < 0.5) return { t: 'DONE' };
      return { t: 'BUY_CARD', card: ok[Math.floor(rnd() * ok.length)] };
    }
    default:
      return decide(s)!;
  }
}

export function match(LEVEL: CpuLevel, GAMES: number, YEARS = 3) {
  r = 99;
  let wins = 0;
  let rankSum = 0;
  let gap = 0;
  for (let g = 0; g < GAMES; g++) {
    const seat = g % 4;
    const humanChar = ALL[Math.floor(g / 4) % 6];
    const others = ALL.filter((c) => c !== humanChar);
    const chars = Array.from({ length: 4 }, (_, i) => (i === seat ? humanChar : others[(g + i) % 5]));
    let s = createGame({
      players: chars.map((c, i) => ({ name: `P${i}`, charId: c, isCpu: i !== seat, cpuLevel: LEVEL })),
      years: YEARS,
      kumosuke: true,
      seed: 4242 + g,
    });
    let guard = 0;
    while ((s.phase.t !== 'gameOver' || s.queue.length) && guard++ < 200000) {
      const a = s.turn === seat && !s.queue.length ? human(s) : decide(s)!;
      const next = reduce(s, a);
      s = next === s ? reduce(s, decide(s)!) : next;
    }
    const a = s.players.map((p) => assets(s, p.id));
    const order = [...a].sort((x, y) => y - x);
    if (a[seat] === order[0]) wins++;
    rankSum += order.indexOf(a[seat]) + 1;
    gap += a[seat] - Math.max(...a.filter((_, i) => i !== seat));
  }
  return { win: wins / GAMES, rank: rankSum / GAMES, gap: gap / GAMES };
}

const GAMES = opt('games', 800);
const YEARS = opt('years', 3);
for (const lv of [1, 2, 3] as CpuLevel[]) {
  const m = match(lv, GAMES, YEARS);
  console.log(`CPU「${['', 'よわい', 'ふつう', 'つよい'][lv]}」×3 と対戦：人が1位 ${(m.win * 100).toFixed(1)}%  平均順位 ${m.rank.toFixed(2)}  CPUの1位との差 平均 ${Math.round(m.gap)}両`);
}
