// 駅名の札をどこに置くか（上・下・右・左のうち、マスやほかの札にいちばん重ならない場所）。
// 画面（Squares.tsx）と点検スクリプト（scripts/check-map.ts）で同じ結果を使う。
import { EDGES, NODE, NODES } from '../../data/map';
import type { MapNode } from '../../engine/types';

export type LabelSide = 'below' | 'above' | 'right' | 'left';

export interface LabelPlace {
  side: LabelSide;
  /** 札の中心（駅からの相対位置） */
  dx: number;
  dy: number;
  /** 札の幅 */
  w: number;
  /** 持ち主の点の列の高さ（駅の箱のふち。札と反対側） */
  dotsDy: number;
}

export const labelWidth = (name: string) => name.length * 21 + 22;

function place(side: LabelSide, w: number): LabelPlace {
  switch (side) {
    case 'below':
      return { side, dx: 0, dy: 45, w, dotsDy: -27 };
    case 'above':
      return { side, dx: 0, dy: -44, w, dotsDy: 27 };
    case 'right':
      return { side, dx: 31 + w / 2, dy: 0, w, dotsDy: 27 };
    case 'left':
      return { side, dx: -31 - w / 2, dy: 0, w, dotsDy: 27 };
  }
}

/** 札を囲む四角（絶対座標） */
export function labelBox(st: MapNode, p: LabelPlace) {
  return { x0: st.x + p.dx - p.w / 2, x1: st.x + p.dx + p.w / 2, y0: st.y + p.dy - 17, y1: st.y + p.dy + 15 };
}

type Box = ReturnType<typeof labelBox>;
const overlap = (a: Box, b: Box) => a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;

function segHitsBox(ax: number, ay: number, bx: number, by: number, b: Box) {
  for (let t = 0; t <= 1; t += 0.125) {
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
  }
  return false;
}

const SIDE_COST: Record<LabelSide, number> = { below: 0, above: 0.05, right: 0.1, left: 0.15 };

function compute(): Record<string, LabelPlace> {
  const stations = NODES.filter((n) => n.kind === 'station');
  const out: Record<string, LabelPlace> = {};
  const placed: Box[] = [];
  // 混んでいる駅から先に決める
  const crowd = (st: MapNode) => NODES.filter((n) => Math.hypot(n.x - st.x, n.y - st.y) < 160).length;
  const order = [...stations].sort((a, b) => crowd(b) - crowd(a));
  for (const st of order) {
    const w = labelWidth(st.name ?? '');
    let best: LabelPlace | null = null;
    let bestCost = Infinity;
    const candidates: { side: LabelSide; sx: number; sy: number }[] = [];
    for (const side of ['below', 'above', 'right', 'left'] as LabelSide[]) {
      for (const k of [0, 1, -1]) {
        const vertical = side === 'below' || side === 'above';
        candidates.push({ side, sx: vertical ? k * (w / 2 - 8) : 0, sy: vertical ? 0 : k * 28 });
      }
    }
    for (const c of candidates) {
      const base = place(c.side, w);
      const p = { ...base, dx: base.dx + c.sx, dy: base.dy + c.sy };
      const box = labelBox(st, p);
      let cost = SIDE_COST[c.side] + (c.sx || c.sy ? 0.3 : 0);
      for (const n of NODES) {
        if (n.id === st.id) continue;
        const r = n.kind === 'station' ? 28 : 21;
        if (n.x + r > box.x0 && n.x - r < box.x1 && n.y + r > box.y0 && n.y - r < box.y1) cost += n.kind === 'station' ? 6 : 3;
      }
      for (const b of placed) if (overlap(box, b)) cost += 8;
      for (const e of EDGES) {
        const a = NODE[e.a];
        const b = NODE[e.b];
        if (a.id === st.id || b.id === st.id) continue;
        if (segHitsBox(a.x, a.y, b.x, b.y, box)) cost += 0.4;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = p;
      }
    }
    out[st.id] = best!;
    placed.push(labelBox(st, best!));
  }
  return out;
}

let cache: Record<string, LabelPlace> | null = null;
/** 駅ごとの札の置き場所（はじめて使うときに計算する） */
export function getLabels(): Record<string, LabelPlace> {
  return (cache ??= compute());
}
