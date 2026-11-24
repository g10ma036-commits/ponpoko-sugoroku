// ゲームの状態遷移の中心。reduce(state, action) は新しい state を返す（元の state は変えない）。
// メッセージ（queue）が残っているあいだは ACK しか受け付けない。

import { CARDS, CARD_IDS, HAND_MAX, SHOP_IDS } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import { NODE, START_STATION, STATION_IDS } from '../data/map';
import { PROP, PROPS_BY_STATION } from '../data/properties';
import { formatRyo } from './format';
import { dist, nextOptions } from './graph';
import { newSeed, pick, pickWeighted, rand, randInt } from './rng';
import type { Action, CardId, GameConfig, GameState, Msg, Player, Property, SettlementRow } from './types';

export const START_MONEY = 10000;
/** バランス調整用：物件の収益の倍率 */
export const INCOME_SCALE = 1;
/** 物件を売るときは買った値段の何割で売れるか */
export const SELL_RATE = 0.7;

export const yearFactor = (year: number) => 1 + 0.3 * (year - 1);
export const round100 = (n: number) => Math.round(n / 100) * 100;
export const income = (p: Property) => Math.round((p.price * p.rate * INCOME_SCALE) / 100 / 10) * 10;

export const cur = (s: GameState): Player => s.players[s.turn];
export const nameOf = (s: GameState, id: number) => s.players[id].name;
export const stationName = (id: string) => NODE[id]?.name ?? id;

export function ownedProps(s: GameState, player: number): Property[] {
  return Object.entries(s.owner)
    .filter(([, o]) => o === player)
    .map(([id]) => PROP[id]);
}

export function isMonopoly(s: GameState, station: string, player: number): boolean {
  return PROPS_BY_STATION[station].every((p) => s.owner[p.id] === player);
}

export function assets(s: GameState, player: number): number {
  return s.players[player].money + ownedProps(s, player).reduce((a, p) => a + p.price, 0);
}

/** 決算でもらえる見込みの収益 */
export function yearlyIncome(s: GameState, player: number): { income: number; monopolies: number } {
  const props = ownedProps(s, player);
  const stations = new Set(props.map((p) => p.station));
  let total = 0;
  let monopolies = 0;
  for (const st of stations) {
    const mono = isMonopoly(s, st, player);
    if (mono) monopolies++;
    for (const p of props) if (p.station === st) total += income(p) * (mono ? 2 : 1);
  }
  return { income: total, monopolies };
}

// ---------------------------------------------------------------- 開始

export function createGame(cfg: GameConfig): GameState {
  const s: GameState = {
    version: 1,
    rng: cfg.seed ?? newSeed(),
    years: cfg.years,
    kumosukeOn: cfg.kumosuke,
    year: 1,
    month: 1,
    turn: 0,
    players: cfg.players.map((pc, id) => ({
      ...pc,
      id,
      pos: START_STATION,
      money: START_MONEY,
      cards: [],
      arrivals: 0,
      sleep: 0,
      maneki: false,
      lastIncome: 0,
      kumoDamage: 0,
    })),
    destination: START_STATION,
    prevDestination: START_STATION,
    kumo: null,
    kumoMoved: false,
    owner: {},
    phase: { t: 'action' },
    queue: [],
    rollId: 0,
    log: [],
  };
  // スタートから少し遠い駅を最初のおまつり会場にする
  s.destination = chooseDestination(s, START_STATION);
  // 全員に1枚ずつカードを配る
  for (const p of s.players) p.cards.push('kakeashi');
  s.queue.push({
    tone: 'event',
    title: 'ようこそ、ぽんぽこ列島へ！',
    text: `${s.years}年かけて列島をめぐり、いちばんのお金もちを目指そう。\nみんなに「かけあし靴」を1枚ずつ配ったよ。`,
    speaker: 'hoo',
    expr: 'happy',
  });
  s.queue.push({
    tone: 'event',
    title: 'おまつり会場',
    text: `最初のおまつり会場は「${stationName(s.destination)}」！\n一番に着くと賞金がもらえるぞ。`,
    speaker: 'hoo',
  });
  return s;
}

