// マップの動かない部分（海・島・道・飾り）。hooks を使わないので、静止画の確認にも使える。
import { memo } from 'react';
import { EDGES, MAP_H, MAP_W, NODE, NODES, REGIONS } from '../../data/map';
import type { MapNode } from '../../engine/types';

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
const stations = NODES.filter((n) => n.kind === 'station');

/** 道に沿って、少し離れたところに木や山を置く */
const decorations = (() => {
  const out: { x: number; y: number; kind: 'tree' | 'mount' | 'house'; s: number }[] = [];
  landEdges.forEach((e, i) => {
    const a = NODE[e.a];
    const b = NODE[e.b];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const r = hash(i * 7 + 3);
    if (r < 0.55) return;
    const side = hash(i * 13 + 1) < 0.5 ? -1 : 1;
    const off = 44 + hash(i * 17 + 5) * 14;
    const t = 0.35 + hash(i * 3) * 0.3;
    const x = a.x + (b.x - a.x) * t + nx * off * side;
    const y = a.y + (b.y - a.y) * t + ny * off * side;
    // 駅やマスに近すぎるなら置かない
    if (NODES.some((n) => Math.hypot(n.x - x, n.y - y) < 40)) return;
    const k = hash(i * 29 + 11);
    out.push({ x, y, kind: k < 0.55 ? 'tree' : k < 0.8 ? 'mount' : 'house', s: 0.8 + hash(i * 31) * 0.4 });
  });
  return out;
})();

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

const seg = (a: MapNode, b: MapNode) => `M${a.x},${a.y} L${b.x},${b.y}`;
const landPath = landEdges.map((e) => seg(NODE[e.a], NODE[e.b])).join(' ');

export const MapLayer = memo(function MapLayer() {
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

      {/* 島：太い線を重ねて、まるい陸地にする */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={landPath} stroke="#e9d39a" strokeWidth={156} />
        {stations.map((n) => (
          <circle key={`s1${n.id}`} cx={n.x} cy={n.y} r={84} fill="#e9d39a" />
        ))}
        <path d={landPath} stroke="#f4e3b2" strokeWidth={140} />
        {stations.map((n) => (
          <circle key={`s2${n.id}`} cx={n.x} cy={n.y} r={76} fill="#f4e3b2" />
        ))}
        <path d={landPath} stroke="#a9d98b" strokeWidth={116} />
        {stations.map((n) => (
          <circle key={`s3${n.id}`} cx={n.x} cy={n.y} r={64} fill={n.region === 'yukimi' ? '#e6f1f2' : '#a9d98b'} />
        ))}
      </g>
      {/* ゆきみ島は雪景色 */}
      <path
        d={landEdges
          .filter((e) => NODE[e.a].region === 'yukimi' && NODE[e.b].region === 'yukimi')
          .map((e) => seg(NODE[e.a], NODE[e.b]))
          .join(' ')}
        stroke="#e6f1f2"
        strokeWidth={116}
        strokeLinecap="round"
        fill="none"
      />

      {decorations.map((d, i) => {
        const snowy = d.y < 470;
        return <Deco key={i} {...d} snowy={snowy} />;
      })}

      {/* 船の航路 */}
      <g fill="none" strokeLinecap="round">
        {seaEdges.map((e, i) => (
          <path key={i} d={seg(NODE[e.a], NODE[e.b])} stroke="#ffffff" strokeWidth={8} strokeDasharray="4 16" />
        ))}
      </g>
      {/* 線路 */}
      <g fill="none" strokeLinecap="round">
        <path d={landPath} stroke="#7a5a3a" strokeWidth={14} />
        <path d={landPath} stroke="#d8b98a" strokeWidth={7} strokeDasharray="3 9" />
      </g>

      {/* 地方の名前 */}
      {(Object.keys(REGIONS) as (keyof typeof REGIONS)[]).map((r) => (
        <text key={r} x={REGIONS[r].lx} y={REGIONS[r].ly} className="region-label" fill={REGIONS[r].color} stroke="#fff" strokeWidth={7} paintOrder="stroke">
          {REGIONS[r].name}
        </text>
      ))}
    </g>
  );
});
