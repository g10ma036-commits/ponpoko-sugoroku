// CPU の考え方。人間と同じ Action を返すので、人間と同じ流れで動く。
//   よわい(1)：ときどき道をまちがえる・カードをあまり使わない・物件の買い方が気まぐれ
//   ふつう(2)：目的地へ最短で向かい、手元に余裕を残して物件を買う
//   つよい(3)：くもすけの受け渡しやマスの良し悪しまで考える

import { CARDS, HAND_MAX } from '../data/cards';
import { FERRY, NODE } from '../data/map';
import { PROP, PROPS_BY_STATION } from '../data/properties';
import { SELL_RATE, cur, income, ownedProps, yearFactor } from './game';
import { dist, reachableEnds } from './graph';
import type { Action, CardId, GameState, Player } from './types';

/** state を変えない疑似乱数（同じ局面なら同じ答え） */
function noise(s: GameState, salt: number): number {
  let x = (s.rng ^ Math.imul(salt + 1, 0x9e3779b1) ^ Math.imul(s.rollId + 7, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function decide(s: GameState): Action | null {
  if (s.queue.length > 0) return { t: 'ACK' };
  const p = cur(s);
  const ph = s.phase;
  switch (ph.t) {
    case 'action':
      return decideAction(s, p);
    case 'moving': {
      // 動きはじめに、フェリーで近道できるか考える（よわいCPUは考えない）
      if (!ph.goal && ph.walked === 0 && p.cpuLevel >= 2) {
        const g = ferryGoal(s, p.pos, ph.prev, ph.steps);
        if (g) return { t: 'GOAL', to: g };
      }
      if (ph.options) return { t: 'DIR', to: decideDir(s, p, ph.options, ph.steps) };
      return { t: 'STEP' };
    }
    case 'ferry':
      return decideFerry(s, p, ph.to);
    case 'buy':
      return decideBuy(s, p, ph.station);
    case 'shop':
      return decideShop(s, p, ph.items);
    case 'sell':
      return decideSell(s, p);
    default:
      return null;
  }
}

function cardIndex(p: Player, id: CardId) {
  return p.cards.indexOf(id);
}

function decideAction(s: GameState, p: Player): Action {
  const lv = p.cpuLevel;
  // よわいCPUは、たまにしかカードを使わない
  if (lv === 1 && noise(s, 11) < 0.6) return { t: 'ROLL' };
  const d = dist(p.pos, s.destination);
  const has = (id: CardId) => cardIndex(p, id) >= 0;
  const use = (id: CardId, extra: Partial<Extract<Action, { t: 'USE_CARD' }>> = {}): Action => ({ t: 'USE_CARD', index: cardIndex(p, id), ...extra });

  if (has('koban')) return use('koban');
  if (has('teruteru') && s.kumo === p.id) return use('teruteru');
  if (has('maneki') && s.month >= 9 && !p.maneki) return use('maneki');
  if (has('koukan')) {
    const best = s.players.filter((q) => q.id !== p.id).sort((a, b) => b.cards.length - a.cards.length)[0];
    if (best && best.cards.length >= p.cards.length + 1) return use('koukan', { target: best.id });
  }
  if (has('nemuri') && lv >= 2) {
    const someoneCloser = s.players.some((q) => q.id !== p.id && q.sleep === 0 && dist(q.pos, s.destination) < d);
    if (someoneCloser) return use('nemuri');
  }
  if (has('pittari') && d >= 1 && d <= 6) return use('pittari', { num: d });
  if (lv === 3 && p.sleep === 0) {
    // 目的地に届く見込みが高いときに使う（通りすぎても到着になるので「合計 ≥ 距離」で考える）
    if (has('kakeashi') && d >= 4 && d <= 8) return use('kakeashi');
    if (has('hayate') && d >= 8 && d <= 13) return use('hayate');
    if (has('hayate') && d >= 18) return use('hayate');
    if (has('kakeashi') && d >= 12) return use('kakeashi');
    if (has('fusen') && d >= 30) return use('fusen');
    return { t: 'ROLL' };
  }
  if (p.sleep === 0) {
    if (has('hayate') && d >= 10) return use('hayate');
    if (has('kakeashi') && d >= 6) return use('kakeashi');
  }
  if (has('fusen') && d >= 30 && lv >= 2) return use('fusen');
  return { t: 'ROLL' };
}

const LAND_BONUS: Record<string, number> = { minus: 15, plus: -3, card: -3, omikuji: -2, shop: 0, station: -4, ferry: 0 };

/** フェリーに乗ると、おまつり会場まで 3マス以上近くなる乗り場に止まれるなら、そのマス */
function ferryGoal(s: GameState, pos: string, prev: string | null, steps: number): string | null {
  const ends = reachableEnds(pos, prev, steps, s.destination);
  if (ends.has(s.destination)) return null;
  let bestWalk = Infinity;
  for (const e of ends) bestWalk = Math.min(bestWalk, dist(e, s.destination));
  let best: string | null = null;
  let bestDist = bestWalk - 3;
  for (const e of ends) {
    const to = FERRY[e];
    if (to && dist(to, s.destination) < bestDist) {
      bestDist = dist(to, s.destination);
      best = e;
    }
  }
  return best;
}

/** フェリーに乗るか：おまつり会場に 2マス以上近くなるなら乗る */
function decideFerry(s: GameState, p: Player, to: string): Action {
  if (p.cpuLevel === 1 && noise(s, 77) < 0.3) return noise(s, 78) < 0.5 ? { t: 'RIDE' } : { t: 'DONE' };
  return dist(to, s.destination) + 2 <= dist(p.pos, s.destination) ? { t: 'RIDE' } : { t: 'DONE' };
}

function decideDir(s: GameState, p: Player, options: string[], steps: number): string {
  const mistake = p.cpuLevel === 1 ? 0.2 : p.cpuLevel === 2 ? 0.1 : 0;
  if (noise(s, steps * 31 + options.length) < mistake) {
    return options[Math.floor(noise(s, 99 + steps) * options.length)];
  }
  const holder = s.kumo;
  let best = options[0];
  let bestScore = Infinity;
  options.forEach((o, i) => {
    let score = dist(o, s.destination) * 10;
    if (p.cpuLevel >= 2 && steps === 1) score += LAND_BONUS[NODE[o].kind] ?? 0;
    if (p.cpuLevel === 3 && holder !== null) {
      const left = steps - 1;
      if (holder === p.id) {
        // くもすけをだれかに押しつけられそうなら、そっちへ
        const near = Math.min(...s.players.filter((q) => q.id !== p.id).map((q) => dist(o, q.pos)));
        if (near <= left) score -= 8;
      } else if (dist(o, s.players[holder].pos) <= left) {
        score += 8;
      }
    }
    score += noise(s, i + steps * 7) * 0.5; // 同点のときのゆらぎ
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  });
  return best;
}

function decideBuy(s: GameState, p: Player, station: string): Action {
  const yf = yearFactor(s.year);
  const lv = p.cpuLevel;
  const free = PROPS_BY_STATION[station].filter((pr) => s.owner[pr.id] === undefined);
  const reserve = lv === 1 ? 0 : round(3000 * yf);
  if (free.length === 0) return { t: 'DONE' };

  // つよいCPUは、残りを全部買えるなら買い占める
  if (lv === 3) {
    const othersOwn = PROPS_BY_STATION[station].some((pr) => s.owner[pr.id] !== undefined && s.owner[pr.id] !== p.id);
    const restCost = free.reduce((a, pr) => a + pr.price, 0);
    if (!othersOwn && restCost <= p.money - reserve) return { t: 'BUY', prop: free[0].id };
  }
  const sorted = [...free].sort((a, b) => income(b) - income(a));
  for (const pr of sorted) {
    if (pr.price > p.money - reserve) continue;
    if (lv === 1 && noise(s, pr.price) < 0.4) continue;
    return { t: 'BUY', prop: pr.id };
  }
  return { t: 'DONE' };
}

function decideShop(s: GameState, p: Player, items: CardId[]): Action {
  const yf = yearFactor(s.year);
  if (p.cards.length >= HAND_MAX - 1) return { t: 'DONE' };
  const reserve = round((p.cpuLevel === 3 ? 3000 : 6000) * yf);
  const count = (id: CardId) => p.cards.filter((c) => c === id).length;
  const wants: CardId[] =
    p.cpuLevel === 1
      ? ['kakeashi']
      : ['hayate', 'pittari', ...(s.kumo === p.id ? (['teruteru'] as CardId[]) : []), 'omamori', 'kakeashi', ...(s.month <= 10 ? (['maneki'] as CardId[]) : [])];
  for (const id of wants) {
    if (!items.includes(id)) continue;
    if (count(id) >= 2) continue;
    if (p.money - CARDS[id].price < reserve) continue;
    return { t: 'BUY_CARD', card: id };
  }
  return { t: 'DONE' };
}

function decideSell(s: GameState, p: Player): Action {
  const props = ownedProps(s, p.id).sort((a, b) => a.price - b.price);
  if (props.length === 0) return { t: 'DONE' };
  const need = -p.money;
  const enough = props.find((pr) => pr.price * SELL_RATE >= need);
  const pick = enough ?? props[props.length - 1];
  return { t: 'SELL', prop: pick.id };
}

function round(n: number) {
  return Math.round(n / 100) * 100;
}

/** 物件IDから名前（デバッグ用） */
export const propName = (id: string) => PROP[id]?.name ?? id;
