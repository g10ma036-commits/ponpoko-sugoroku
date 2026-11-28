// マスと駅。駅の下には物件の数だけ小さな家を並べ、買われた家は持ち主の色になる。
// 物件が買われると、駅に大きな家が にょきっと建ち、小さな家の場所へ すいこまれる。
// ひとりじめされた駅は、金色のふちと 持ち主の色の旗で目立たせる。
// 激アツ駅（6月のニュース速報の駅）は、うしろで炎が燃えて、駅名に「🔥激アツ」の札がつく。
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { NODE, NODES, REGIONS } from '../../data/map';
import { PROP, PROPS_BY_STATION } from '../../data/properties';
import { getLabels } from './labels';

export const SQUARE_STYLE: Record<string, { fill: string; label: string; name: string }> = {
  plus: { fill: '#3d8bdb', label: '＋', name: 'ふくマス' },
  minus: { fill: '#e0524a', label: '－', name: 'とほほマス' },
  card: { fill: '#f2b82e', label: '札', name: 'ふだマス' },
  shop: { fill: '#2fae86', label: '店', name: 'みせマス' },
  omikuji: { fill: '#b04fc4', label: '吉', name: 'おみくじマス' },
  ferry: { fill: '#24467f', label: '船', name: 'フェリーマス' },
};

/** フェリーの絵（へさきが右）。航路の目印と、乗っているときのアニメーションに使う */
export function Ship({ x = 0, y = 0, scale = 1, flip = false }: { x?: number; y?: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <rect x={1} y={-21} width={8} height={11} rx={1.5} fill="#e0524a" stroke="#24345a" strokeWidth={2.5} />
      <rect x={-15} y={-11} width={24} height={12} rx={2.5} fill="#ffffff" stroke="#24345a" strokeWidth={2.5} />
      <circle cx={-9} cy={-5} r={2.2} fill="#7cc6e6" />
      <circle cx={-2} cy={-5} r={2.2} fill="#7cc6e6" />
      <path d="M-25,1 L29,1 L19,15 L-20,15 Z" fill="#ffffff" stroke="#24345a" strokeWidth={3} strokeLinejoin="round" />
      <path d="M-22,8 L24,8" stroke="#3d8bdb" strokeWidth={3.5} />
    </g>
  );
}

interface Props {
  owner: Record<string, number>;
  colors: string[];
  destination: string;
  /** いま建っている最中の物件（小さな家を あとから にょきっと出す） */
  pops?: Pop[];
  /** 激アツ駅（ニュース速報の駅） */
  hot?: string;
}

const squares = NODES.filter((n) => n.kind !== 'station');
const stations = NODES.filter((n) => n.kind === 'station');

/** 目的地の旗の位置（札と反対側） */
const FLAG_AT = { below: 'translate(18 -30)', above: 'translate(30 10)', right: 'translate(-22 -30)', left: 'translate(18 -30)' };
/** ひとりじめの旗の位置と向き（目的地の旗・札とぶつからない側） */
const MONO_AT: Record<string, { x: number; y: number; dir: 1 | -1 }> = {
  below: { x: -18, y: -28, dir: -1 },
  above: { x: -32, y: 18, dir: -1 },
  right: { x: 22, y: -28, dir: 1 },
  left: { x: -18, y: -28, dir: -1 },
};

/** 炎（根もとが 0,0 で上へ のびる）と、その中の明るいところ */
const FLAME = 'M0,0 C-12,-1 -13,-15 -6,-25 C-5,-18 -1,-19 -1,-34 C6,-25 14,-17 11,-7 C10,-2 5,0 0,0 Z';
const FLAME_IN = 'M0,-2 C-6,-2 -7,-10 -3,-16 C-1,-11 2,-12 2,-19 C7,-12 7,-6 5,-3 C4,-2 2,-2 0,-2 Z';
/** 駅の箱のまわりの炎の位置（x, y, 向き, 大きさ） */
const FIRE: [number, number, number, number][] = [
  [-27, 10, -72, 1.15],
  [-24, -16, -38, 1.3],
  [-10, -24, -10, 1.45],
  [8, -24, 12, 1.55],
  [24, -16, 38, 1.3],
  [27, 10, 72, 1.15],
];