function chooseDestination(s: GameState, from: string): string {
  const far = STATION_IDS.filter((id) => id !== from && dist(from, id) >= 10);
  const pool = far.length > 0 ? far : STATION_IDS.filter((id) => id !== from);
  return pick(s, pool);
}

// ---------------------------------------------------------------- reduce

export function reduce(prev: GameState, a: Action): GameState {
  if (prev.queue.length > 0) {
    if (a.t !== 'ACK') return prev;
    const s = structuredClone(prev);
    s.queue.shift();
    advance(s);
    return s;
  }
  const s = structuredClone(prev);
  const ok = apply(s, a);
  if (!ok) return prev;
  advance(s);
  return s;
}

/** メッセージがなく手番終わりなら、次の人へ進める */
function advance(s: GameState) {
  let guard = 0;
  while (s.queue.length === 0 && s.phase.t === 'end' && guard++ < 10) nextTurn(s);
}

function apply(s: GameState, a: Action): boolean {
  const ph = s.phase;
  const p = cur(s);
  switch (ph.t) {
    case 'action':
      if (a.t === 'ROLL') {
        startMove(s, 1);
        return true;
      }
      if (a.t === 'USE_CARD') return useCard(s, a.index, a.num, a.target);
      return false;

    case 'moving':
      if (a.t === 'STEP' && ph.options === null && ph.steps > 0) {
        stepTo(s, nextOptions(p.pos, ph.prev)[0]);
        return true;
      }
      if (a.t === 'DIR' && ph.options?.includes(a.to)) {
        stepTo(s, a.to);
        return true;
      }
      return false;

    case 'buy':
      if (a.t === 'BUY') return buyProperty(s, a.prop, ph.station);
      if (a.t === 'DONE') {
        s.phase = { t: 'end' };
        return true;
      }
      return false;

    case 'shop':
      if (a.t === 'BUY_CARD') {
        const def = CARDS[a.card];
        if (!ph.items.includes(a.card) || p.money < def.price || p.cards.length >= HAND_MAX) return false;
        p.money -= def.price;
        p.cards.push(a.card);
        log(s, `${p.name}が${def.name}を買った`);
        return true;
      }
      if (a.t === 'DONE') {
        s.phase = { t: 'end' };
        return true;
      }
      return false;

    case 'sell':
      if (a.t === 'SELL') {
        if (s.owner[a.prop] !== p.id) return false;
        const pr = PROP[a.prop];
        delete s.owner[a.prop];
        const got = round100(pr.price * SELL_RATE);
        p.money += got;
        log(s, `${p.name}が${pr.name}を${got}両で売った`);
        if (p.money >= 0 || ownedProps(s, p.id).length === 0) s.phase = { t: ph.next };
        return true;
      }
      if (a.t === 'DONE' && (p.money >= 0 || ownedProps(s, p.id).length === 0)) {
        s.phase = { t: ph.next };
        return true;
      }
      return false;

    default:
      return false;
  }
}

// ---------------------------------------------------------------- 移動

function startMove(s: GameState, diceCount: number, forced?: number) {
  const p = cur(s);
  const sleepy = p.sleep > 0;
  if (sleepy) p.sleep--;
  const dice = forced !== undefined ? [forced] : Array.from({ length: diceCount }, () => randInt(s, 1, sleepy ? 3 : 6));
  const steps = dice.reduce((a, b) => a + b, 0);
  s.rollId++;
  s.kumoMoved = false;
  s.phase = { t: 'moving', steps, dice, prev: null, options: null, walked: 0 };
  refreshOptions(s);
  log(s, `${p.name}は${dice.join('+')}で${steps}マス`);
}

