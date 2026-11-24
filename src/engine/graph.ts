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
