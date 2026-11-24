// オリジナルの動物マスコット（すべてコードで描いたSVG）。
// 共通の決まり：二頭身・丸い輪郭・太めの線・ほっぺの赤み。viewBox は全員そろえる。
import type { ReactElement } from 'react';
import type { Expr, SpeakerId } from '../engine/types';

const OUT = '#4a3426';
const SW = 3;
export const VIEWBOX = '0 -12 120 134';

interface FaceProps {
  expr: Expr;
  y?: number;
  dx?: number;
  mouthY?: number;
  /** 目のまわりが暗い色のキャラは白目を描く */
  whites?: boolean;
  blush?: boolean;
  mouth?: boolean;
}

function Face({ expr, y = 57, dx = 14, mouthY = 71, whites = false, blush = true, mouth = true }: FaceProps) {
  const eyes = [60 - dx, 60 + dx];
  const eyeColor = '#2b1d14';
  return (
    <g>
      {blush && (
        <>
          <ellipse cx={60 - dx - 10} cy={y + 10} rx={6.5} ry={3.8} fill="#ff8f8f" opacity={0.55} />
          <ellipse cx={60 + dx + 10} cy={y + 10} rx={6.5} ry={3.8} fill="#ff8f8f" opacity={0.55} />
        </>
      )}
      {eyes.map((x, i) => {
        if (expr === 'happy') {
          return (
            <g key={i}>
              {whites && <ellipse cx={x} cy={y} rx={6.5} ry={5.5} fill="#fff" />}
              <path d={`M${x - 5},${y + 2} Q${x},${y - 5} ${x + 5},${y + 2}`} stroke={eyeColor} strokeWidth={3.2} fill="none" strokeLinecap="round" />
            </g>
          );
        }
        if (expr === 'sad') {
          const dir = i === 0 ? 1 : -1;
          return (
            <g key={i}>
              {whites && <ellipse cx={x} cy={y} rx={6.5} ry={6.5} fill="#fff" />}
              <ellipse cx={x} cy={y + 1} rx={3.6} ry={4.2} fill={eyeColor} />
              <path d={`M${x - 6},${y - 8 + dir * 2} L${x + 6},${y - 8 - dir * 2}`} stroke={eyeColor} strokeWidth={2.4} strokeLinecap="round" />
            </g>
          );
        }
        return (
          <g key={i}>
            {whites && <ellipse cx={x} cy={y} rx={6.8} ry={7.2} fill="#fff" />}
            <ellipse cx={x} cy={y} rx={4.4} ry={5.6} fill={eyeColor} />
            <circle cx={x + 1.6} cy={y - 2.2} r={1.8} fill="#fff" />
          </g>
        );
      })}
      {expr === 'sad' && <path d={`M${60 + dx + 6},${y + 3} q-2.5,4.5 0,6.5 q2.5,-2 0,-6.5z`} fill="#6ec3f4" />}
      {mouth && expr === 'happy' && (
        <path d={`M${53},${mouthY - 1} Q60,${mouthY + 11} ${67},${mouthY - 1} Z`} fill="#d9534f" stroke={OUT} strokeWidth={2} strokeLinejoin="round" />
      )}
      {mouth && expr === 'normal' && (
        <path d={`M53.5,${mouthY} Q56.8,${mouthY + 4} 60,${mouthY} Q63.2,${mouthY + 4} 66.5,${mouthY}`} stroke={OUT} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      )}
      {mouth && expr === 'sad' && (
        <path d={`M54,${mouthY + 4} Q60,${mouthY - 1} 66,${mouthY + 4}`} stroke={OUT} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

/** 胴体・手・足（色だけ変える） */
function Body({ fur, belly, feet }: { fur: string; belly?: string; feet?: string }) {
  return (
    <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
      <ellipse cx={47} cy={114} rx={9.5} ry={5.5} fill={feet ?? fur} />
      <ellipse cx={73} cy={114} rx={9.5} ry={5.5} fill={feet ?? fur} />
      <ellipse cx={60} cy={97} rx={25} ry={18} fill={fur} />
      {belly && <ellipse cx={60} cy={101} rx={14} ry={10.5} fill={belly} stroke="none" />}
      <ellipse cx={36} cy={93} rx={7} ry={10} fill={fur} transform="rotate(35 36 93)" />
      <ellipse cx={84} cy={93} rx={7} ry={10} fill={fur} transform="rotate(-35 84 93)" />
    </g>
  );
}

// ---------------------------------------------------------------- ポコ太（たぬき・車掌さん）
function Pokota({ expr }: { expr: Expr }) {
  const fur = '#c98a4b';
  const dark = '#6e4a2f';
  const light = '#f6e0bb';
  return (
    <g>
      {/* しましまのしっぽ */}
      <g transform="rotate(38 98 92)" stroke={OUT} strokeWidth={SW}>
        <ellipse cx={98} cy={92} rx={11} ry={19} fill={fur} />
        <path d="M88,86 Q98,90 108,86" stroke={dark} strokeWidth={5} fill="none" />
        <path d="M88,97 Q98,101 108,97" stroke={dark} strokeWidth={5} fill="none" />
      </g>
      <Body fur={fur} belly={light} feet={dark} />
      {/* 耳 */}
      <g stroke={OUT} strokeWidth={SW}>
        <circle cx={27} cy={34} r={11} fill={fur} />
        <circle cx={93} cy={34} r={11} fill={fur} />
      </g>
      <circle cx={27} cy={34} r={5.5} fill={dark} />
      <circle cx={93} cy={34} r={5.5} fill={dark} />
      <ellipse cx={60} cy={57} rx={38} ry={33} fill={fur} stroke={OUT} strokeWidth={SW} />
      {/* 目のまわりの模様 */}
      <ellipse cx={45} cy={59} rx={12} ry={9.5} fill={dark} transform="rotate(-18 45 59)" />
      <ellipse cx={75} cy={59} rx={12} ry={9.5} fill={dark} transform="rotate(18 75 59)" />
      <ellipse cx={60} cy={72} rx={13} ry={9} fill={light} />
      <ellipse cx={60} cy={67} rx={4.5} ry={3.2} fill={OUT} />
      <Face expr={expr} y={58} dx={15} mouthY={73} whites blush />
      {/* 車掌さんの帽子 */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M30,38 Q31,14 60,12 Q89,14 90,38 Z" fill="#33508a" />
        <path d="M27,39 Q60,30 93,39 Q93,46 60,45 Q27,46 27,39 Z" fill="#22365e" />
      </g>
      <circle cx={60} cy={26} r={7} fill="#f6c343" stroke={OUT} strokeWidth={2} />
      {/* 帽子のマークは葉っぱ */}
      <path d="M60,21 Q65,25 60,31 Q55,25 60,21 Z" fill="#5aa04a" />
    </g>
  );
}

// ---------------------------------------------------------------- ミケ子（みけねこ・商人）
function Mikeko({ expr }: { expr: Expr }) {
  const white = '#fffaf2';
  const orange = '#f2994a';
  const black = '#3d3232';
  return (
    <g>
      <path d="M80,106 Q106,106 102,84 Q100,72 109,66" stroke={OUT} strokeWidth={11} fill="none" strokeLinecap="round" />
      <path d="M80,106 Q106,106 102,84 Q100,72 109,66" stroke={orange} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Body fur={white} />
      {/* 前かけ */}
      <path d="M44,86 L76,86 L72,108 Q60,112 48,108 Z" fill="#d94b4b" stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={60} cy={97} r={5} fill="#f6c343" stroke={OUT} strokeWidth={1.8} />
      {/* 耳 */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M26,44 L29,12 L54,28 Z" fill={orange} />
        <path d="M94,44 L91,12 L66,28 Z" fill={black} />
      </g>
      <path d="M31,36 L32,20 L45,29 Z" fill="#ffb3c0" />
      <path d="M89,36 L88,20 L75,29 Z" fill="#ffb3c0" />
      <ellipse cx={60} cy={58} rx={38} ry={32} fill={white} stroke={OUT} strokeWidth={SW} />
      {/* みけ模様 */}
      <path d="M24,52 Q26,30 50,27 Q50,44 38,52 Q30,58 24,52 Z" fill={orange} />
      <path d="M96,50 Q95,30 74,27 Q76,40 86,46 Q92,50 96,50 Z" fill={black} />
      <ellipse cx={60} cy={58} rx={38} ry={32} fill="none" stroke={OUT} strokeWidth={SW} />
      <path d="M57,66 L63,66 L60,69.5 Z" fill="#ff8aa0" stroke={OUT} strokeWidth={1.4} strokeLinejoin="round" />
      <g stroke={OUT} strokeWidth={1.6} strokeLinecap="round">
        <path d="M30,66 L18,64" />
        <path d="M30,70 L18,72" />
        <path d="M90,66 L102,64" />
        <path d="M90,70 L102,72" />
      </g>
      <Face expr={expr} y={57} dx={15} mouthY={70} />
      {/* リボン */}
      <g transform="translate(78 26) rotate(18)" stroke={OUT} strokeWidth={2.2} strokeLinejoin="round">
        <path d="M0,0 L-12,-7 L-12,7 Z" fill="#e8546b" />
        <path d="M0,0 L12,-7 L12,7 Z" fill="#e8546b" />
        <circle r={3.5} fill="#ff7d92" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- シバまる（しばいぬ）
function Shibamaru({ expr }: { expr: Expr }) {
  const fur = '#e3a04a';
  const cream = '#fff3dc';
  return (
    <g>
      {/* くるんとしたしっぽ */}
      <circle cx={97} cy={86} r={11} fill={fur} stroke={OUT} strokeWidth={SW} />
      <circle cx={97} cy={86} r={4.5} fill={cream} stroke={OUT} strokeWidth={2} />
      <Body fur={fur} belly={cream} feet={cream} />
      {/* バンダナ */}
      <path d="M40,82 Q60,90 80,82 L60,104 Z" fill="#3f8fd8" stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={54} cy={88} r={1.8} fill="#fff" />
      <circle cx={65} cy={88} r={1.8} fill="#fff" />
      <circle cx={60} cy={95} r={1.8} fill="#fff" />
      {/* 耳 */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M26,46 Q24,22 34,12 Q46,20 52,30 Z" fill={fur} />
        <path d="M94,46 Q96,22 86,12 Q74,20 68,30 Z" fill={fur} />
      </g>
      <path d="M32,38 Q32,26 36,20 Q42,25 45,31 Z" fill={cream} />
      <path d="M88,38 Q88,26 84,20 Q78,25 75,31 Z" fill={cream} />
      <ellipse cx={60} cy={58} rx={38} ry={32} fill={fur} stroke={OUT} strokeWidth={SW} />
      {/* 白いほっぺとマズル */}
      <path d="M24,62 Q30,84 60,86 Q90,84 96,62 Q86,70 74,66 Q66,62 60,64 Q54,62 46,66 Q34,70 24,62 Z" fill={cream} />
      <ellipse cx={60} cy={58} rx={38} ry={32} fill="none" stroke={OUT} strokeWidth={SW} />
      {/* まろまゆ */}
      <ellipse cx={45} cy={45} rx={4.5} ry={3} fill={cream} />
      <ellipse cx={75} cy={45} rx={4.5} ry={3} fill={cream} />
      <ellipse cx={60} cy={66} rx={5} ry={3.5} fill={OUT} />
      <Face expr={expr} y={56} dx={15} mouthY={72} />
    </g>
  );
}

// ---------------------------------------------------------------- ペン吉（ペンギン）
function Penkichi({ expr }: { expr: Expr }) {
  const navy = '#34477a';
  return (
    <g>
      <Body fur={navy} belly="#ffffff" feet="#f59b2f" />
      <ellipse cx={60} cy={58} rx={37} ry={33} fill={navy} stroke={OUT} strokeWidth={SW} />
      {/* 白い顔 */}
      <ellipse cx={47} cy={62} rx={16} ry={18} fill="#fff" />
      <ellipse cx={73} cy={62} rx={16} ry={18} fill="#fff" />
      <path d="M53,68 L67,68 L60,76 Z" fill="#f59b2f" stroke={OUT} strokeWidth={2.2} strokeLinejoin="round" />
      <Face expr={expr} y={59} dx={13} mouthY={78} mouth={expr === 'happy'} />
      {/* ニット帽 */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M27,40 Q28,12 60,10 Q92,12 93,40 Z" fill="#e2504c" />
        <rect x={25} y={34} width={70} height={10} rx={5} fill="#fff4e6" />
        <circle cx={60} cy={7} r={7} fill="#fff4e6" />
      </g>
      <path d="M44,16 L44,32 M60,13 L60,32 M76,16 L76,32" stroke="#c23b38" strokeWidth={2} />
    </g>
  );
}

// ---------------------------------------------------------------- うさみ（うさぎ）
function Usami({ expr }: { expr: Expr }) {
  const fur = '#fff6f8';
  const pink = '#ffb3c8';
  return (
    <g>
      <Body fur={fur} belly="#ffe6ee" />
      {/* 長い耳 */}
      <g stroke={OUT} strokeWidth={SW}>
        <ellipse cx={44} cy={17} rx={10} ry={24} fill={fur} transform="rotate(-12 44 17)" />
        <ellipse cx={77} cy={17} rx={10} ry={24} fill={fur} transform="rotate(14 77 17)" />
      </g>
      <ellipse cx={44} cy={19} rx={5} ry={16} fill={pink} transform="rotate(-12 44 19)" />
      <ellipse cx={77} cy={19} rx={5} ry={16} fill={pink} transform="rotate(14 77 19)" />
      <ellipse cx={60} cy={60} rx={37} ry={31} fill={fur} stroke={OUT} strokeWidth={SW} />
      <ellipse cx={60} cy={68} rx={3.5} ry={2.6} fill="#ff7d9c" />
      <Face expr={expr} y={59} dx={15} mouthY={72} />
      {/* 耳のリボン */}
      <g transform="translate(84 32) rotate(14)" stroke={OUT} strokeWidth={2.2} strokeLinejoin="round">
        <path d="M0,0 L-11,-7 L-11,7 Z" fill="#a46bd6" />
        <path d="M0,0 L11,-7 L11,7 Z" fill="#a46bd6" />
        <circle r={3.4} fill="#c79bf0" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- コンコ（きつね）
function Konko({ expr }: { expr: Expr }) {
  const fur = '#ec7a3c';
  const white = '#fff7ea';
  return (
    <g>
      {/* ふさふさのしっぽ */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M78,104 Q112,104 110,70 Q108,58 100,54 Q96,70 84,80 Q76,88 78,104 Z" fill={fur} />
      </g>
      <path d="M100,54 Q110,58 110,70 Q104,66 98,64 Q99,58 100,54 Z" fill={white} />
      <Body fur={fur} belly={white} feet="#5a3a2a" />
      {/* 赤い前かけ */}
      <path d="M42,84 Q60,92 78,84 L68,104 Q60,108 52,104 Z" fill="#d93c3c" stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />
      {/* 耳 */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M24,48 L28,8 L54,30 Z" fill={fur} />
        <path d="M96,48 L92,8 L66,30 Z" fill={fur} />
      </g>
      <path d="M28,8 L27.5,18 L35,15 Z" fill="#5a3a2a" />
      <path d="M92,8 L92.5,18 L85,15 Z" fill="#5a3a2a" />
      <path d="M31,38 L33,22 L44,31 Z" fill={white} />
      <path d="M89,38 L87,22 L76,31 Z" fill={white} />
      <ellipse cx={60} cy={58} rx={38} ry={32} fill={fur} stroke={OUT} strokeWidth={SW} />
      <path d="M22,60 Q34,62 46,68 Q54,64 60,64 Q66,64 74,68 Q86,62 98,60 Q92,86 60,88 Q28,86 22,60 Z" fill={white} />
      <ellipse cx={60} cy={58} rx={38} ry={32} fill="none" stroke={OUT} strokeWidth={SW} />
      <ellipse cx={60} cy={67} rx={4.2} ry={3} fill={OUT} />
      <Face expr={expr} y={55} dx={15} mouthY={72} />
    </g>
  );
}

// ---------------------------------------------------------------- ホー博士（ふくろう・司会）
function Hoo({ expr }: { expr: Expr }) {
  const fur = '#9a7656';
  const face = '#f3e2c7';
  return (
    <g>
      <ellipse cx={47} cy={114} rx={8} ry={5} fill="#f2a43a" stroke={OUT} strokeWidth={SW} />
      <ellipse cx={73} cy={114} rx={8} ry={5} fill="#f2a43a" stroke={OUT} strokeWidth={SW} />
      <ellipse cx={60} cy={76} rx={40} ry={40} fill={fur} stroke={OUT} strokeWidth={SW} />
      <ellipse cx={60} cy={95} rx={22} ry={17} fill={face} />
      <path d="M50,90 q3,3 6,0 M64,90 q3,3 6,0 M57,99 q3,3 6,0" stroke="#c9a77f" strokeWidth={2} fill="none" />
      {/* 羽 */}
      <path d="M22,70 Q14,92 30,106 Q32,86 26,70 Z" fill="#7d5d41" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M98,70 Q106,92 90,106 Q88,86 94,70 Z" fill="#7d5d41" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      {/* 耳羽 */}
      <path d="M28,44 L26,26 L42,38 Z M92,44 L94,26 L78,38 Z" fill={fur} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={46} cy={60} r={14} fill={face} />
      <circle cx={74} cy={60} r={14} fill={face} />
      <Face expr={expr} y={60} dx={14} mouth={false} blush />
      {/* めがね */}
      <g stroke={OUT} strokeWidth={2.4} fill="none">
        <circle cx={46} cy={60} r={10} />
        <circle cx={74} cy={60} r={10} />
        <path d="M56,59 Q60,56 64,59" />
      </g>
      <path d="M55,70 L65,70 L60,79 Z" fill="#f2a43a" stroke={OUT} strokeWidth={2} strokeLinejoin="round" />
      {/* 博士帽 */}
      <g stroke={OUT} strokeWidth={SW} strokeLinejoin="round">
        <path d="M40,38 L40,30 Q60,24 80,30 L80,38 Q60,33 40,38 Z" fill="#2e2a33" />
        <path d="M60,12 L96,24 L60,34 L24,24 Z" fill="#3b3640" />
      </g>
      <path d="M60,23 L88,30 L88,44" stroke="#f6c343" strokeWidth={2.4} fill="none" />
      <circle cx={88} cy={46} r={3} fill="#f6c343" />
    </g>
  );
}

// ---------------------------------------------------------------- くもすけ（いたずら雨雲）
function Kumo({ expr }: { expr: Expr }) {
  const fill = '#cfd8e6';
  const puffs: [number, number, number][] = [
    [34, 66, 20],
    [52, 48, 22],
    [76, 46, 22],
    [92, 64, 19],
    [62, 74, 24],
  ];
  return (
    <g>
      {/* 雨つぶ */}
      {[
        [40, 100],
        [60, 110],
        [82, 100],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x},${y} q-5,8 0,11 q5,-3 0,-11z`} fill="#6ec3f4" stroke={OUT} strokeWidth={1.8} />
      ))}
      {puffs.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r} fill={OUT} stroke={OUT} strokeWidth={SW * 2} />
      ))}
      {puffs.map(([x, y, r], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r={r} fill={fill} />
      ))}
      <ellipse cx={46} cy={50} rx={8} ry={5} fill="#fff" opacity={0.6} />
      {/* いたずらっぽい顔 */}
      {expr === 'sad' ? (
        <g>
          <path d="M42,56 L54,60 M78,56 L66,60" stroke={OUT} strokeWidth={2.6} strokeLinecap="round" />
          <ellipse cx={49} cy={66} rx={3.6} ry={4.2} fill="#2b1d14" />
          <ellipse cx={71} cy={66} rx={3.6} ry={4.2} fill="#2b1d14" />
          <path d="M53,81 Q60,76 67,81" stroke={OUT} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <path d="M41,55 L54,58 M79,55 L66,58" stroke={OUT} strokeWidth={2.6} strokeLinecap="round" />
          {expr === 'happy' ? (
            <>
              <path d="M44,66 Q49,61 54,66" stroke="#2b1d14" strokeWidth={3} fill="none" strokeLinecap="round" />
              <path d="M66,66 Q71,61 76,66" stroke="#2b1d14" strokeWidth={3} fill="none" strokeLinecap="round" />
              <path d="M50,74 Q60,88 72,73 Z" fill="#fff" stroke={OUT} strokeWidth={2.2} strokeLinejoin="round" />
              <path d="M55,75 L56,79 M61,75 L61,80 M67,75 L66,79" stroke={OUT} strokeWidth={1.2} />
            </>
          ) : (
            <>
              <path d="M44,65 L54,65" stroke="#2b1d14" strokeWidth={3.4} strokeLinecap="round" />
              <path d="M66,65 L76,65" stroke="#2b1d14" strokeWidth={3.4} strokeLinecap="round" />
              <path d="M52,75 Q62,81 70,73" stroke={OUT} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            </>
          )}
        </g>
      )}
      <ellipse cx={38} cy={73} rx={5} ry={3} fill="#ff9aa8" opacity={0.5} />
      <ellipse cx={82} cy={73} rx={5} ry={3} fill="#ff9aa8" opacity={0.5} />
    </g>
  );
}

const DRAW: Record<SpeakerId, (p: { expr: Expr }) => ReactElement> = {
  pokota: Pokota,
  mikeko: Mikeko,
  shibamaru: Shibamaru,
  penkichi: Penkichi,
  usami: Usami,
  konko: Konko,
  hoo: Hoo,
  kumo: Kumo,
};

/** キャラの絵の中身（<svg> の中に置く用） */
export function CharShape({ id, expr = 'normal' }: { id: SpeakerId; expr?: Expr }) {
  const D = DRAW[id];
  return <D expr={expr} />;
}

interface CharSvgProps {
  id: SpeakerId;
  expr?: Expr;
  size?: number;
  className?: string;
}

export function CharSvg({ id, expr = 'normal', size = 96, className }: CharSvgProps) {
  return (
    <svg viewBox={VIEWBOX} width={size} height={(size * 134) / 120} className={className} aria-hidden="true">
      <CharShape id={id} expr={expr} />
    </svg>
  );
}