function refreshOptions(s: GameState) {
  const ph = s.phase;
  if (ph.t !== 'moving') return;
  const opts = nextOptions(cur(s).pos, ph.prev);
  ph.options = opts.length > 1 ? opts : null;
}

function stepTo(s: GameState, to: string) {
  const ph = s.phase;
  if (ph.t !== 'moving') return;
  const p = cur(s);
  const from = p.pos;
  p.pos = to;
  ph.prev = from;
  ph.steps--;
  ph.walked++;
  checkKumoContact(s, to);
  if (to === s.destination) {
    ph.steps = 0;
    arrive(s);
    return;
  }
  if (ph.steps <= 0) {
    land(s);
    return;
  }
  refreshOptions(s);
}

function checkKumoContact(s: GameState, at: string) {
  if (s.kumo === null || s.kumoMoved) return;
  const mover = cur(s);
  if (s.kumo === mover.id) {
    const others = s.players.filter((q) => q.id !== mover.id && q.pos === at);
    if (others.length === 0) return;
    const to = others[0];
    s.kumo = to.id;
    s.kumoMoved = true;
    s.queue.push({
      tone: 'kumo',
      title: 'すれちがい！',
      text: `くもすけが ${to.name}さんに 乗りうつった！`,
      speaker: 'kumo',
      expr: 'happy',
      player: to.id,
    });
  } else if (s.players[s.kumo].pos === at) {
    const from = s.players[s.kumo];
    s.kumo = mover.id;
    s.kumoMoved = true;
    s.queue.push({
      tone: 'kumo',
      title: 'すれちがい！',
      text: `${from.name}さんの くもすけが ${mover.name}さんに 乗りうつってきた！`,
      speaker: 'kumo',
      expr: 'happy',
      player: mover.id,
    });
  }
}

// ---------------------------------------------------------------- 止まったマス

function land(s: GameState) {
  const p = cur(s);
  const node = NODE[p.pos];
  const yf = yearFactor(s.year);
  switch (node.kind) {
    case 'station':
      s.phase = { t: 'buy', station: node.id };
      return;
    case 'plus': {
      const amt = round100(randInt(s, 8, 20) * 100 * yf);
      p.money += amt;
      s.queue.push({ tone: 'good', title: 'ふくマス', text: `${formatRyo(amt)} もらった！`, speaker: p.charId, expr: 'happy', player: p.id, delta: amt });
      s.phase = { t: 'end' };
      return;
    }
    case 'minus': {
      const amt = round100(randInt(s, 6, 16) * 100 * yf);
      if (useOmamori(s, p, 'とほほマス')) {
        s.phase = { t: 'end' };
        return;
      }
      p.money -= amt;
      s.queue.push({ tone: 'bad', title: 'とほほマス', text: `${pick(s, MINUS_REASONS)}\n${formatRyo(amt)} はらった…`, speaker: p.charId, expr: 'sad', player: p.id, delta: -amt });
      checkDebt(s, 'end');
      return;
    }
    case 'card': {
      if (p.cards.length >= HAND_MAX) {
        s.queue.push({ tone: 'info', title: 'ふだマス', text: '手札がいっぱいで、カードをもらえなかった…', speaker: p.charId, expr: 'sad', player: p.id });
      } else {
        const c = drawCard(s);
        p.cards.push(c);
        s.queue.push({ tone: 'good', title: 'ふだマス', text: `「${CARDS[c].icon} ${CARDS[c].name}」を手に入れた！`, speaker: p.charId, expr: 'happy', player: p.id });
      }
      s.phase = { t: 'end' };
      return;
    }
    case 'shop': {
      const pool = [...SHOP_IDS];
      const items: CardId[] = [];
      while (items.length < 5 && pool.length > 0) items.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0]);
      s.phase = { t: 'shop', items };
      return;
    }
    case 'omikuji':
      omikuji(s);
      return;
  }
}

