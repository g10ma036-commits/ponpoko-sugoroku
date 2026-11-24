// ぽんぽこ列島のマップ（日本列島の形）。駅の座標と、駅どうしをつなぐ道を書くと、
// あいだのマスは道の長さに合わせて自動で並ぶ。
// 座標は japan.ts の島の輪郭と同じ地図の座標（左上が 0,0）。
//   + ふくマス  - とほほマス  c ふだマス  s みせマス  o おみくじマス
// フェリーマスは FERRY_DEFS で、自動で並んだマスの中から選んで置く。

import type { MapEdge, MapNode, RegionId, SquareKind } from '../engine/types';
import { MAP_H, MAP_W } from './japan';

export { MAP_H, MAP_W };

/** lx, ly は地図上に地方名を書く位置（海の上） */
export const REGIONS: Record<RegionId, { name: string; color: string; lx: number; ly: number }> = {
  hokkaido: { name: '北海道', color: '#4a94d6', lx: 2440, ly: 380 },
  tohoku: { name: '東北', color: '#3f9a46', lx: 2420, ly: 1560 },
  kanto: { name: '関東', color: '#e5703f', lx: 2330, ly: 2950 },
  chubu: { name: '中部', color: '#8a63cf', lx: 1380, ly: 1960 },
  kinki: { name: '近畿', color: '#dd4f78', lx: 1640, ly: 3080 },
  chugoku: { name: '中国', color: '#22999a', lx: 640, ly: 2270 },
  shikoku: { name: '四国', color: '#cc9a00', lx: 880, ly: 3170 },
  kyushu: { name: '九州', color: '#bf5f2a', lx: 40, ly: 3240 },
  okinawa: { name: '沖縄', color: '#cf5aa6', lx: 560, ly: 3820 },
};

interface StationDef {
  id: string;
  name: string;
  x: number;
  y: number;
  region: RegionId;
}

const S = (id: string, name: string, x: number, y: number, region: RegionId): StationDef => ({ id, name, x, y, region });

