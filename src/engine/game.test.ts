import { describe, expect, it } from 'vitest';
import { FERRY, NODE, START_STATION, STATION_IDS } from '../data/map';
import { PROPS_BY_STATION } from '../data/properties';
import { LEVEL_TUNING, decide } from './ai';
import { BOOM_MULT, HOT_MULT, SLUMP_MULT, assets, cardBlocked, createGame, income, nearestStation, propIncome, reachStations, reduce, yearlyIncome } from './game';
import { ADJ, dist, reachableEnds } from './graph';
import type { Action, GameState } from './types';

const cfg = (seed = 42, n = 2) => ({
  players: Array.from({ length: n }, (_, i) => ({
    name: `P${i + 1}`,
    charId: (['pokota', 'mikeko', 'shibamaru', 'penkichi'] as const)[i],
    isCpu: false,
    cpuLevel: 2 as const,
  })),
  years: 1,
  kumosuke: true,
  seed,
});

const ackAll = (s: GameState) => {
  while (s.queue.length) s = reduce(s, { t: 'ACK' });
  return s;
};
const act = (s: GameState, a: Action) => {
  const next = reduce(s, a);
  expect(next, `action ${JSON.stringify(a)} should be accepted`).not.toBe(s);
  return next;
};

describe('マップ', () => {
  it('すべてのマスがつながっている', () => {
    const ids = Object.keys(NODE);
    for (const id of ids) expect(dist('nigiwai', id)).toBeLessThan(1000);
  });
  it('どのマスにも行き先がある', () => {
    for (const id of Object.keys(NODE)) expect(ADJ[id].length).toBeGreaterThan(0);
  });
  it('どの駅にも物件が3件以上ある', () => {
    for (const id of STATION_IDS) expect(PROPS_BY_STATION[id]?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
  it('おまつり会場は、前の会場から10〜28マスの駅に決まる', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = createGame(cfg(seed));
      const d = dist(START_STATION, s.destination);
      expect(d).toBeGreaterThanOrEqual(10);
      expect(d).toBeLessThanOrEqual(28);
    }
  });
});

describe('ゲームの進行', () => {
  it('同じシードなら同じ展開になる', () => {
    const run = () => {
      let s = ackAll(createGame(cfg(7)));
      s = act(s, { t: 'ROLL' });
      return s.phase;
    };
    expect(run()).toEqual(run());
  });

  it('メッセージが残っているあいだは ACK 以外を受け付けない', () => {
    const s = createGame(cfg());
    expect(s.queue.length).toBeGreaterThan(0);
    expect(reduce(s, { t: 'ROLL' })).toBe(s);
  });

  it('サイコロの目の数だけ進み、来た道はすぐ戻れない', () => {
    let s = ackAll(createGame(cfg(3)));
    s = act(s, { t: 'ROLL' });
    expect(s.phase.t).toBe('moving');
    if (s.phase.t !== 'moving') return;
    const total = s.phase.steps;
    let walked = 0;
    let prev: string | null = null;
    while (s.phase.t === 'moving' && s.queue.length === 0) {
      const ph: Extract<GameState['phase'], { t: 'moving' }> = s.phase;
      if (ph.options) {
        if (prev) expect(ph.options).not.toContain(prev);
        prev = s.players[0].pos;
        s = act(s, { t: 'DIR', to: ph.options[0] });
      } else {
        prev = s.players[0].pos;
        s = act(s, { t: 'STEP' });
      }
      walked++;
    }
    expect(walked).toBeLessThanOrEqual(total);
  });

  /** 会場のとなりのマスから、ぴったり札で num マス進む（分かれ道では会場のほうを選ぶ）。会場を通ったかも返す */
  const walkFromNextToDest = (num: number) => {
    let s = structuredClone(ackAll(createGame(cfg(5))));
    const dest = s.destination;
    s.players[0].pos = ADJ[dest][0];
    s.players[0].cards = ['pittari'];
    const before = s.players[0].money;
    s = act(s, { t: 'USE_CARD', index: 0, num });
    let passed = false;
    let guard = 0;
    while (s.phase.t === 'moving' && s.queue.length === 0 && guard++ < 20) {
      const ph = s.phase;
      s = ph.options ? act(s, { t: 'DIR', to: ph.options.includes(dest) ? dest : ph.options[0] }) : act(s, { t: 'STEP' });
      if (s.players[0].pos === dest) passed = true;
    }
    return { s, dest, before, passed };
  };

  it('おまつり会場に ぴったり止まると、到着して賞金がもらえる', () => {
    const { s, dest, before } = walkFromNextToDest(1);
    expect(s.players[0].pos).toBe(dest);
    expect(s.players[0].arrivals).toBe(1);
    expect(s.players[0].money).toBeGreaterThan(before);
    expect(s.destination).not.toBe(dest);
    expect(s.queue.some((m) => m.tone === 'arrival')).toBe(true);
  });

  it('おまつり会場は 通りすぎるだけでは 到着にならない', () => {
    const { s, dest, passed } = walkFromNextToDest(3);
    expect(passed).toBe(true);
    expect(s.players[0].pos).not.toBe(dest);
    expect(s.players[0].arrivals).toBe(0);
    expect(s.destination).toBe(dest);
    expect(s.queue.some((m) => m.tone === 'arrival')).toBe(false);
  });

  it('物件を買い、ひとりじめすると収益が2倍になる', () => {
    let s = ackAll(createGame(cfg()));
    s = structuredClone(s);
    const props = PROPS_BY_STATION['shika'];
    s.economy = undefined; // 景気の影響をなくして くらべる
    s.players[0].money = 1_000_000;
    s.phase = { t: 'buy', station: 'shika' };
    for (const pr of props.slice(0, -1)) s = act(s, { t: 'BUY', prop: pr.id });
    const partial = yearlyIncome(s, 0).income;
    expect(partial).toBe(props.slice(0, -1).reduce((a, p) => a + income(p), 0));
    s = act(s, { t: 'BUY', prop: props[props.length - 1].id });
    expect(yearlyIncome(s, 0).income).toBe(props.reduce((a, p) => a + income(p), 0) * 2);
    expect(yearlyIncome(s, 0).monopolies).toBe(1);
    // ほかの駅の物件は買えない
    expect(reduce(s, { t: 'BUY', prop: PROPS_BY_STATION['ocha'][0].id })).toBe(s);
  });

  it('えらんだ物件を まとめて買える（合計が払えないと買えない）', () => {
    const base = structuredClone(ackAll(createGame(cfg(31))));
    const props = PROPS_BY_STATION['shika'];
    base.economy = undefined;
    base.owner = {};
    base.phase = { t: 'buy', station: 'shika' };
    const two = props.slice(0, 2);
    const total = two[0].price + two[1].price;
    // 合計にたりないと だめ
    const poor = structuredClone(base);
    poor.players[0].money = total - 1;
    expect(reduce(poor, { t: 'BUY_SET', props: two.map((p) => p.id) })).toBe(poor);
    // ほかの駅の物件・同じ物件2つ・からっぽ は だめ
    base.players[0].money = 10_000_000;
    expect(reduce(base, { t: 'BUY_SET', props: [PROPS_BY_STATION['nigiwai'][0].id] })).toBe(base);
    expect(reduce(base, { t: 'BUY_SET', props: [two[0].id, two[0].id] })).toBe(base);
    expect(reduce(base, { t: 'BUY_SET', props: [] })).toBe(base);
    // 2件 まとめて買う → お金が減って、お買い物は おわる
    const s = act(base, { t: 'BUY_SET', props: two.map((p) => p.id) });
    expect(two.every((p) => s.owner[p.id] === 0)).toBe(true);
    expect(s.players[0].money).toBe(10_000_000 - total);
    expect(s.phase.t === 'buy').toBe(false);
    // 残りを ぜんぶ まとめて買うと ひとりじめ
    const all = act(base, { t: 'BUY_SET', props: props.map((p) => p.id) });
    expect(all.queue.some((m) => m.title === 'ひとりじめ！')).toBe(true);
  });

  it('お金が足りないと物件は買えない', () => {
    let s = ackAll(createGame(cfg()));
    s = structuredClone(s);
    s.players[0].money = 100;
    s.phase = { t: 'buy', station: 'nigiwai' };
    expect(reduce(s, { t: 'BUY', prop: PROPS_BY_STATION['nigiwai'][0].id })).toBe(s);
  });

  it('お金がマイナスになったら、物件を売るまで先に進めない', () => {
    let s = ackAll(createGame(cfg()));
    s = structuredClone(s);
    const pr = PROPS_BY_STATION['ocha'][0];
    s.owner[pr.id] = 0;
    s.players[0].money = -500;
    s.phase = { t: 'sell', next: 'end' };
    expect(reduce(s, { t: 'DONE' })).toBe(s);
    s = act(s, { t: 'SELL', prop: pr.id });
    expect(s.owner[pr.id]).toBeUndefined();
    expect(s.players[0].money).toBe(-500 + Math.round((pr.price * 0.7) / 100) * 100);
    // 売り終わったら手番が次の人へ
    expect(s.turn).toBe(1);
  });

  it('くもすけは、すれちがった人に乗りうつる', () => {
    let s = ackAll(createGame(cfg(9)));
    s = structuredClone(s);
    const a = 'nigiwai';
    const b = ADJ[a][0];
    s.players[0].pos = a;
    s.players[1].pos = b;
    s.kumo = 0;
    s.players[0].cards = ['pittari'];
    s = act(s, { t: 'USE_CARD', index: 0, num: 1 });
    if (s.phase.t === 'moving' && s.phase.options) s = act(s, { t: 'DIR', to: b });
    else if (s.phase.t === 'moving') s = act(s, { t: 'STEP' });
    expect(s.players[0].pos).toBe(b);
    expect(s.kumo).toBe(1);
  });

  it('ねむり草を使うと、ほかの人のサイコロが1〜3になる', () => {
    let s = ackAll(createGame(cfg(11)));
    s = structuredClone(s);
    s.players[0].cards = ['nemuri'];
    s = ackAll(act(s, { t: 'USE_CARD', index: 0 }));
    expect(s.players[1].sleep).toBe(3);
  });

  it('ねむっている間は、靴が使えず、ぴったり札も3まで', () => {
    let s = structuredClone(ackAll(createGame(cfg(12))));
    s.players[0].sleep = 2;
    s.players[0].cards = ['kakeashi', 'hayate', 'pittari'];
    expect(reduce(s, { t: 'USE_CARD', index: 0 })).toBe(s);
    expect(reduce(s, { t: 'USE_CARD', index: 1 })).toBe(s);
    expect(reduce(s, { t: 'USE_CARD', index: 2, num: 5 })).toBe(s);
    s = act(s, { t: 'USE_CARD', index: 2, num: 3 });
    expect(s.phase.t === 'moving' && s.phase.steps).toBe(3);
    expect(s.phase.t === 'moving' && s.phase.sleepy).toBe(true);
    expect(s.players[0].sleep).toBe(1);
  });

  it('ねむっているCPUは、ゴールが4マス以上先なら ぴったり札を使わない', () => {
    const base = structuredClone(ackAll(createGame({ ...cfg(14), players: cfg(14).players.map((p) => ({ ...p, isCpu: true })) })));
    const at = Object.keys(ADJ).find((id) => dist(id, base.destination) === 5)!;
    expect(at).toBeDefined();
    base.players[0].pos = at;
    base.players[0].sleep = 3;
    base.players[0].cards = ['pittari'];
    expect(decide(base)).toEqual({ t: 'ROLL' });
    base.players[0].sleep = 0;
    expect(decide(base)).toEqual({ t: 'USE_CARD', index: 0, num: 5 });
  });

  it('招き猫は、もう効いているときは使えない', () => {
    let s = structuredClone(ackAll(createGame(cfg(15))));
    s.players[0].cards = ['maneki', 'maneki'];
    s = ackAll(act(s, { t: 'USE_CARD', index: 0 }));
    expect(s.players[0].maneki).toBe(true);
    expect(reduce(s, { t: 'USE_CARD', index: 0 })).toBe(s);
  });

  it('ひとりじめできそうな駅は、自分だけが物件を持っていて 売り物が残っている駅', () => {
    const s = structuredClone(ackAll(createGame(cfg(16))));
    const [a, b, c] = ['shika', 'nigiwai', 'hotate'].map((id) => PROPS_BY_STATION[id]);
    s.owner = { [a[0].id]: 0, [b[0].id]: 0, [b[1].id]: 1 };
    for (const pr of c) s.owner[pr.id] = 0; // 全部持っている駅は もう ひとりじめ
    const r = reachStations(s, 0);
    expect(r.map((x) => x.station)).toEqual(['shika']);
    expect(r[0].left).toHaveLength(a.length - 1);
    expect(reachStations(s, 1)).toEqual([]);
  });

  it('ひとりじめ切符で、ひとりじめできそうな駅へ行き、そこで物件を買える', () => {
    let s = structuredClone(ackAll(createGame(cfg(18))));
    s.players[0].cards = ['kippu'];
    // ひとりじめできそうな駅がないと使えない
    expect(cardBlocked(s, s.players[0], 'kippu')).not.toBeNull();
    const st = STATION_IDS.find((id) => id !== s.players[0].pos && id !== s.destination)!;
    s.owner = { [PROPS_BY_STATION[st][0].id]: 0 };
    expect(cardBlocked(s, s.players[0], 'kippu')).toBeNull();
    // えらべない駅は だめ
    expect(reduce(s, { t: 'USE_CARD', index: 0, station: s.players[0].pos })).toBe(s);
    expect(reduce(s, { t: 'USE_CARD', index: 0 })).toBe(s);
    s = ackAll(act(s, { t: 'USE_CARD', index: 0, station: st }));
    expect(s.players[0].pos).toBe(st);
    expect(s.players[0].cards).toEqual([]);
    expect(s.phase).toEqual({ t: 'buy', station: st });
  });

  it('CPUは、残りを買えるお金があれば ひとりじめ切符を使う', () => {
    const s = structuredClone(ackAll(createGame(cfg(19))));
    const st = STATION_IDS.find((id) => id !== s.players[0].pos && id !== s.destination)!;
    s.owner = { [PROPS_BY_STATION[st][0].id]: 0 };
    s.players[0].isCpu = true;
    s.players[0].cpuLevel = 3;
    s.players[0].cards = ['kippu'];
    s.players[0].money = 5_000_000;
    // カードを使わずに ふる気まぐれ（noise）があるので、何回か ふり直した局面で ためす
    let used = 0;
    for (let k = 0; k < 10; k++) {
      const t = structuredClone(s);
      t.rollId = k;
      const a = decide(t);
      if (a?.t === 'USE_CARD') {
        expect(a).toMatchObject({ index: 0, station: st });
        used++;
      }
    }
    expect(used).toBeGreaterThan(0);
    // お金が足りないときは使わない
    s.players[0].money = 0;
    for (let k = 0; k < 10; k++) {
      const t = structuredClone(s);
      t.rollId = k;
      expect(decide(t)).toEqual({ t: 'ROLL' });
    }
  });

  it('てるてる坊主で追いはらった くもすけは、同じ番には もどってこない', () => {
    let s = structuredClone(ackAll(createGame(cfg(16))));
    const a = s.players[0].pos;
    const b = ADJ[a][0];
    s.players[1].pos = b;
    s.kumo = 0;
    s.players[0].cards = ['teruteru', 'pittari'];
    s = ackAll(act(s, { t: 'USE_CARD', index: 0 }));
    expect(s.kumo).toBe(1);
    s = act(s, { t: 'USE_CARD', index: 0, num: 1 });
    if (s.phase.t === 'moving' && s.phase.options) s = act(s, { t: 'DIR', to: b });
    else if (s.phase.t === 'moving') s = act(s, { t: 'STEP' });
    expect(s.players[0].pos).toBe(b);
    expect(s.kumo).toBe(1);
  });

  it('1年たつと決算があり、ゲームが終わる', () => {
    let s = createGame({ ...cfg(13), players: cfg(13).players.map((p) => ({ ...p, isCpu: true })) });
    let guard = 0;
    let sawSettlement = false;
    while ((s.phase.t !== 'gameOver' || s.queue.length > 0) && guard++ < 20000) {
      if (s.queue[0]?.settlement) sawSettlement = true;
      s = reduce(s, decide(s)!);
    }
    expect(s.phase.t).toBe('gameOver');
    expect(sawSettlement).toBe(true);
    expect(assets(s, 0)).toBeGreaterThan(0);
  });
});

describe('止まれるマス', () => {
  /** サイコロをふった直後の状態から、移動を最後まで進めて止まったマスを返す（分かれ道は choose で選ぶ） */
  const finish = (s: GameState, choose: (opts: string[]) => string) => {
    const mover = s.turn;
    let usedDir = false;
    while (s.phase.t === 'moving' && s.turn === mover) {
      if (s.queue.length) s = act(s, { t: 'ACK' });
      else if (s.phase.options) {
        usedDir = true;
        s = act(s, { t: 'DIR', to: choose(s.phase.options) });
      } else s = act(s, { t: 'STEP' });
    }
    return { pos: s.players[mover].pos, usedDir };
  };
  /** 分かれ道の選び方をすべて試して、止まれるマスを集める */
  const bruteForce = (s: GameState): Set<string> => {
    const out = new Set<string>();
    const walk = (st: GameState) => {
      const mover = st.turn;
      while (st.phase.t === 'moving' && st.turn === mover && !st.phase.options) {
        st = st.queue.length ? act(st, { t: 'ACK' }) : act(st, { t: 'STEP' });
      }
      if (st.phase.t === 'moving' && st.turn === mover && st.phase.options) {
        for (const o of st.phase.options) walk(act(st, { t: 'DIR', to: o }));
      } else out.add(st.players[mover].pos);
    };
    walk(s);
    return out;
  };
  const rolledAt = (seed: number, pos: string, steps: number) => {
    let s = ackAll(createGame(cfg(seed, 3)));
    s = structuredClone(s);
    s.players[s.turn].pos = pos;
    s = act(s, { t: 'ROLL' });
    if (s.phase.t !== 'moving') throw new Error('not moving');
    s.phase.steps = steps;
    return s;
  };

  it('計算した「止まれるマス」が、分かれ道の選び方を全部ためした結果と一致する', () => {
    const ids = Object.keys(NODE);
    for (let i = 0; i < 40; i++) {
      const pos = ids[(i * 37) % ids.length];
      const steps = (i % 12) + 1;
      const s = rolledAt(500 + i, pos, steps);
      if (s.phase.t !== 'moving') throw new Error();
      const ends = reachableEnds(pos, s.phase.prev, steps);
      expect([...ends].sort(), `${pos} から ${steps}マス`).toEqual([...bruteForce(s)].sort());
    }
  });

  it('止まれるマスを選ぶと、分かれ道で止まらずにそのマスまで進む', () => {
    const ids = Object.keys(NODE);
    for (let i = 0; i < 30; i++) {
      const pos = ids[(i * 53) % ids.length];
      const s = rolledAt(900 + i, pos, (i % 15) + 3);
      if (s.phase.t !== 'moving') throw new Error();
      for (const goal of reachableEnds(pos, s.phase.prev, s.phase.steps)) {
        const r = finish(act(s, { t: 'GOAL', to: goal }), (o) => o[0]);
        expect(r.pos).toBe(goal);
        expect(r.usedDir).toBe(false);
      }
    }
  });

  it('止まれないマスは選べない', () => {
    const s = rolledAt(77, 'nigiwai', 4);
    if (s.phase.t !== 'moving') throw new Error();
    const ends = reachableEnds('nigiwai', s.phase.prev, 4);
    const bad = Object.keys(NODE).find((id) => !ends.has(id))!;
    expect(reduce(s, { t: 'GOAL', to: bad })).toBe(s);
  });
});

describe('フェリー', () => {
  const ferries = Object.keys(FERRY);

  /** 乗り場のとなりのマスから1マス進んで、乗り場に止まったところ */
  const atFerry = (ferry: string, cpu = false) => {
    let s = structuredClone(ackAll(createGame(cfg(321, 2))));
    s.players[s.turn].pos = ADJ[ferry][0];
    s.players[s.turn].isCpu = cpu;
    s.players[s.turn].cpuLevel = 3;
    s = act(s, { t: 'ROLL' });
    if (s.phase.t !== 'moving') throw new Error('not moving');
    s.phase.steps = 1;
    return s;
  };
  const landOn = (ferry: string) => ackAll(act(act(atFerry(ferry), { t: 'GOAL', to: ferry }), { t: 'STEP' }));

  it('乗り場はフェリーマスで、行き先と2つで1組になっている', () => {
    expect(ferries.length).toBeGreaterThanOrEqual(4);
    for (const a of ferries) {
      expect(NODE[a].kind).toBe('ferry');
      expect(FERRY[FERRY[a]]).toBe(a);
    }
    for (const n of Object.values(NODE)) if (n.kind === 'ferry') expect(FERRY[n.id]).toBeDefined();
  });

  it('フェリーマスに止まると乗るか聞かれ、乗ると相手の乗り場まで一気に行く', () => {
    for (const f of ferries) {
      const s = landOn(f);
      expect(s.phase).toEqual({ t: 'ferry', to: FERRY[f] });
      const me = s.turn;
      const r = act(s, { t: 'RIDE' });
      expect(r.players[me].pos).toBe(FERRY[f]);
      expect(r.queue[0].title).toContain('フェリー');
      expect(ackAll(r).turn).not.toBe(me);
    }
  });

  it('乗らないこともできる', () => {
    const s = landOn(ferries[0]);
    const me = s.turn;
    const r = act(s, { t: 'DONE' });
    expect(r.players[me].pos).toBe(ferries[0]);
    expect(r.turn).not.toBe(me);
  });

  it('CPUは、おまつり会場に近づくときだけフェリーをねらって乗る', () => {
    const f = ferries[0];
    const near = structuredClone(atFerry(f, true));
    near.destination = nearestStation(FERRY[f]);
    expect(decide(near)).toEqual({ t: 'GOAL', to: f });
    const far = structuredClone(landOn(f));
    far.players[far.turn].isCpu = true;
    far.players[far.turn].cpuLevel = 3;
    far.destination = nearestStation(FERRY[f]);
    expect(decide(far)).toEqual({ t: 'RIDE' });
    far.destination = nearestStation(f);
    expect(decide(far)).toEqual({ t: 'DONE' });
  });
});

describe('景気ニュース', () => {
  it('はじめに今年の景気が発表され、好景気・不景気・ニュース速報で収益が変わる', () => {
    const s0 = createGame(cfg(5));
    expect(s0.economy).toBeDefined();
    expect(s0.queue.some((m) => m.news)).toBe(true);
    const s = structuredClone(ackAll(s0));
    const pr = PROPS_BY_STATION['shika'][0];
    const region = NODE[pr.station].region;
    const other = region === 'okinawa' ? 'hokkaido' : 'okinawa';
    const otherCat = pr.cat === 'food' ? 'farm' : 'food';
    s.economy = { year: 1, boom: other, slump: otherCat };
    expect(propIncome(s, pr)).toBe(income(pr));
    s.economy = { year: 1, boom: region, slump: otherCat };
    expect(propIncome(s, pr)).toBe(Math.round((income(pr) * BOOM_MULT) / 10) * 10);
    s.economy = { year: 1, boom: other, slump: pr.cat };
    expect(propIncome(s, pr)).toBe(Math.round((income(pr) * SLUMP_MULT) / 10) * 10);
    s.economy = { year: 1, boom: other, slump: otherCat, hot: pr.station };
    expect(propIncome(s, pr)).toBe(Math.round((income(pr) * HOT_MULT) / 10) * 10);
    // 決算の見込みにも入る
    s.owner[pr.id] = 0;
    expect(yearlyIncome(s, 0).income).toBe(propIncome(s, pr));
  });

  it('1年遊ぶと、6月のニュース速報・毎月の総資産・名場面が記録される', () => {
    let s = createGame({ ...cfg(17, 3), players: cfg(17, 3).players.map((p) => ({ ...p, isCpu: true })) });
    let guard = 0;
    let sawHot = false;
    while ((s.phase.t !== 'gameOver' || s.queue.length > 0) && guard++ < 30000) {
      if (s.queue[0]?.title === 'ニュース速報！') {
        sawHot = true;
        // 激アツ駅の発表では、カメラが その駅へ飛ぶ
        expect(s.queue[0].focus).toBe(s.economy?.hot);
      }
      s = reduce(s, decide(s)!);
    }
    expect(sawHot).toBe(true);
    expect(s.economy?.hot).toBeDefined();
    // はじめ + 12か月
    expect(s.history).toHaveLength(13);
    expect(s.history![0]).toEqual(s.players.map(() => 10000));
    expect(s.history![12]).toEqual(s.players.map((p) => assets(s, p.id)));
    expect(s.highlights?.income).toBeDefined();
    expect(s.highlights?.prize).toBeDefined();
  });
});

describe('CPU', () => {
  it('性格で考え方が変わる：買い物好きは持っている駅を買い足し、慎重派はお金を残す', () => {
    const base = structuredClone(ackAll(createGame(cfg(23))));
    const props = PROPS_BY_STATION['shika'];
    const rest = props.slice(1).sort((a, b) => a.price - b.price);
    base.owner = { [props[0].id]: 0 };
    base.economy = undefined;
    base.phase = { t: 'buy', station: 'shika' };
    base.players[0].isCpu = true;
    base.players[0].cpuLevel = 2;
    base.players[0].money = rest[0].price + 100;
    const buyer = structuredClone(base);
    buyer.players[0].charId = 'mikeko';
    expect(decide(buyer)).toMatchObject({ t: 'BUY' });
    const careful = structuredClone(base);
    careful.players[0].charId = 'penkichi';
    expect(decide(careful)).toEqual({ t: 'DONE' });
  });

  it('CPUは、会場に ぴったり止まれる道があれば その道をえらぶ（どの強さでも。わざと迷う分はのぞく）', () => {
    for (const level of [1, 2, 3] as const) {
      const saved = LEVEL_TUNING[level].mistake;
      LEVEL_TUNING[level].mistake = 0;
      let hits = 0;
      let tries = 0;
      for (let seed = 0; seed < 12; seed++) {
        let s = structuredClone(ackAll(createGame(cfg(300 + seed))));
        const dest = s.destination;
        // 会場まで ちょうど steps マスの、分かれ道のあるマスから ふる
        const steps = 2 + (seed % 4);
        const pos = Object.keys(ADJ).find((id) => ADJ[id].length >= 3 && dist(id, dest) === steps);
        if (!pos) continue;
        tries++;
        s.players[0].pos = pos;
        s.players[0].isCpu = true;
        s.players[0].cpuLevel = level;
        s.players[0].cards = ['pittari'];
        s = act(s, { t: 'USE_CARD', index: 0, num: steps });
        let guard = 0;
        while (s.phase.t === 'moving' && s.queue.length === 0 && guard++ < 30) s = reduce(s, decide(s)!);
        if (s.players[0].arrivals === 1) hits++;
      }
      LEVEL_TUNING[level].mistake = saved;
      expect(tries).toBeGreaterThanOrEqual(8);
      expect(hits, `強さ ${level}`).toBe(tries);
    }
  });

  it('CPUだけの対戦が、いろいろなシードで最後まで進む', () => {
    for (let seed = 100; seed < 120; seed++) {
      let s = createGame({ ...cfg(seed, 4), players: cfg(seed, 4).players.map((p, i) => ({ ...p, isCpu: true, cpuLevel: ((i % 3) + 1) as 1 | 2 | 3 })) });
      let guard = 0;
      while ((s.phase.t !== 'gameOver' || s.queue.length > 0) && guard++ < 50000) {
        const a = decide(s);
        expect(a).not.toBeNull();
        const next = reduce(s, a!);
        expect(next, `seed ${seed} ${JSON.stringify(a)}`).not.toBe(s);
        s = next;
      }
      expect(s.phase.t).toBe('gameOver');
    }
  });
});

describe('演出のための目印', () => {
  it('おみくじには結果、会場の発表にはカメラの行き先、くもすけのいたずらには雷がつく', () => {
    let s = createGame({ ...cfg(21, 4), years: 2, players: cfg(21, 4).players.map((p) => ({ ...p, isCpu: true })) });
    const seen = { fortune: 0, focus: 0, thunder: 0 };
    let guard = 0;
    while ((s.phase.t !== 'gameOver' || s.queue.length > 0) && guard++ < 60000) {
      const m = s.queue[0];
      if (m?.title?.startsWith('おみくじ：')) {
        expect(m.fortune).toBe(m.title.slice('おみくじ：'.length));
        seen.fortune++;
      }
      if (m?.title === 'つぎのおまつり会場' || m?.title === 'おまつり会場') {
        expect(m.focus).toBe(s.destination);
        seen.focus++;
      }
      if (m?.title === 'くもすけのいたずら') {
        expect(m.thunder).toBe(true);
        seen.thunder++;
      }
      s = reduce(s, decide(s)!);
    }
    expect(seen.fortune).toBeGreaterThan(0);
    expect(seen.focus).toBeGreaterThan(1);
    expect(seen.thunder).toBeGreaterThan(0);
  });
});