const MINUS_REASONS = [
  'たぬきの落とし穴に はまった！',
  'おさいふに 穴があいていた！',
  'ついつい おみやげを 買いすぎた！',
  'にわか雨で 傘を買った！',
  'げたの鼻緒が 切れた！',
  'カラスに おにぎりを 取られた！',
];

function drawCard(s: GameState): CardId {
  return CARD_IDS[pickWeighted(s, CARD_IDS.map((id) => CARDS[id].weight))];
}

function useOmamori(s: GameState, p: Player, what: string): boolean {
  const i = p.cards.indexOf('omamori');
  if (i < 0) return false;
  p.cards.splice(i, 1);
  s.queue.push({ tone: 'good', title: 'おまもり', text: `おまもりが ${what}から 守ってくれた！`, speaker: p.charId, expr: 'happy', player: p.id });
  return true;
}

/** お金がマイナスになったら物件を売ってもらう */
function checkDebt(s: GameState, next: 'action' | 'end') {
  const p = cur(s);
  if (p.money < 0 && ownedProps(s, p.id).length > 0) {
    s.phase = { t: 'sell', next };
    s.queue.push({ tone: 'bad', title: 'お金がたりない！', text: '物件を売って、お金をつくろう。', speaker: 'hoo', player: p.id });
  } else {
    s.phase = { t: next };
  }
}

const FORTUNES = [
  { name: '大吉', w: 10 },
  { name: '中吉', w: 20 },
  { name: '吉', w: 30 },
  { name: '小吉', w: 20 },
  { name: '凶', w: 20 },
];

function omikuji(s: GameState) {
  const p = cur(s);
  const yf = yearFactor(s.year);
  const f = pickWeighted(s, FORTUNES.map((x) => x.w));
  const title = `おみくじ：${FORTUNES[f].name}`;
  s.phase = { t: 'end' };
  if (f === 0) {
    const amt = round100(randInt(s, 30, 50) * 100 * yf);
    p.money += amt;
    s.queue.push({ tone: 'good', title, text: `神さまから ${formatRyo(amt)} の おめぐみ！`, speaker: p.charId, expr: 'happy', player: p.id, delta: amt });
  } else if (f === 1) {
    const amt = round100(1000 * yf);
    p.money += amt;
    let text = `${formatRyo(amt)} もらった！`;
    if (p.cards.length < HAND_MAX) {
      const c = drawCard(s);
      p.cards.push(c);
      text += `\nさらに「${CARDS[c].icon} ${CARDS[c].name}」も もらった！`;
    }
    s.queue.push({ tone: 'good', title, text, speaker: p.charId, expr: 'happy', player: p.id, delta: amt });
  } else if (f === 2) {
    const amt = round100(randInt(s, 15, 25) * 100 * yf);
    p.money += amt;
    s.queue.push({ tone: 'good', title, text: `${formatRyo(amt)} もらった！`, speaker: p.charId, expr: 'happy', player: p.id, delta: amt });
  } else if (f === 3) {
    const amt = round100(500 * yf);
    p.money += amt;
    s.queue.push({ tone: 'good', title, text: `ちょっぴり ${formatRyo(amt)} もらった。`, speaker: p.charId, expr: 'normal', player: p.id, delta: amt });
  } else {
    if (useOmamori(s, p, '凶')) return;
    const amt = round100(randInt(s, 15, 25) * 100 * yf);
    p.money -= amt;
    s.queue.push({ tone: 'bad', title, text: `おさい銭を はずみすぎた…\n${formatRyo(amt)} はらった。`, speaker: p.charId, expr: 'sad', player: p.id, delta: -amt });
    checkDebt(s, 'end');
  }
  if (f <= 2 && s.kumo === p.id) {
    s.kumo = null;
    s.queue.push({ tone: 'kumo', title: 'おはらい', text: 'おみくじの ごりやくで、くもすけが 逃げていった！', speaker: 'kumo', expr: 'sad', player: p.id });
  }
}