/** 激アツ駅のうしろで燃える炎 */
function HotFire() {
  return (
    <g pointerEvents="none">
      <circle r={56} className="hot-aura" fill="#ff7a2a" />
      {FIRE.map(([x, y, r, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
          <g className="flame" style={{ animationDelay: `${(i % 3) * 0.17}s` }}>
            <path d={FLAME} fill="#ff5a1f" stroke="#c2340c" strokeWidth={2} strokeLinejoin="round" />
            <path d={FLAME_IN} fill="#ffd23f" />
          </g>
        </g>
      ))}
    </g>
  );
}

/** 小さな家（物件1件ぶん） */
const HOUSE = 'M-6,5 L-6,-1 L0,-6.5 L6,-1 L6,5 Z';

export interface Pop {
  key: number;
  station: string;
  owner: number;
  /** 何番目の物件か（小さな家の場所） */
  slot: number;
  props: string[];
}

/** 新しく買われた物件を見つけて、建つ演出のリストを返す */
export function useBuildPops(owner: Record<string, number>): Pop[] {
  const [pops, setPops] = useState<Pop[]>([]);
  const prevOwner = useRef(owner);
  useEffect(() => {
    const before = prevOwner.current;
    prevOwner.current = owner;
    if (before === owner) return;
    const fresh = Object.keys(owner).filter((id) => before[id] !== owner[id]);
    if (fresh.length === 0) return;
    const byStation = new Map<string, string[]>();
    for (const id of fresh) {
      const st = PROP[id]?.station;
      if (st) byStation.set(st, [...(byStation.get(st) ?? []), id]);
    }
    const now = Date.now();
    const add: Pop[] = [...byStation].map(([station, ids], k) => ({
      key: now + k,
      station,
      owner: owner[ids[0]],
      slot: PROPS_BY_STATION[station].findIndex((p) => p.id === ids[0]),
      props: ids,
    }));
    setPops((ps) => [...ps, ...add]);
    window.setTimeout(() => setPops((ps) => ps.filter((x) => !add.includes(x))), 2600);
  }, [owner]);
  return pops;
}

export const Squares = memo(function Squares({ owner, colors, destination, pops = [], hot }: Props) {
  const growing = new Set(pops.flatMap((pp) => pp.props));

  return (
    <g>
      {squares.map((n) => {
        const st = SQUARE_STYLE[n.kind];
        return (
          <g key={n.id} data-node={n.id} className="tappable" transform={`translate(${n.x} ${n.y})`}>
            <circle r={21} fill="#4a3426" opacity={0.25} cy={3} />
            <circle r={20} fill={st.fill} stroke="#fff" strokeWidth={4} />
            <text className="sq-label" y={7.5}>
              {st.label}
            </text>
          </g>
        );
      })}
      {stations.map((n) => {
        const props = PROPS_BY_STATION[n.id];
        const isDest = n.id === destination;
        const label = n.name ?? '';
        const lp = getLabels()[n.id];
        const w = lp.w;
        const first = owner[props[0].id];
        const mono = first !== undefined && props.every((p) => owner[p.id] === first) ? first : undefined;
        const mf = MONO_AT[lp.side];
        const isHot = n.id === hot;
        return (
          <g key={n.id} data-node={n.id} className="tappable" transform={`translate(${n.x} ${n.y})`}>
            {isHot && <HotFire />}
            {isDest && (
              <circle r={44} className="dest-ring" fill="none" stroke="#ff5a5a" strokeWidth={6} />
            )}
            {mono !== undefined && <rect x={-33} y={-33} width={66} height={66} rx={19} fill="#ffe27a" stroke="#e0a800" strokeWidth={4} className="mono-glow" />}
            <rect x={-26} y={-23} width={52} height={52} rx={14} fill="#4a3426" opacity={0.25} />
            <rect data-st-core={n.id} x={-26} y={-26} width={52} height={52} rx={14} fill="#fffaf0" stroke={REGIONS[n.region].color} strokeWidth={6} />
            {/* 駅の建物マーク */}
            <path d="M-13,10 L-13,-3 L0,-13 L13,-3 L13,10 Z" fill={isDest ? '#ff6b6b' : '#f29a4a'} stroke="#4a3426" strokeWidth={2.5} strokeLinejoin="round" />
            <rect x={-4} y={1} width={8} height={9} fill="#fff" stroke="#4a3426" strokeWidth={2} />
            {/* 名前 */}
            <g transform={`translate(${lp.dx} ${lp.dy})`}>
              <rect x={-w / 2} y={-17} width={w} height={32} rx={16} fill={isDest ? '#ff5a5a' : '#ffffff'} stroke="#4a3426" strokeWidth={2.5} />
              <text className="st-label" y={7} fill={isDest ? '#fff' : '#4a3426'}>
                {label}
              </text>
              {/* 激アツ駅の札（駅名の左上に はる） */}
              {isHot && (
                <g transform={`translate(${-w / 2 + 24} -21) rotate(-8)`} className="hot-tag">
                  <rect x={-37} y={-13} width={74} height={25} rx={12.5} fill="#ff5a1f" stroke="#fff" strokeWidth={3} />
                  <text className="hot-tag-text" y={6}>
                    🔥激アツ
                  </text>
                </g>
              )}
            </g>
            {/* 物件の小さな家（白は まだだれも持っていない） */}
            <g transform={`translate(${-(props.length - 1) * 7} ${lp.dotsDy})`}>
              {props.map((p, i) => {
                const o = owner[p.id];
                return (
                  <g key={p.id} transform={`translate(${i * 14} 0)`}>
                    <path
                      d={HOUSE}
                      className={growing.has(p.id) ? 'slot-grow' : undefined}
                      fill={o === undefined ? '#ffffff' : colors[o]}
                      stroke="#4a3426"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
            {mono !== undefined && (
              <g transform={`translate(${mf.x} ${mf.y})`} className="mono-flag">
                <path d="M0,0 L0,-40" stroke="#4a3426" strokeWidth={3.5} strokeLinecap="round" />
                <path
                  d={`M0,-40 L${mf.dir * 28},-40 L${mf.dir * 21},-32 L${mf.dir * 28},-24 L0,-24 Z`}
                  fill={colors[mono]}
                  stroke="#4a3426"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                <circle cx={mf.dir * 11} cy={-32} r={4.5} fill="#ffe27a" stroke="#4a3426" strokeWidth={1.5} />
              </g>
            )}
            {isDest && (
              <g transform={FLAG_AT[lp.side]}>
                <g className="dest-flag">
                <path d="M0,0 L0,-46" stroke="#4a3426" strokeWidth={4} strokeLinecap="round" />
                <path d="M0,-46 L30,-38 L0,-28 Z" fill="#ff5a5a" stroke="#4a3426" strokeWidth={2.5} strokeLinejoin="round" />
                <ellipse cx={-10} cy={-18} rx={9} ry={11} fill="#ffcf5a" stroke="#4a3426" strokeWidth={2.5} />
                <path d="M-14,-18 L-6,-18" stroke="#e05a3a" strokeWidth={2} />
                </g>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});

/** 物件が建つ演出（コマより手前に出す）。大きな家が コマの頭の上に にょきっと建ち、駅の小さな家の場所へ すいこまれる */
export function BuildPops({ pops, colors }: { pops: Pop[]; colors: string[] }) {
  return (
    <g>
      {pops.map((pp) => {
        const n = NODE[pp.station];
        const lp = getLabels()[pp.station];
        const count = PROPS_BY_STATION[pp.station].length;
        const sx = -(count - 1) * 7 + pp.slot * 14;
        const c = colors[pp.owner] ?? '#f29a4a';
        return (
          <g key={pp.key} transform={`translate(${n.x} ${n.y})`} pointerEvents="none">
            <g transform="translate(0 -100)">
              <g className="build-spark">
                {Array.from({ length: 10 }, (_, i) => (
                  <path key={i} d="M0,-30 L0,-46" transform={`rotate(${i * 36})`} stroke={i % 2 ? '#ffd45a' : c} strokeWidth={5} strokeLinecap="round" />
                ))}
              </g>
            </g>
            <g className="build-pop" style={{ ['--tx' as string]: `${sx}px`, ['--ty' as string]: `${lp.dotsDy + 89}px` } as CSSProperties}>
              <g transform="translate(0 -100)">
                <path d="M-24,16 L-24,-6 L0,-26 L24,-6 L24,16 Z" fill={c} stroke="#4a3426" strokeWidth={4} strokeLinejoin="round" />
                <path d="M-29,-3 L0,-29 L29,-3" fill="none" stroke="#4a3426" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                <rect x={-7} y={2} width={14} height={14} rx={2} fill="#fff6dd" stroke="#4a3426" strokeWidth={3} />
                <rect x={-19} y={-4} width={9} height={8} rx={1.5} fill="#bfe6f7" stroke="#4a3426" strokeWidth={2.5} />
                <rect x={10} y={-4} width={9} height={8} rx={1.5} fill="#bfe6f7" stroke="#4a3426" strokeWidth={2.5} />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}