export const STATIONS: StationDef[] = [
  // 北海道
  S('shirokuma', 'しろくま港', 2048, 278, 'hokkaido'),
  S('hotate', 'ほたて浜', 2363, 578, 'hokkaido'),
  S('lavender', 'ラベンダー丘', 2190, 680, 'hokkaido'),
  S('koori', 'こおり湖', 2650, 800, 'hokkaido'),
  S('bokujo', 'ぼくじょう平原', 2420, 930, 'hokkaido'),
  S('yukimatsuri', 'ゆきまつり町', 2010, 820, 'hokkaido'),
  S('asaichi', 'あさいち港', 1907, 1054, 'hokkaido'),
  // 東北
  S('ringo', 'りんご村', 1990, 1380, 'tohoku'),
  S('namahage', 'なまはげ岬', 1990, 1600, 'tohoku'),
  S('soba', 'そばの里', 2170, 1560, 'tohoku'),
  S('wakame', 'わかめ浜', 2260, 1780, 'tohoku'),
  S('sakuranbo', 'さくらんぼ村', 2020, 1850, 'tohoku'),
  S('tanabata', 'たなばた町', 2150, 2000, 'tohoku'),
  S('yukemuri', 'ゆけむり温泉', 2020, 2129, 'tohoku'),
  // 関東
  S('ichigo', 'いちご村', 2085, 2289, 'kanto'),
  S('natto', 'なっとう町', 2174, 2437, 'kanto'),
  S('daruma', 'だるま町', 1932, 2385, 'kanto'),
  S('nigiwai', 'にぎわい城下', 2061, 2567, 'kanto'),
  S('akarenga', 'あかれんが港', 1943, 2693, 'kanto'),
  S('nanohana', 'なのはな岬', 2170, 2730, 'kanto'),
  // 中部
  S('okome', 'おこめ町', 1849, 2100, 'chubu'),
  S('hoshizora', 'ほしぞら高原', 1750, 2350, 'chubu'),
  S('kinpaku', 'きんぱく町', 1461, 2250, 'chubu'),
  S('kyoryu', 'きょうりゅう谷', 1405, 2413, 'chubu'),
  S('gassho', 'がっしょう村', 1580, 2380, 'chubu'),
  S('karakuri', 'からくり町', 1635, 2668, 'chubu'),
  S('budou', 'ぶどう坂', 1855, 2540, 'chubu'),
  S('ocha', 'おちゃの郷', 1783, 2758, 'chubu'),
  // 近畿
  S('kagami', 'かがみ湖', 1505, 2554, 'kinki'),
  S('maiko', 'まいこ小路', 1301, 2549, 'kinki'),
  S('kuidaore', 'くいだおれ町', 1271, 2805, 'kinki'),
  S('haikara', 'ハイカラ港', 1140, 2611, 'kinki'),
  S('shika', 'しかの都', 1404, 2694, 'kinki'),
  S('umeboshi', 'うめぼし村', 1365, 2950, 'kinki'),
  S('shinju', 'しんじゅ島', 1512, 2829, 'kinki'),
  // 中国
  S('sakyu', 'さきゅう浜', 1028, 2475, 'chugoku'),
  S('masukatto', 'マスカット丘', 943, 2621, 'chugoku'),
  S('enmusubi', 'えんむすび町', 763, 2433, 'chugoku'),
  S('okonomi', 'おこのみ町', 775, 2638, 'chugoku'),
  S('natsumikan', 'なつみかん町', 616, 2570, 'chugoku'),
  S('fugu', 'ふぐ港', 468, 2657, 'chugoku'),
  // 四国
  S('udon', 'うどん町', 1008, 2766, 'shikoku'),
  S('mikan', 'みかん浜', 762, 2880, 'shikoku'),
  S('uzushio', 'うずしお岬', 1099, 2925, 'shikoku'),
  S('katsuo', 'かつお浜', 925, 2915, 'shikoku'),
  // 九州
  S('tonkotsu', 'とんこつ町', 388, 2811, 'kyushu'),
  S('castella', 'カステラ坂', 270, 2938, 'kyushu'),
  S('jigoku', 'じごく温泉', 537, 2897, 'kyushu'),
  S('hinokuni', 'ひのくに城', 469, 3055, 'kyushu'),
  S('yashi', 'やしの浜', 572, 3195, 'kyushu'),
  S('kemuri', 'けむり山', 439, 3305, 'kyushu'),
  // 沖縄
  S('satokibi', 'さとうきび村', 414, 3709, 'okinawa'),
  S('sango', 'さんご岬', 330, 3861, 'okinawa'),
];

/** [駅A, 駅B, 曲がり具合, 船の航路か, マスの並び（省略すると自動）] */
export type LinkDef = [string, string, number?, boolean?, string?];