function arrive(s: GameState) {
  const p = cur(s);
  const yf = yearFactor(s.year);
  const d = Math.max(dist(s.prevDestination, s.destination), 6);
  const summer = s.month === 8 ? 2 : 1;
  const bonus = round100((5000 + 250 * d) * yf) * summer;
  p.money += bonus;
  p.arrivals++;
  s.queue.push({
    tone: 'arrival',
    title: 'おまつり会場に一番のり！',
    text: `${p.name}さん、おめでとう！\n賞金 ${formatRyo(bonus)}${summer > 1 ? '（夏祭りで2倍！）' : ''}`,
    speaker: p.charId,
    expr: 'happy',
    player: p.id,
    delta: bonus,
  });
  const old = s.destination;
  s.prevDestination = old;
  s.destination = chooseDestination(s, old);
  s.queue.push({
    tone: 'event',
    title: 'つぎのおまつり会場',
    text: `つぎのおまつり会場は「${stationName(s.destination)}」！`,
    speaker: 'hoo',
  });
  if (s.kumosukeOn && s.players.length > 1) {
    const others = s.players.filter((q) => q.id !== p.id);
    const maxD = Math.max(...others.map((q) => dist(q.pos, old)));
    const far = others.filter((q) => dist(q.pos, old) === maxD);
    const victim = pick(s, far);
    const already = s.kumo === victim.id;
    s.kumo = victim.id;
    s.queue.push({
      tone: 'kumo',
      title: 'くもすけ',
      text: already
        ? `くもすけは ${victim.name}さんに くっついたまま…`
        : `いちばん遠くにいた ${victim.name}さんに くもすけが くっついた！`,
      speaker: 'kumo',
      expr: 'happy',
      player: victim.id,
    });
  }
  s.phase = { t: 'buy', station: old };
}

// ---------------------------------------------------------------- 物件

function buyProperty(s: GameState, propId: string, station: string): boolean {
  const p = cur(s);
  const pr = PROP[propId];
  if (!pr || pr.station !== station || s.owner[propId] !== undefined || p.money < pr.price) return false;
  s.owner[propId] = p.id;
  p.money -= pr.price;
  log(s, `${p.name}が${pr.name}を買った`);
  if (isMonopoly(s, station, p.id)) {
    s.queue.push({
      tone: 'good',
      title: 'ひとりじめ！',
      text: `${stationName(station)}の物件を ぜんぶ手に入れた！\n決算の収益が2倍になるぞ。`,
      speaker: p.charId,
      expr: 'happy',
      player: p.id,
    });
  }
  return true;
}

// ---------------------------------------------------------------- カード

