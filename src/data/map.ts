// ぽんぽこ列島のマップ。駅の座標と、駅どうしをつなぐ道（あいだのマスの種類）を書くと、
// あいだのマスは自動で並べられる。
//   + ふくマス  - とほほマス  c ふだマス  s みせマス  o おみくじマス

import type { MapEdge, MapNode, RegionId, SquareKind } from '../engine/types';

export const MAP_W = 1240;
export const MAP_H = 2000;

/** lx, ly は地図上に地方名を書く位置 */
export const REGIONS: Record<RegionId, { name: string; color: string; lx: number; ly: number }> = {
  yukimi: { name: 'ゆきみ島', color: '#5aa2dc', lx: 590, ly: 250 },
  yamabiko: { name: 'やまびこ地方', color: '#4fa64d', lx: 500, ly: 700 },
  miyako: { name: 'みやこ地方', color: '#e8784e', lx: 290, ly: 1010 },
  uzushio: { name: 'うずしお地方', color: '#d9a400', lx: 90, ly: 1345 },
  hidamari: { name: 'ひだまり島', color: '#d667ad', lx: 50, ly: 1690 },
};

interface StationDef {
  id: string;
  name: string;
  x: number;
  y: number;
  region: RegionId;
}

const STATIONS: StationDef[] = [
  // ゆきみ島（北の島）
  { id: 'shirokuma', name: 'しろくま港', x: 860, y: 110, region: 'yukimi' },
  { id: 'hotate', name: 'ほたて浜', x: 1110, y: 180, region: 'yukimi' },
  { id: 'lavender', name: 'ラベンダー丘', x: 820, y: 345, region: 'yukimi' },
  { id: 'koori', name: 'こおり湖', x: 1090, y: 400, region: 'yukimi' },
  // やまびこ地方
  { id: 'ringo', name: 'りんご村', x: 1070, y: 630, region: 'yamabiko' },
  { id: 'yukemuri', name: 'ゆけむり温泉', x: 820, y: 650, region: 'yamabiko' },
  { id: 'kokeshi', name: 'こけし里', x: 1130, y: 845, region: 'yamabiko' },
  { id: 'hoshizora', name: 'ほしぞら高原', x: 930, y: 830, region: 'yamabiko' },
  { id: 'soba', name: 'そばの里', x: 720, y: 870, region: 'yamabiko' },
  // みやこ地方
  { id: 'kagami', name: 'かがみ湖', x: 590, y: 1030, region: 'miyako' },
  { id: 'karakuri', name: 'からくり町', x: 1060, y: 1050, region: 'miyako' },
  { id: 'nigiwai', name: 'にぎわい城下', x: 810, y: 1080, region: 'miyako' },
  { id: 'akarenga', name: 'あかれんが港', x: 990, y: 1260, region: 'miyako' },
  { id: 'shika', name: 'しかの都', x: 520, y: 1215, region: 'miyako' },
  { id: 'ocha', name: 'おちゃの郷', x: 740, y: 1285, region: 'miyako' },
  { id: 'furin', name: 'ふうりん町', x: 880, y: 1440, region: 'miyako' },
  // うずしお地方
  { id: 'mikan', name: 'みかん浜', x: 400, y: 1420, region: 'uzushio' },
  { id: 'udon', name: 'うどん町', x: 600, y: 1490, region: 'uzushio' },
  { id: 'uzushio', name: 'うずしお岬', x: 760, y: 1610, region: 'uzushio' },
  { id: 'shinju', name: 'しんじゅ島', x: 380, y: 1600, region: 'uzushio' },
  // ひだまり島（南の島）
  { id: 'tonkotsu', name: 'とんこつ町', x: 330, y: 1770, region: 'hidamari' },
  { id: 'kemuri', name: 'けむり山', x: 560, y: 1760, region: 'hidamari' },
  { id: 'sango', name: 'さんご岬', x: 150, y: 1850, region: 'hidamari' },
  { id: 'satokibi', name: 'さとうきび村', x: 410, y: 1930, region: 'hidamari' },
  { id: 'yashi', name: 'やしの浜', x: 700, y: 1890, region: 'hidamari' },
];

/** [駅A, 駅B, あいだのマス, 船の航路か, 曲がり具合] */
type LinkDef = [string, string, string, boolean?, number?];

