// CPU の考え方。人間と同じ Action を返すので、人間と同じ流れで動く。
//   よわい(1)：よく道をまちがえる・カードをあまり使わない・物件の買い方が気まぐれ
//   ふつう(2)：ときどき道に迷う。手元に余裕を残して物件を買うが、見送ることもある
//   つよい(3)：くもすけの受け渡しやマスの良し悪しまで考える。たまに迷う
// 強さの目安（2026-11 に調整・npm run balance で測れる）：ふつうの人の遊び方をまねたプレイヤーが CPU 3人と対戦して 1位になる割合が
//   よわい 約65%・ふつう 約43%・つよい 約28%（実際の人は もっと迷うので、少し人に有利にしてある）
// さらにキャラごとの性格（data/characters.ts の PERSONA）で、考え方のくせが少し変わる。

import { CARDS, HAND_MAX } from '../data/cards';
import { PERSONA } from '../data/characters';
import { FERRY, NODE } from '../data/map';
import { PROP, PROPS_BY_STATION } from '../data/properties';
import { SELL_RATE, cardBlocked, cur, income, ownedProps, pittariMax, propIncome, yearFactor } from './game';
import { dist, reachableEnds } from './graph';
import type { Action, CardId, CpuLevel, GameState, Player } from './types';

/** 強さの段階ごとの考え方。ここの数字を変えると CPU の強さが変わる */
export interface LevelTuning {
  /** 分かれ道で でたらめに選ぶ割合 */
  mistake: number;
  /** カードを使わずに ただサイコロをふる割合（いそぎ屋は cardSkipRush） */
  cardSkip: number;
  cardSkipRush: number;
  /** ねむり草・ふうせんを 場面を見て使う */
  cardSense: boolean;
  /** 会場までの距離を見て 靴を使う */
  shoeSense: boolean;
  /** フェリーの乗り場を ねらって止まる */
  ferryPlan: boolean;
  /** フェリーに乗るかを 気まぐれで決める割合 */
  ferryWhim: number;
  /** 止まるマスの良し悪しを考える */
  landSense: boolean;
  /** くもすけの受け渡しを考える */
  kumoSense: boolean;
  /** 買える物件を 見送る割合（1件ごと） */
  buySkip: number;
  /** 景気ニュースもふくめた収益で 物件を選ぶ */
  newsSense: boolean;
  /** 物件を買うときに残すお金（3000両×年の倍率 に かける数。0 なら残さない） */
  reserve: number;
  /** 駅の残りの物件を全部買えるなら 買い占める */
  buyout: boolean;
  /** カード屋さんで残すお金（年の倍率をかける前） */
  shopReserve: number;
  /** カード屋さんで いろいろ買う（false なら かけあし靴だけ） */
  shopVariety: boolean;
}

export const LEVEL_TUNING: Record<CpuLevel, LevelTuning> = {
  // よわい：よく道をまちがえる・カードをあまり使わない・物件の買い方が気まぐれ
  1: {
    mistake: 0.28,
    cardSkip: 0.6,
    cardSkipRush: 0.35,
    cardSense: false,
    shoeSense: false,
    ferryPlan: false,
    ferryWhim: 0.3,
    landSense: false,
    kumoSense: false,
    buySkip: 0.4,
    newsSense: false,
    reserve: 0,
    buyout: false,
    shopReserve: 6000,
    shopVariety: false,
  },
  // ふつう：ときどき道に迷う。手元に余裕を残して物件を買うが、見送ることもある
  2: {
    mistake: 0.15,
    cardSkip: 0,
    cardSkipRush: 0,
    cardSense: true,
    shoeSense: false,
    ferryPlan: true,
    ferryWhim: 0,
    landSense: true,
    kumoSense: false,
    buySkip: 0.2,
    newsSense: true,
    reserve: 1,
    buyout: false,
    shopReserve: 6000,
    shopVariety: true,
  },
  // つよい：くもすけの受け渡しや 靴を使う距離まで考える。たまに迷う
  3: {
    mistake: 0.08,
    cardSkip: 0,
    cardSkipRush: 0,
    cardSense: true,
    shoeSense: true,
    ferryPlan: true,
    ferryWhim: 0,
    landSense: true,
    kumoSense: true,
    buySkip: 0,
    newsSense: true,
    reserve: 1,
    buyout: true,
    shopReserve: 3000,
    shopVariety: true,
  },
};
const tune = (p: Player) => LEVEL_TUNING[p.cpuLevel];

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
      if (!ph.goal && ph.walked === 0 && tune(p).ferryPlan) {
        const g = ferryGoal(s, p, ph.prev, ph.steps);
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
  const t = tune(p);
  const rush = PERSONA[p.charId].rush;
  // カードを使わずに ふる（いそぎ屋は少し多めに使う）
  if (noise(s, 11) < (rush ? t.cardSkipRush : t.cardSkip)) return { t: 'ROLL' };
  const d = dist(p.pos, s.destination);
  const has = (id: CardId) => cardIndex(p, id) >= 0 && !cardBlocked(s, p, id);
  const use = (id: CardId, extra: Partial<Extract<Action, { t: 'USE_CARD' }>> = {}): Action => ({ t: 'USE_CARD', index: cardIndex(p, id), ...extra });

  if (has('koban')) return use('koban');
  if (has('teruteru') && s.kumo === p.id) return use('teruteru');
  if (has('maneki') && s.month >= 9 && !p.maneki) return use('maneki');
  if (has('koukan')) {
    const best = s.players.filter((q) => q.id !== p.id).sort((a, b) => b.cards.length - a.cards.length)[0];
    if (best && best.cards.length >= p.cards.length + 1) return use('koukan', { target: best.id });
  }
  if (has('nemuri') && t.cardSense) {
    const someoneCloser = s.players.some((q) => q.id !== p.id && q.sleep === 0 && dist(q.pos, s.destination) < d);
    if (someoneCloser) return use('nemuri');
  }
  if (has('pittari') && d >= 1 && d <= pittariMax(p)) return use('pittari', { num: d });
  if (t.shoeSense && p.sleep === 0) {
    // 目的地に届く見込みが高いときに使う（通りすぎても到着になるので「合計 ≥ 距離」で考える）
    if (has('kakeashi') && d >= 4 && d <= 8) return use('kakeashi');
    if (has('hayate') && d >= 8 && d <= 13) return use('hayate');
    if (has('hayate') && d >= 18) return use('hayate');
    if (has('kakeashi') && d >= 12) return use('kakeashi');
    if (has('fusen') && d >= 30) return use('fusen');
    if (rush && has('kakeashi') && d > 8) return use('kakeashi');
    return { t: 'ROLL' };
  }
  if (p.sleep === 0) {
    if (has('hayate') && d >= 10 - rush) return use('hayate');
    if (has('kakeashi') && d >= 6 - rush) return use('kakeashi');
  }
  if (has('fusen') && d >= 30 && t.cardSense) return use('fusen');
  return { t: 'ROLL' };
}