function useCard(s: GameState, index: number, num?: number, target?: number): boolean {
  const p = cur(s);
  const id = p.cards[index];
  if (!id) return false;
  const def = CARDS[id];
  if (def.passive) return false;
  if (id === 'pittari' && (num === undefined || num < 1 || num > 6 || !Number.isInteger(num))) return false;
  if (id === 'teruteru' && (s.kumo !== p.id || s.players.length < 2)) return false;
  if (id === 'koukan' && (target === undefined || target === p.id || !s.players[target])) return false;

  p.cards.splice(index, 1);
  log(s, `${p.name}が${def.name}を使った`);
  const yf = yearFactor(s.year);
  switch (id) {
    case 'kakeashi':
      startMove(s, 2);
      break;
    case 'hayate':
      startMove(s, 3);
      break;
    case 'pittari':
      startMove(s, 1, num);
      break;
    case 'fusen': {
      const to = pick(s, STATION_IDS.filter((st) => st !== p.pos));
      p.pos = to;
      s.rollId++;
      s.queue.push({ tone: 'info', title: 'ふうせん', text: `ふわふわ〜っと「${stationName(to)}」へ 飛んでいった！`, speaker: p.charId, expr: 'happy', player: p.id });
      if (to === s.destination) arrive(s);
      else s.phase = { t: 'buy', station: to };
      break;
    }
    case 'nemuri':
      for (const q of s.players) if (q.id !== p.id) q.sleep = 3;
      s.queue.push({ tone: 'info', title: 'ねむり草', text: 'ほかのみんなが うとうと…\n3回のあいだ、サイコロの目が1〜3になる。', speaker: p.charId, expr: 'happy', player: p.id });
      break;
    case 'koban': {
      const amt = round100(randInt(s, 10, 30) * 100 * yf);
      p.money += amt;
      s.queue.push({ tone: 'good', title: 'こばん', text: `こばんを両替して ${formatRyo(amt)} になった！`, speaker: p.charId, expr: 'happy', player: p.id, delta: amt });
      break;
    }
    case 'maneki':
      p.maneki = true;
      s.queue.push({ tone: 'good', title: '招き猫', text: '次の決算の収益が 1.5倍になる！', speaker: p.charId, expr: 'happy', player: p.id });
      break;
    case 'teruteru': {
      const others = s.players.filter((q) => q.id !== p.id);
      const to = pick(s, others);
      s.kumo = to.id;
      s.queue.push({ tone: 'kumo', title: 'てるてる坊主', text: `お日さまが出て、くもすけは ${to.name}さんの ところへ 飛んでいった！`, speaker: 'kumo', expr: 'sad', player: to.id });
      break;
    }
    case 'koukan': {
      const t = s.players[target!];
      [p.cards, t.cards] = [t.cards, p.cards];
      s.queue.push({ tone: 'info', title: '交換札', text: `${t.name}さんと 手札を ぜんぶ入れかえた！`, speaker: p.charId, expr: 'happy', player: p.id });
      break;
    }
    case 'omamori':
      break;
  }
  return true;
}

// ---------------------------------------------------------------- 手番・月・年

function nextTurn(s: GameState) {
  s.turn++;
  if (s.turn >= s.players.length) {
    s.turn = 0;
    endOfMonth(s);
    if (s.phase.t === 'gameOver') return;
  }
  s.phase = { t: 'action' };
  if (s.kumo === s.turn) kumoMischief(s);
}

function endOfMonth(s: GameState) {
  if (s.month === 12) {
    settlement(s);
    s.year++;
    s.month = 1;
    if (s.year > s.years) {
      s.year = s.years;
      s.month = 12;
      s.phase = { t: 'gameOver' };
      s.queue.push({ tone: 'event', title: 'ゲーム終了！', text: 'おつかれさま！\nさあ、結果発表だ。', speaker: 'hoo', expr: 'happy' });
      return;
    }
  } else {
    s.month++;
  }
  monthStart(s);
}

function settlement(s: GameState) {
  const rows: SettlementRow[] = s.players.map((p) => {
    const { income: inc, monopolies } = yearlyIncome(s, p.id);
    const total = p.maneki ? Math.round(inc * 1.5) : inc;
    const row: SettlementRow = { player: p.id, income: total, monopolies, maneki: p.maneki };
    p.money += total;
    p.lastIncome = total;
    p.maneki = false;
    return row;
  });
  s.queue.push({
    tone: 'event',
    title: `${s.year}年目の決算`,
    text: '1年間の物件の収益が入ったよ！',
    speaker: 'hoo',
    settlement: rows,
  });
}

function seasonalPayout(s: GameState, filter: (p: Property) => boolean, mult: number): string[] {
  const lines: string[] = [];
  for (const p of s.players) {
    const props = ownedProps(s, p.id).filter(filter);
    const amt = round100(props.reduce((a, pr) => a + income(pr), 0) * mult);
    if (amt > 0) {
      p.money += amt;
      lines.push(`${p.name}：+${formatRyo(amt)}`);
    }
  }
  return lines;
}