const LINKS: LinkDef[] = [
  // ゆきみ島
  ['shirokuma', 'hotate', '+c+', false, -30],
  ['shirokuma', 'lavender', '-+', false, 20],
  ['hotate', 'koori', 'o+', false, -20],
  ['lavender', 'koori', '+s-', false, 30],
  // ゆきみ島 → やまびこ（船）
  ['koori', 'ringo', 'c+', true],
  ['lavender', 'yukemuri', '+c-', true, -20],
  // やまびこ地方
  ['ringo', 'yukemuri', '+-', false, 25],
  ['ringo', 'kokeshi', '+o', false, -15],
  ['yukemuri', 'hoshizora', 'c+', false, -15],
  ['yukemuri', 'soba', '-+', false, 15],
  ['kokeshi', 'hoshizora', 's', false, 15],
  ['hoshizora', 'soba', '+', false],
  // みやこ地方
  ['soba', 'kagami', '+c', false, 15],
  ['soba', 'nigiwai', 'o+', false],
  ['hoshizora', 'nigiwai', '+c-', false, 20],
  ['kokeshi', 'karakuri', '-+', false, -15],
  ['hoshizora', 'karakuri', '+s', false, -20],
  ['karakuri', 'nigiwai', 'c+', false, -15],
  ['kagami', 'nigiwai', '+-', false, -15],
  ['kagami', 'shika', '-+', false, 15],
  ['nigiwai', 'ocha', '+c', false],
  ['nigiwai', 'akarenga', 's+', false, 15],
  ['karakuri', 'akarenga', '+o', false, -15],
  ['shika', 'ocha', '+-', false, 20],
  ['ocha', 'furin', 'c+', false],
  ['akarenga', 'furin', '-+', false, -15],
  // みやこ → うずしお（橋・船）
  ['shika', 'mikan', '+c', true],
  ['furin', 'uzushio', 'o+', true],
  // うずしお地方
  ['mikan', 'udon', '+-', false, -15],
  ['udon', 'uzushio', 'c+', false],
  ['mikan', 'shinju', '+', false],
  ['shinju', 'udon', 's+', false, 20],
  // うずしお → ひだまり（船）
  ['shinju', 'tonkotsu', 'c', true],
  ['uzushio', 'kemuri', '+-', true],
  // ひだまり島
  ['tonkotsu', 'kemuri', '+o', false, -15],
  ['tonkotsu', 'sango', '-+', false, -15],
  ['sango', 'satokibi', 'c+', false, 25],
  ['tonkotsu', 'satokibi', '+', false],
  ['kemuri', 'satokibi', 's', false],
  ['kemuri', 'yashi', '+c', false, -15],
  ['satokibi', 'yashi', '-+', false, 15],
];

const KIND_OF: Record<string, SquareKind> = {
  '+': 'plus',
  '-': 'minus',
  c: 'card',
  s: 'shop',
  o: 'omikuji',
};

function build(): { nodes: MapNode[]; edges: MapEdge[] } {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const byId = new Map<string, StationDef>();
  for (const s of STATIONS) {
    byId.set(s.id, s);
    nodes.push({ id: s.id, kind: 'station', x: s.x, y: s.y, region: s.region, name: s.name });
  }
  for (const [a, b, pattern, sea, bend = 0] of LINKS) {
    const A = byId.get(a);
    const B = byId.get(b);
    if (!A || !B) throw new Error(`unknown station in link ${a}-${b}`);
    // 二次ベジェ曲線の制御点（中点から垂直方向に bend だけずらす）
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const cx = mx + (-(B.y - A.y) / len) * bend * 2;
    const cy = my + ((B.x - A.x) / len) * bend * 2;
    let prev = a;
    const n = pattern.length;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      const x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cx + t * t * B.x;
      const y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cy + t * t * B.y;
      const id = `${a}~${b}~${i}`;
      // 船の航路の途中のマスは、近いほうの地方に属する
      const region = t < 0.5 ? A.region : B.region;
      nodes.push({ id, kind: KIND_OF[pattern[i]], x: Math.round(x), y: Math.round(y), region });
      edges.push({ a: prev, b: id, sea });
      prev = id;
    }
    edges.push({ a: prev, b, sea });
  }
  return { nodes, edges };
}

const built = build();
export const NODES: MapNode[] = built.nodes;
export const EDGES: MapEdge[] = built.edges;
export const NODE: Record<string, MapNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));
export const STATION_IDS: string[] = STATIONS.map((s) => s.id);
export const START_STATION = 'nigiwai';
