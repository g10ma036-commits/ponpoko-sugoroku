// マップの動かない部分（海・島・道・飾り）。hooks を使わないので、静止画の確認にも使える。
import { memo } from 'react';
import { ISLANDS, LAKES, coastDistance, geo, onLand, routePath, routeSamples, smoothPath } from '../../data/japan';
import { EDGES, FERRY_DEFS, MAP_H, MAP_W, NODE, NODES, REGIONS, ferryRoute } from '../../data/map';
import type { MapNode } from '../../engine/types';
import { Ship } from './Squares';

/** 座標から決まる疑似乱数（飾りの配置用） */
function hash(n: number) {
  let x = Math.imul(n ^ 0x5bd1e995, 0x27d4eb2d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x165667b1);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

const landEdges = EDGES.filter((e) => !e.sea);
const seaEdges = EDGES.filter((e) => e.sea);
const islandPaths = ISLANDS.map((i) => ({ d: smoothPath(i.points), snowy: !!i.snowy }));
const lakePaths = LAKES.map(smoothPath);
/** フェリーの航路と、まん中に置く船の目印 */
const ferryLines = FERRY_DEFS.map(([a]) => {
  const pts = ferryRoute(a);
  const sm = routeSamples(pts, 16);
  const L = [0];
  for (let i = 1; i < sm.length; i++) L.push(L[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]));
  const half = L[L.length - 1] / 2;
  const k = Math.max(1, L.findIndex((v) => v >= half));
  return { d: routePath(pts), mid: sm[k], flip: sm[k][0] < sm[k - 1][0], land: sm.filter(([x, y]) => onLand(x, y)) };
});
const ferryLand = ferryLines.flatMap((f) => f.land);
/** 北海道（この高さより上）は雪景色 */
const SNOW_Y = geo(141, 41.3)[1];

function segDist(px: number, py: number, a: MapNode, b: MapNode) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/** 大きな雪山：本当の場所の近くで、道やマスからいちばん離れた陸の上に置く */
const findFuji = (): [number, number] => {
  const [fx, fy] = geo(138.73, 35.36);
  let best: [number, number] = [fx, fy];
  let bestScore = -Infinity;
  for (let dy = -160; dy <= 160; dy += 10) {
    for (let dx = -160; dx <= 160; dx += 10) {
      const x = fx + dx;
      const y = fy + dy;
      if (coastDistance(x, y) < 50) continue;
      const nodeGap = Math.min(...NODES.map((n) => Math.hypot(n.x - x, n.y - y) - (n.kind === 'station' ? 120 : 30)));
      const edgeGap = Math.min(...EDGES.map((e) => segDist(x, y, NODE[e.a], NODE[e.b])));
      const score = Math.min(nodeGap, edgeGap - 10) - Math.hypot(dx, dy) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }
  }
  return best;
};

/** 陸の上の、道やマスから離れたところに木や山や家を置く */
const findDecorations = (fuji: [number, number]) => {
  const FUJI = fuji;
  const out: { x: number; y: number; kind: 'tree' | 'mount' | 'house'; s: number }[] = [];
  const STEP = 64;
  let i = 0;
  for (let gy = 0; gy < MAP_H; gy += STEP) {
    for (let gx = 0; gx < MAP_W; gx += STEP) {
      i++;
      const x = gx + (hash(i * 5 + 1) - 0.5) * STEP * 0.8;
      const y = gy + (hash(i * 7 + 2) - 0.5) * STEP * 0.8;
      if (hash(i * 11 + 3) > 0.42) continue;
      if (coastDistance(x, y) < 28) continue;
      if (Math.hypot(x - FUJI[0], y - FUJI[1]) < 80) continue;
      if (NODES.some((n) => Math.hypot(n.x - x, n.y - y) < (n.kind === 'station' ? 80 : 46))) continue;
      if (EDGES.some((e) => segDist(x, y, NODE[e.a], NODE[e.b]) < 30)) continue;
      if (ferryLand.some(([fx, fy]) => Math.hypot(fx - x, fy - y) < 30)) continue;
      const k = hash(i * 29 + 11);
      out.push({ x, y, kind: k < 0.6 ? 'tree' : k < 0.88 ? 'mount' : 'house', s: 0.8 + hash(i * 31) * 0.4 });
    }
  }
  return out;
};

// 計算に少し時間がかかるので、はじめて描くときに一度だけ計算する
let cache: { fuji: [number, number]; decorations: ReturnType<typeof findDecorations> } | null = null;
function scenery() {
  if (!cache) {
    const fuji = findFuji();
    cache = { fuji, decorations: findDecorations(fuji) };
  }
  return cache;
}