export const LINKS: LinkDef[] = [
  // 北海道
  ['shirokuma', 'hotate'],
  ['shirokuma', 'lavender', 36],
  ['hotate', 'koori'],
  ['hotate', 'lavender'],
  ['lavender', 'yukimatsuri'],
  ['lavender', 'bokujo'],
  ['koori', 'bokujo'],
  ['yukimatsuri', 'asaichi', 80],
  // 北海道 → 東北（船）
  ['asaichi', 'ringo', 0, true],
  // 東北
  ['ringo', 'namahage'],
  ['ringo', 'soba'],
  ['namahage', 'soba'],
  ['namahage', 'sakuranbo'],
  ['soba', 'wakame'],
  ['wakame', 'tanabata'],
  ['sakuranbo', 'tanabata'],
  ['sakuranbo', 'okome'],
  ['tanabata', 'yukemuri'],
  ['yukemuri', 'okome'],
  ['yukemuri', 'ichigo'],
  ['tanabata', 'natto'],
  // 関東
  ['ichigo', 'daruma'],
  ['ichigo', 'nigiwai'],
  ['natto', 'nigiwai', -12],
  ['daruma', 'nigiwai', 12],
  ['daruma', 'hoshizora'],
  ['nigiwai', 'akarenga'],
  ['nigiwai', 'nanohana', -50, false, '+c'],
  ['akarenga', 'nanohana', 0, true],
  ['nigiwai', 'budou', -12],
  ['akarenga', 'ocha'],
  // 中部
  ['okome', 'hoshizora', -50],
  ['okome', 'kinpaku', -80],
  ['hoshizora', 'gassho'],
  ['hoshizora', 'budou'],
  ['kinpaku', 'gassho', 12],
  ['kinpaku', 'kyoryu'],
  ['gassho', 'karakuri'],
  ['budou', 'ocha'],
  ['karakuri', 'ocha'],
  // 近畿
  ['karakuri', 'kagami', -12],
  ['kyoryu', 'kagami', -50],
  ['kagami', 'maiko', 65],
  ['maiko', 'kuidaore'],
  ['maiko', 'haikara'],
  ['kuidaore', 'shika'],
  ['kuidaore', 'umeboshi'],
  ['shika', 'shinju'],
  ['umeboshi', 'shinju', -12],
  // 近畿 → 中国・四国
  ['haikara', 'sakyu'],
  ['haikara', 'masukatto'],
  ['haikara', 'uzushio', -40, true, 'c+o'],
  // 中国
  ['masukatto', 'okonomi'],
  ['masukatto', 'sakyu'],
  ['sakyu', 'enmusubi'],
  ['enmusubi', 'natsumikan'],
  ['enmusubi', 'okonomi'],
  ['natsumikan', 'fugu', 12],
  ['okonomi', 'fugu'],
  // 中国 → 四国・九州（橋・船）
  ['masukatto', 'udon', 0, true],
  ['okonomi', 'mikan', 0, true],
  ['fugu', 'tonkotsu', 0, true],
  // 四国
  ['udon', 'mikan', -24],
  ['udon', 'uzushio'],
  ['mikan', 'katsuo', 36],
  ['uzushio', 'katsuo'],
  // 四国 → 九州（船）
  ['mikan', 'jigoku', 0, true],
  // 九州
  ['tonkotsu', 'castella', 12],
  ['tonkotsu', 'jigoku'],
  ['castella', 'hinokuni', -65],
  ['jigoku', 'yashi'],
  ['hinokuni', 'kemuri'],
  ['yashi', 'kemuri'],
  // 九州 → 沖縄（船）
  ['kemuri', 'satokibi', 0, true],
  // 沖縄
  ['satokibi', 'sango'],
];

const KIND_OF: Record<string, SquareKind> = {
  '+': 'plus',
  '-': 'minus',
  c: 'card',
  s: 'shop',
  o: 'omikuji',
};

/** マスの種類を決める袋（よく混ぜて順に取り出す）。ふく8：とほほ4：ふだ4：みせ2：おみくじ2 */
const BAG = '++++++++----ccccssoo';

