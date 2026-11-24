import { describe, expect, it } from 'vitest';
import { NODE, START_STATION, STATION_IDS } from '../data/map';
import { PROPS_BY_STATION } from '../data/properties';
import { decide } from './ai';
import { assets, createGame, income, reduce, yearlyIncome } from './game';
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

  it('おまつり会場を通りかかったら、そこで止まって賞金がもらえる', () => {
    let s = ackAll(createGame(cfg(5)));
    // 会場のとなりのマスに置いて、6マス進ませる
    const dest = s.destination;
    const next = ADJ[dest][0];
    s = structuredClone(s);
    s.players[0].pos = next;
    s.players[0].cards = ['pittari'];
    const before = s.players[0].money;
    s = act(s, { t: 'USE_CARD', index: 0, num: 6 });
    // 会場の方向を選びながら進む
    let guard = 0;
    while (s.phase.t === 'moving' && s.queue.length === 0 && guard++ < 10) {
      const ph = s.phase;
      s = ph.options ? act(s, { t: 'DIR', to: ph.options.includes(dest) ? dest : ph.options[0] }) : act(s, { t: 'STEP' });
    }
    expect(s.players[0].pos).toBe(dest);
    expect(s.players[0].arrivals).toBe(1);
    expect(s.players[0].money).toBeGreaterThan(before);
    expect(s.destination).not.toBe(dest);
    expect(s.queue.some((m) => m.tone === 'arrival')).toBe(true);
  });

  it('物件を買い、ひとりじめすると収益が2倍になる', () => {
    let s = ackAll(createGame(cfg()));
    s = structuredClone(s);
    const props = PROPS_BY_STATION['shika'];
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
      const ends = reachableEnds(pos, s.phase.prev, steps, s.destination);
      expect([...ends].sort(), `${pos} から ${steps}マス`).toEqual([...bruteForce(s)].sort());
    }
  });

  it('止まれるマスを選ぶと、分かれ道で止まらずにそのマスまで進む', () => {
    const ids = Object.keys(NODE);
    for (let i = 0; i < 30; i++) {
      const pos = ids[(i * 53) % ids.length];
      const s = rolledAt(900 + i, pos, (i % 15) + 3);
      if (s.phase.t !== 'moving') throw new Error();
      for (const goal of reachableEnds(pos, s.phase.prev, s.phase.steps, s.destination)) {
        const r = finish(act(s, { t: 'GOAL', to: goal }), (o) => o[0]);
        expect(r.pos).toBe(goal);
        expect(r.usedDir).toBe(false);
      }
    }
  });

  it('止まれないマスは選べない', () => {
    const s = rolledAt(77, 'nigiwai', 4);
    if (s.phase.t !== 'moving') throw new Error();
    const ends = reachableEnds('nigiwai', s.phase.prev, 4, s.destination);
    const bad = Object.keys(NODE).find((id) => !ends.has(id))!;
    expect(reduce(s, { t: 'GOAL', to: bad })).toBe(s);
  });
});

describe('CPU', () => {
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