function Deco({ x, y, kind, s, snowy }: { x: number; y: number; kind: string; s: number; snowy: boolean }) {
  if (kind === 'tree') {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <rect x={-3} y={4} width={6} height={10} fill="#8a5a3b" />
        <circle cx={0} cy={-2} r={12} fill={snowy ? '#e9f3f7' : '#5aa65a'} stroke="#3f7a43" strokeWidth={2} />
        <circle cx={-4} cy={-6} r={4} fill="#fff" opacity={0.35} />
      </g>
    );
  }
  if (kind === 'mount') {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M-22,14 L0,-18 L22,14 Z" fill="#8bb37a" stroke="#5b7f4f" strokeWidth={2} strokeLinejoin="round" />
        <path d="M-7,-8 L0,-18 L7,-8 L3,-5 L0,-8 L-3,-5 Z" fill="#fff" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-10} y={-4} width={20} height={16} fill="#fff4dc" stroke="#7a5a3a" strokeWidth={2} />
      <path d="M-14,-3 L0,-15 L14,-3 Z" fill="#d9644a" stroke="#7a5a3a" strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

/** 大きな雪山（ふじさんのような山） */
function BigMountain({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-62,34 L-14,-38 Q0,-50 14,-38 L62,34 Z" fill="#6f9fc4" stroke="#4a6f8f" strokeWidth={3} strokeLinejoin="round" />
      <path d="M-26,-20 L-14,-38 Q0,-50 14,-38 L26,-20 L16,-14 L8,-22 L0,-12 L-8,-22 L-16,-14 Z" fill="#fff" />
    </g>
  );
}

const seg = (a: MapNode, b: MapNode) => `M${a.x},${a.y} L${b.x},${b.y}`;
const landPath = landEdges.map((e) => seg(NODE[e.a], NODE[e.b])).join(' ');

export const MapLayer = memo(function MapLayer() {
  const { fuji, decorations } = scenery();
  return (
    <g>
      <defs>
        <pattern id="waves" width="80" height="40" patternUnits="userSpaceOnUse">
          <path d="M6,20 q8,-8 16,0 q8,8 16,0" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
          <path d="M46,38 q8,-8 16,0" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect x={-600} y={-600} width={MAP_W + 1200} height={MAP_H + 1200} fill="#7cc6e6" />
      <rect x={-600} y={-600} width={MAP_W + 1200} height={MAP_H + 1200} fill="url(#waves)" />

      {/* 島：砂浜のふち → 陸 */}
      <g strokeLinejoin="round">
        {islandPaths.map((p, i) => (
          <path key={`a${i}`} d={p.d} fill="#e9d39a" stroke="#e9d39a" strokeWidth={44} />
        ))}
        {islandPaths.map((p, i) => (
          <path key={`b${i}`} d={p.d} fill="#f4e3b2" stroke="#f4e3b2" strokeWidth={24} />
        ))}
        {islandPaths.map((p, i) => (
          <path key={`c${i}`} d={p.d} fill={p.snowy ? '#e6f1f2' : '#a9d98b'} />
        ))}
        {lakePaths.map((d, i) => (
          <path key={`l${i}`} d={d} fill="#7cc6e6" stroke="#f4e3b2" strokeWidth={10} />
        ))}
      </g>

      {decorations.map((d, i) => (
        <Deco key={i} {...d} snowy={d.y < SNOW_Y} />
      ))}
      <BigMountain x={fuji[0]} y={fuji[1]} />

      {/* 船の航路・橋 */}
      <g fill="none" strokeLinecap="round">
        {seaEdges.map((e, i) => (
          <path key={i} d={seg(NODE[e.a], NODE[e.b])} stroke="#ffffff" strokeWidth={8} strokeDasharray="4 16" />
        ))}
      </g>
      {/* フェリーの航路 */}
      <g fill="none" strokeLinecap="round">
        {ferryLines.map((f, i) => (
          <g key={i}>
            <path d={f.d} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={13} />
            <path d={f.d} stroke="#24467f" strokeWidth={5} strokeDasharray="16 12" />
          </g>
        ))}
      </g>
      {ferryLines.map((f, i) => (
        <Ship key={i} x={f.mid[0]} y={f.mid[1] - 4} scale={1.1} flip={f.flip} />
      ))}
      {/* 線路 */}
      <g fill="none" strokeLinecap="round">
        <path d={landPath} stroke="#7a5a3a" strokeWidth={14} />
        <path d={landPath} stroke="#d8b98a" strokeWidth={7} strokeDasharray="3 9" />
      </g>

      {/* 地方の名前 */}
      {(Object.keys(REGIONS) as (keyof typeof REGIONS)[]).map((r) => (
        <text key={r} x={REGIONS[r].lx} y={REGIONS[r].ly} className="region-label" fill={REGIONS[r].color} stroke="#fff" strokeWidth={9} paintOrder="stroke">
          {REGIONS[r].name}
        </text>
      ))}
    </g>
  );
});
