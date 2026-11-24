// マスと駅。駅の下には物件の持ち主を色の点で表示する。
import { memo } from 'react';
import { NODES, REGIONS } from '../../data/map';
import { PROPS_BY_STATION } from '../../data/properties';
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
}

const squares = NODES.filter((n) => n.kind !== 'station');
const stations = NODES.filter((n) => n.kind === 'station');

/** 目的地の旗の位置（札と反対側） */
const FLAG_AT = { below: 'translate(18 -30)', above: 'translate(30 10)', right: 'translate(-22 -30)', left: 'translate(18 -30)' };

export const Squares = memo(function Squares({ owner, colors, destination }: Props) {
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
        return (
          <g key={n.id} data-node={n.id} className="tappable" transform={`translate(${n.x} ${n.y})`}>
            {isDest && (
              <circle r={44} className="dest-ring" fill="none" stroke="#ff5a5a" strokeWidth={6} />
            )}
            <rect x={-26} y={-23} width={52} height={52} rx={14} fill="#4a3426" opacity={0.25} />
            <rect x={-26} y={-26} width={52} height={52} rx={14} fill="#fffaf0" stroke={REGIONS[n.region].color} strokeWidth={6} />
            {/* 駅の建物マーク */}
            <path d="M-13,10 L-13,-3 L0,-13 L13,-3 L13,10 Z" fill={isDest ? '#ff6b6b' : '#f29a4a'} stroke="#4a3426" strokeWidth={2.5} strokeLinejoin="round" />
            <rect x={-4} y={1} width={8} height={9} fill="#fff" stroke="#4a3426" strokeWidth={2} />
            {/* 名前 */}
            <g transform={`translate(${lp.dx} ${lp.dy})`}>
              <rect x={-w / 2} y={-17} width={w} height={32} rx={16} fill={isDest ? '#ff5a5a' : '#ffffff'} stroke="#4a3426" strokeWidth={2.5} />
              <text className="st-label" y={7} fill={isDest ? '#fff' : '#4a3426'}>
                {label}
              </text>
            </g>
            {/* 持ち主の点 */}
            <g transform={`translate(${-(props.length - 1) * 7} ${lp.dotsDy})`}>
              {props.map((p, i) => {
                const o = owner[p.id];
                return <circle key={p.id} cx={i * 14} r={5.5} fill={o === undefined ? '#ffffff' : colors[o]} stroke="#4a3426" strokeWidth={2} />;
              })}
            </g>
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
