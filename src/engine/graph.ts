// マップのつながりと、全マス間の最短距離（マス数）。
import { EDGES, NODES } from '../data/map';

export const ADJ: Record<string, string[]> = {};
for (const n of NODES) ADJ[n.id] = [];
for (const e of EDGES) {
  ADJ[e.a].push(e.b);
  ADJ[e.b].push(e.a);
}

const INDEX: Record<string, number> = Object.fromEntries(NODES.map((n, i) => [n.id, i]));
const N = NODES.length;
const DIST = new Uint16Array(N * N).fill(0xffff);

// 辺の重みがすべて1なので、各マスから幅優先探索すれば最短距離が出る
for (let s = 0; s < N; s++) {
  const base = s * N;
  DIST[base + s] = 0;
  const q = [s];
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    const d = DIST[base + u] + 1;
    for (const v of ADJ[NODES[u].id]) {
      const vi = INDEX[v];
      if (DIST[base + vi] > d) {
        DIST[base + vi] = d;
        q.push(vi);
      }
    }
  }
}

export function dist(a: string, b: string): number {
  return DIST[INDEX[a] * N + INDEX[b]];
}

/** 今回の移動で次に進めるマス（来た道はすぐ引き返せない。行き止まりなら戻れる） */
export function nextOptions(pos: string, prev: string | null): string[] {
  const all = ADJ[pos];
  const opts = all.filter((n) => n !== prev);
  return opts.length > 0 ? opts : all;
}

/**
 * あと steps マス進んだときに止まれるマスの一覧。
 * 移動のルールは nextOptions と同じで、stopAt（おまつり会場）を通ったらそこで止まる。
 */
export function reachableEnds(pos: string, prev: string | null, steps: number, stopAt: string): Set<string> {
  if (steps <= 0) return new Set([pos]);
  const memo = new Map<string, Set<string>>();
  const go = (at: string, from: string | null, left: number): Set<string> => {
    const key = `${at}|${from}|${left}`;
    let r = memo.get(key);
    if (r) return r;
    r = new Set();
    for (const o of nextOptions(at, from)) {
      if (o === stopAt || left === 1) r.add(o);
      else for (const e of go(o, at, left - 1)) r.add(e);
    }
    memo.set(key, r);
    return r;
  };
  return go(pos, prev, steps);
}

/** goal に止まるために、次に進むマス（行けないなら null） */
export function stepToward(pos: string, prev: string | null, steps: number, stopAt: string, goal: string): string | null {
  for (const o of nextOptions(pos, prev)) {
    if (o === stopAt || steps === 1) {
      if (o === goal) return o;
    } else if (reachableEnds(o, pos, steps - 1, stopAt).has(goal)) {
      return o;
    }
  }
  return null;
}