function monthStart(s: GameState) {
  const yf = yearFactor(s.year);
  const push = (m: Omit<Msg, 'tone' | 'speaker'>) => s.queue.push({ tone: 'event', speaker: 'hoo', ...m });
  switch (s.month) {
    case 1: {
      const amt = round100(1000 * yf);
      for (const p of s.players) p.money += amt;
      push({ title: `${s.year}年目のお正月`, text: `あけまして おめでとう！\nみんなに お年玉 ${formatRyo(amt)}！`, expr: 'happy' });
      break;
    }
    case 2: {
      const lines = seasonalPayout(s, (p) => NODE[p.station].region === 'yukimi', 0.5);
      push({ title: 'ゆきみ島の雪まつり', text: `ゆきみ島の物件が にぎわった！\n${lines.length ? lines.join('\n') : '物件を持っている人は いなかった…'}` });
      break;
    }
    case 4: {
      const lines = seasonalPayout(s, (p) => p.cat === 'tourism', 0.5);
      push({ title: 'お花見の季節', text: `観光の物件に お客さんが いっぱい！\n${lines.length ? lines.join('\n') : '観光の物件を持っている人は いなかった…'}` });
      break;
    }
    case 8:
      push({ title: '夏祭り', text: '今月は、おまつり会場の賞金が 2倍だ！' });
      break;
    case 10: {
      const lines = seasonalPayout(s, (p) => p.cat === 'farm', 1);
      push({ title: '秋の収穫祭', text: `農業の物件が 大豊作！\n${lines.length ? lines.join('\n') : '農業の物件を持っている人は いなかった…'}` });
      break;
    }
  }
}

function kumoMischief(s: GameState) {
  const p = cur(s);
  const yf = yearFactor(s.year);
  const r = rand(s);
  const msg = (text: string, delta?: number) =>
    s.queue.push({ tone: 'kumo', title: 'くもすけのいたずら', text, speaker: 'kumo', expr: 'happy', player: p.id, delta });
  if (r < 0.25) {
    s.queue.push({ tone: 'kumo', title: 'くもすけ', text: 'くもすけは すやすや お昼寝中…', speaker: 'kumo', expr: 'normal', player: p.id });
    return;
  }
  if (r < 0.35) {
    const amt = round100(1000 * yf);
    p.money += amt;
    s.queue.push({ tone: 'kumo', title: 'くもすけ', text: `くもすけが めぐみの雨を ふらせた！\n畑がよろこんで ${formatRyo(amt)} もうかった。`, speaker: 'kumo', expr: 'happy', player: p.id, delta: amt });
    return;
  }
  if (useOmamori(s, p, 'くもすけのいたずら')) return;
  const props = ownedProps(s, p.id);
  let kind = r < 0.6 ? 'steal' : r < 0.75 ? 'card' : 'leak';
  if (kind === 'card' && p.cards.length === 0) kind = 'steal';
  if (kind === 'leak' && props.length === 0) kind = 'steal';
  if (kind === 'steal') {
    const amt = Math.max(round100(Math.max(p.money, 0) * 0.15), round100(800 * yf));
    p.money -= amt;
    p.kumoDamage += amt;
    msg(`さいふに 雨がふりこんで ${formatRyo(amt)} 流されちゃった！`, -amt);
  } else if (kind === 'card') {
    const i = Math.floor(rand(s) * p.cards.length);
    const c = p.cards.splice(i, 1)[0];
    msg(`「${CARDS[c].name}」が 雨でぬれて、ボロボロに…`);
  } else {
    const pr = pick(s, props);
    const amt = Math.max(round100(income(pr) * 1.5), 500);
    p.money -= amt;
    p.kumoDamage += amt;
    msg(`${pr.name}が 雨もり！\n修理代 ${formatRyo(amt)} をはらった。`, -amt);
  }
  checkDebt(s, 'action');
}

function log(s: GameState, line: string) {
  s.log.push(`${s.year}年${s.month}月 ${line}`);
  if (s.log.length > 60) s.log.splice(0, s.log.length - 60);
}

export const speakerName = (id: string) => CHARACTERS[id as keyof typeof CHARACTERS]?.name ?? '';