/** 座標から決まる疑似乱数 */
function hash(n: number) {
  let x = Math.imul(n ^ 0x2c1b3c6d, 0x297a2d39);
  x ^= x >>> 15;
  x = Math.imul(x, 0x6c8e9cf5);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

function makeBag(round: number): string[] {
  const b = BAG.split('');
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(hash(round * 131 + i) * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** 道の長さから、あいだに置くマスの数を決める（1マスの間かくは70くらい） */
export const SPACING = 70;

function build(): { nodes: MapNode[]; edges: MapEdge[] } {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const byId = new Map<string, StationDef>();
  for (const s of STATIONS) {
    if (byId.has(s.id)) throw new Error(`duplicate station ${s.id}`);
    byId.set(s.id, s);
    nodes.push({ id: s.id, kind: 'station', x: s.x, y: s.y, region: s.region, name: s.name });
  }
  let bag: string[] = [];
  let round = 0;
  const draw = (prev: string | undefined): string => {
    for (let tries = 0; tries < 30; tries++) {
      if (bag.length === 0) bag = makeBag(round++);
      const k = bag.pop()!;
      // みせ・おみくじ・とほほが続かないようにする
      if (k !== '+' && k === prev && tries < 20) {
        bag.unshift(k);
        continue;
      }
      return k;
    }
    return '+';
  };
  for (const [a, b, bend = 0, sea = false, fixed] of LINKS) {
    const A = byId.get(a);
    const B = byId.get(b);
    if (!A || !B) throw new Error(`unknown station in link ${a}-${b}`);
    // 二次ベジェ曲線の制御点（中点から垂直方向に bend だけずらす）
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const cx = mx + (-(B.y - A.y) / len) * bend * 2;
    const cy = my + ((B.x - A.x) / len) * bend * 2;
    const curve = len + Math.abs(bend) * 1.2;
    const n = fixed ? fixed.length : Math.max(1, Math.round(curve / SPACING) - 1);
    let prev = a;
    let prevKind: string | undefined;
    for (let i = 0; i < n; i++) {
      // 駅の箱は大きいので、駅のとなりのマスは少しだけ離す
      const t = (i + 1.25) / (n + 1.5);
      const x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cx + t * t * B.x;
      const y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cy + t * t * B.y;
      const id = `${a}~${b}~${i}`;
      const k = fixed ? fixed[i] : draw(prevKind);
      prevKind = k;
      // 道の途中のマスは、近いほうの地方に属する
      const region = t < 0.5 ? A.region : B.region;
      nodes.push({ id, kind: KIND_OF[k], x: Math.round(x), y: Math.round(y), region });
      edges.push({ a: prev, b: id, sea });
      prev = id;
    }
    edges.push({ a: prev, b, sea });
  }
  return { nodes, edges };
}

/**
 * フェリー：乗り場のマスに止まると、相手の乗り場まで一気に行ける（乗るかどうかは選べる）。
 * [乗り場のマスA, 乗り場のマスB, あいだの海の上の通り道（A から B の順）]
 */
export const FERRY_DEFS: [string, string, [number, number][]][] = [
  // 北海道（東）↔ 関東：太平洋まわり
  ['koori~bokujo~1', 'natto~nigiwai~0', [[2600, 950], [2640, 1080], [2560, 1350], [2440, 1650], [2420, 1900], [2360, 2200], [2300, 2420], [2218, 2491]]],
  // 北海道（西）↔ 中部（北陸）：日本海まわり
  ['shirokuma~lavender~1', 'okome~kinpaku~5', [[2031, 427], [1940, 480], [1740, 720], [1680, 1000], [1760, 1300], [1800, 1600], [1820, 1880], [1790, 2000], [1700, 2090], [1590, 2160], [1535, 2225]]],
  // 近畿（紀伊）↔ 九州（東）
  ['kuidaore~umeboshi~0', 'jigoku~yashi~2', [[1275, 2914], [1220, 2990], [1150, 3120], [1000, 3230], [820, 3260], [715, 3195], [655, 3118]]],
  // 中部（東海）↔ 沖縄
  ['akarenga~ocha~0', 'kemuri~satokibi~4', [[1887, 2742], [1895, 2800], [1900, 2880], [1870, 2990], [1600, 3250], [1100, 3420], [750, 3560], [560, 3610]]],
];

const built = build();
for (const [a, b] of FERRY_DEFS) {
  for (const id of [a, b]) {
    const n = built.nodes.find((x) => x.id === id);
    if (!n || n.kind === 'station') throw new Error(`フェリーの乗り場 ${id} が見つからない`);
    n.kind = 'ferry';
  }
}
export const NODES: MapNode[] = built.nodes;
export const EDGES: MapEdge[] = built.edges;
export const NODE: Record<string, MapNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));
export const STATION_IDS: string[] = STATIONS.map((s) => s.id);
export const START_STATION = 'nigiwai';

/** フェリーの乗り場 → 相手の乗り場 */
export const FERRY: Record<string, string> = Object.fromEntries(FERRY_DEFS.flatMap(([a, b]) => [[a, b], [b, a]]));

/** 航路の点（乗り場のマスから、相手の乗り場のマスまで） */
export function ferryRoute(from: string): [number, number][] {
  const def = FERRY_DEFS.find(([a, b]) => a === from || b === from);
  if (!def) return [];
  const [a, b, via] = def;
  const pts: [number, number][] = [[NODE[a].x, NODE[a].y], ...via, [NODE[b].x, NODE[b].y]];
  return a === from ? pts : pts.reverse();
}