const LAND_BONUS: Record<string, number> = { minus: 15, plus: -3, card: -3, omikuji: -2, shop: 0, station: -4, ferry: 0 };

/** フェリーに乗ると、おまつり会場まで 3マス以上（のりもの好きは1マス以上）近くなる乗り場に止まれるなら、そのマス */
function ferryGoal(s: GameState, p: Player, prev: string | null, steps: number): string | null {
  const ends = reachableEnds(p.pos, prev, steps, s.destination);
  if (ends.has(s.destination)) return null;
  let bestWalk = Infinity;
  for (const e of ends) bestWalk = Math.min(bestWalk, dist(e, s.destination));
  let best: string | null = null;
  let bestDist = bestWalk - (PERSONA[p.charId].ferry + 1);
  for (const e of ends) {
    const to = FERRY[e];
    if (to && dist(to, s.destination) < bestDist) {
      bestDist = dist(to, s.destination);
      best = e;
    }
  }
  return best;
}

/** フェリーに乗るか：おまつり会場に 2マス以上（性格で変わる）近くなるなら乗る */
function decideFerry(s: GameState, p: Player, to: string): Action {
  if (noise(s, 77) < tune(p).ferryWhim) return noise(s, 78) < 0.5 ? { t: 'RIDE' } : { t: 'DONE' };
  return dist(to, s.destination) + PERSONA[p.charId].ferry <= dist(p.pos, s.destination) ? { t: 'RIDE' } : { t: 'DONE' };
}

function decideDir(s: GameState, p: Player, options: string[], steps: number): string {
  const t = tune(p);
  if (noise(s, steps * 31 + options.length) < t.mistake) {
    return options[Math.floor(noise(s, 99 + steps) * options.length)];
  }
  const holder = s.kumo;
  let best = options[0];
  let bestScore = Infinity;
  options.forEach((o, i) => {
    let score = dist(o, s.destination) * 10;
    if (t.landSense && steps === 1) score += (LAND_BONUS[NODE[o].kind] ?? 0) + (PERSONA[p.charId].land[NODE[o].kind] ?? 0);
    if (t.kumoSense && holder !== null) {
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
  const t = tune(p);
  const persona = PERSONA[p.charId];
  const free = PROPS_BY_STATION[station].filter((pr) => s.owner[pr.id] === undefined);
  const othersOwn = PROPS_BY_STATION[station].some((pr) => s.owner[pr.id] !== undefined && s.owner[pr.id] !== p.id);
  const mineHere = PROPS_BY_STATION[station].some((pr) => s.owner[pr.id] === p.id);
  // 買い物好きは、すでに持っている駅なら お金を残さず買い足して ひとりじめをねらう
  const reserve = t.reserve === 0 || (persona.collector && mineHere && !othersOwn) ? 0 : round(3000 * yf * persona.reserve * t.reserve);
  if (free.length === 0) return { t: 'DONE' };

  // つよいCPUは、残りを全部買えるなら買い占める
  if (t.buyout) {
    const restCost = free.reduce((a, pr) => a + pr.price, 0);
    if (!othersOwn && restCost <= p.money - reserve) return { t: 'BUY', prop: free[0].id };
  }
  // ふつう・つよいCPUは、今年の景気もふくめた収益で考える
  const inc = (pr: (typeof free)[number]) => (t.newsSense ? propIncome(s, pr) : income(pr));
  const sorted = [...free].sort((a, b) => inc(b) - inc(a));
  for (const pr of sorted) {
    if (pr.price > p.money - reserve) continue;
    if (noise(s, pr.price) < t.buySkip) continue;
    return { t: 'BUY', prop: pr.id };
  }
  return { t: 'DONE' };
}

function decideShop(s: GameState, p: Player, items: CardId[]): Action {
  const yf = yearFactor(s.year);
  const persona = PERSONA[p.charId];
  if (p.cards.length >= HAND_MAX - (persona.hoarder ? 0 : 1)) return { t: 'DONE' };
  const reserve = round(tune(p).shopReserve * yf * persona.cardReserve);
  const count = (id: CardId) => p.cards.filter((c) => c === id).length;
  const wants: CardId[] =
    !tune(p).shopVariety
      ? ['kakeashi']
      : ['hayate', 'pittari', ...(s.kumo === p.id ? (['teruteru'] as CardId[]) : []), 'omamori', 'kakeashi', ...(s.month <= 10 ? (['maneki'] as CardId[]) : [])];
  for (const id of [...new Set([...persona.shop, ...wants])]) {
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
