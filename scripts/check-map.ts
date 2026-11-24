// マップの点検：駅やマスが海に落ちていないか、近すぎないか、駅名の札が重なっていないか、フェリーの航路が海の上か。
//   npx tsx scripts/check-map.ts
import { coastDistance, routeSamples } from '../src/data/japan';
import { EDGES, FERRY, FERRY_DEFS, MAP_H, MAP_W, NODE, NODES, STATION_IDS, ferryRoute } from '../src/data/map';
import { PROPS_BY_STATION } from '../src/data/properties';
import { dist } from '../src/engine/graph';
import { getLabels, labelBox } from '../src/ui/board/labels';
const LABELS = getLabels();

const problems: string[] = [];
const seaNodes = new Set<string>();
// 船の航路だけにつながっているマスは海の上でよい
for (const n of NODES) {
  if (n.kind === 'station') continue;
  const es = EDGES.filter((e) => e.a === n.id || e.b === n.id);
  if (es.every((e) => e.sea)) seaNodes.add(n.id);
}

// 1) 陸の上にあるか
for (const n of NODES) {
  if (seaNodes.has(n.id)) continue;
  const c = coastDistance(n.x, n.y);
  const need = n.kind === 'station' ? 30 : 24;
  if (c < need) problems.push(`海岸に近い/海の上: ${n.id} (${n.x},${n.y}) 海岸まで ${Math.round(c)}`);
}
// 陸の道が海を通っていないか
for (const e of EDGES) {
  if (e.sea) continue;
  const a = NODE[e.a];
  const b = NODE[e.b];
  for (let t = 0.1; t < 1; t += 0.2) {
    const c = coastDistance(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    if (c < 8) {
      problems.push(`道が海を通る: ${e.a} - ${e.b}`);
      break;
    }
  }
}

// 2) 近すぎないか
for (let i = 0; i < NODES.length; i++) {
  for (let j = i + 1; j < NODES.length; j++) {
    const a = NODES[i];
    const b = NODES[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const ss = a.kind === 'station' && b.kind === 'station';
    const one = a.kind === 'station' || b.kind === 'station';
    const need = ss ? 150 : one ? 54 : 46;
    if (d < need) problems.push(`近すぎ: ${a.id} - ${b.id} (${Math.round(d)})`);
  }
}
// 道の上のマスの間かく
for (const e of EDGES) {
  const d = Math.hypot(NODE[e.a].x - NODE[e.b].x, NODE[e.a].y - NODE[e.b].y);
  if (d < 46 || d > 115) problems.push(`マスの間かく: ${e.a} - ${e.b} (${Math.round(d)})`);
}

// 3) 駅名の札（labels.ts の置き方）が、ほかのマスや札に重ならないか
const stations = NODES.filter((n) => n.kind === 'station');
const boxes = stations.map((st) => ({ id: st.id, ...labelBox(st, LABELS[st.id]) }));
for (const b of boxes) {
  for (const n of NODES) {
    if (n.id === b.id) continue;
    const r = n.kind === 'station' ? 26 : 18;
    if (n.x + r > b.x0 && n.x - r < b.x1 && n.y + r > b.y0 && n.y - r < b.y1) problems.push(`駅名の札が重なる: ${b.id} の札(${LABELS[b.id].side}) と ${n.id}`);
  }
  for (const o of boxes) {
    if (o.id <= b.id) continue;
    if (o.x1 > b.x0 && o.x0 < b.x1 && o.y1 > b.y0 && o.y0 < b.y1) problems.push(`駅名の札どうしが重なる: ${b.id} と ${o.id}`);
  }
}

// 4) 物件
for (const id of STATION_IDS) if (!PROPS_BY_STATION[id]?.length) problems.push(`物件がない駅: ${id}`);

// 5) フェリー：乗り場はフェリーマス、航路は（乗り場から海岸までをのぞいて）海の上
const ferryInfo: string[] = [];
for (const [a, b] of FERRY_DEFS) {
  if (NODE[a]?.kind !== 'ferry' || NODE[b]?.kind !== 'ferry' || FERRY[a] !== b || FERRY[b] !== a) problems.push(`フェリーの乗り場がおかしい: ${a} ↔ ${b}`);
  const pts = ferryRoute(a);
  const head = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  const tail = Math.hypot(pts.at(-1)![0] - pts.at(-2)![0], pts.at(-1)![1] - pts.at(-2)![1]);
  const sm = routeSamples(pts, 30);
  let len = 0;
  sm.forEach(([x, y], i) => {
    if (i > 0) len += Math.hypot(x - sm[i - 1][0], y - sm[i - 1][1]);
    if (len < head + 10) return;
    const rest = sm.slice(i).reduce((acc, q, k, arr) => (k === 0 ? 0 : acc + Math.hypot(q[0] - arr[k - 1][0], q[1] - arr[k - 1][1])), 0);
    if (rest < tail + 10) return;
    if (coastDistance(x, y) > -8) problems.push(`フェリーの航路が陸に近い: ${a} ↔ ${b} (${Math.round(x)},${Math.round(y)})`);
  });
  ferryInfo.push(`${a} ↔ ${b} ${dist(a, b)}マス分`);
}

// ---- 結果
const kinds: Record<string, number> = {};
for (const n of NODES) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
let far = 0;
let sum = 0;
let pairs = 0;
for (const a of STATION_IDS)
  for (const b of STATION_IDS)
    if (a < b) {
      const d = dist(a, b);
      far = Math.max(far, d);
      sum += d;
      pairs++;
    }
const props = STATION_IDS.reduce((a, id) => a + (PROPS_BY_STATION[id]?.length ?? 0), 0);
console.log(`地図 ${MAP_W}x${MAP_H}  駅 ${STATION_IDS.length}  マス ${NODES.length - STATION_IDS.length}  物件 ${props}`);
console.log(`マスの種類 ${JSON.stringify(kinds)}`);
console.log(`フェリー ${ferryInfo.join(' / ')}`);
console.log(`駅どうしの距離 平均 ${(sum / pairs).toFixed(1)}  いちばん遠い ${far}`);
console.log(problems.length ? `問題 ${problems.length}件:\n${problems.join('\n')}` : '問題なし');
process.exitCode = problems.length ? 1 : 0;
