// 盤面。ドラッグで移動、ピンチ（PCはホイール）で拡大縮小。手番のコマを自動で追いかける。
import { useGesture } from '@use-gesture/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CharShape, VIEWBOX } from '../../characters/Characters';
import { CHARACTERS } from '../../data/characters';
import { MAP_H, MAP_W, NODE } from '../../data/map';
import { dist } from '../../engine/graph';
import type { GameState } from '../../engine/types';
import { MapLayer } from './MapLayer';
import { Squares } from './Squares';

interface Props {
  game: GameState;
  overview: boolean;
  canChoose: boolean;
  onChoose: (to: string) => void;
  onExitOverview: () => void;
}

const BASE_SPAN = 560; // ふだんの拡大率で、画面の横幅に入る地図の広さ
const PIECE_W = 66;

export function Board({ game, overview, canChoose, onChoose, onExitOverview }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 600 });
  const [cam, setCam] = useState({ x: NODE[game.players[0].pos].x, y: NODE[game.players[0].pos].y, z: 1 });
  const [dragging, setDragging] = useState(false);
  const camRef = useRef(cam);
  const followed = useRef(false);
  camRef.current = cam;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const baseZoom = Math.max(size.w / BASE_SPAN, 0.45);
  const fitZoom = Math.min(size.w / (MAP_W + 80), size.h / (MAP_H + 80));
  const p = game.players[game.turn];
  const target = NODE[p.pos];
  const ph = game.phase;

  // 手番の人が動いたら、カメラが追いかける
  useEffect(() => {
    if (overview) {
      setCam({ x: MAP_W / 2, y: MAP_H / 2, z: fitZoom });
      return;
    }
    // 分かれ道では、選べる道が見えるように少し引く
    const first = !followed.current;
    followed.current = true;
    setCam((c) => ({ x: target.x, y: target.y - 20, z: first || c.z < baseZoom * 0.7 || c.z === fitZoom ? baseZoom : c.z }));
  }, [target.x, target.y, game.turn, overview, baseZoom, fitZoom]);

  const bind = useGesture(
    {
      onDragStart: () => setDragging(true),
      onDrag: ({ delta: [dx, dy], pinching, cancel }) => {
        if (pinching) return cancel();
        setCam((c) => ({ ...c, x: clampX(c.x - dx / c.z), y: clampY(c.y - dy / c.z) }));
      },
      onDragEnd: () => setDragging(false),
      onPinchStart: () => setDragging(true),
      onPinch: ({ offset: [z] }) => setCam((c) => ({ ...c, z })),
      onPinchEnd: () => setDragging(false),
      onWheel: ({ delta: [, dy] }) => setCam((c) => ({ ...c, z: clampZ(c.z * (dy > 0 ? 0.92 : 1.08), fitZoom, baseZoom) })),
    },
    {
      target: wrapRef,
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: { from: () => [camRef.current.z, 0], scaleBounds: { min: fitZoom * 0.9, max: baseZoom * 2.2 } },
      wheel: { eventOptions: { passive: true } },
    },
  );
  void bind;

  const colors = useMemo(() => game.players.map((q) => CHARACTERS[q.charId].color), [game.players]);
  const options = ph.t === 'moving' && ph.options && canChoose ? ph.options : [];
  const bestDist = Math.min(...options.map((o) => dist(o, game.destination)));

  // 同じマスに何人かいるときは少しずらす
  const placed = game.players.map((q) => {
    const n = NODE[q.pos];
    const same = game.players.filter((o) => o.pos === q.pos);
    const k = same.indexOf(q);
    const spread = same.length > 1 ? 22 : 0;
    const ang = same.length > 1 ? (k / same.length) * Math.PI * 2 - Math.PI / 2 : 0;
    return { q, x: n.x + Math.cos(ang) * spread, y: n.y + Math.sin(ang) * spread * 0.6 };
  });
  const order = [...placed].sort((a, b) => (a.q.id === p.id ? 1 : b.q.id === p.id ? -1 : a.y - b.y));

  const transform = `translate(${size.w / 2}px, ${size.h / 2}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`;

  return (
    <div className="board" ref={wrapRef} onDoubleClick={overview ? onExitOverview : undefined}>
      <svg width={size.w} height={size.h} className="board-svg">
        <g style={{ transform, transition: dragging ? 'none' : 'transform 0.45s ease' }}>
          <MapLayer />
          <Squares owner={game.owner} colors={colors} destination={game.destination} />

          {/* コマ */}
          {order.map(({ q, x, y }) => {
            const isCur = q.id === p.id;
            const moving = isCur && ph.t === 'moving';
            return (
              <g key={q.id} style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.2s ease-out' }}>
                <ellipse cx={0} cy={2} rx={22} ry={8} fill="#000" opacity={0.2} />
                {isCur && <ellipse cx={0} cy={2} rx={28} ry={11} fill="none" stroke={colors[q.id]} strokeWidth={4} className="cur-ring" />}
                <g className={isCur ? 'piece-bob' : ''}>
                  <svg x={-PIECE_W / 2} y={-PIECE_W * 1.12 + 6} width={PIECE_W} height={PIECE_W * 1.12} viewBox={VIEWBOX} overflow="visible">
                    <CharShape id={q.charId} expr={game.kumo === q.id ? 'sad' : 'normal'} />
                  </svg>
                  {game.kumo === q.id && (
                    <g className="kumo-float">
                      <svg x={-24} y={-PIECE_W * 1.12 - 34} width={48} height={54} viewBox={VIEWBOX} overflow="visible">
                        <CharShape id="kumo" expr="happy" />
                      </svg>
                    </g>
                  )}
                  {q.sleep > 0 && (
                    <text x={24} y={-60} className="zzz">
                      💤
                    </text>
                  )}
                </g>
                {moving && ph.steps > 0 && (
                  <g transform={`translate(0 ${-PIECE_W * 1.12 - (game.kumo === q.id ? 44 : 6)})`}>
                    <rect x={-34} y={-30} width={68} height={30} rx={15} fill="#ff7a45" stroke="#fff" strokeWidth={3} />
                    <text className="steps-left" y={-9}>
                      あと{ph.steps}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 分かれ道の矢印（コマより手前に、道の方向へ少し離して置く） */}
          {options.map((o) => {
            const n = NODE[o];
            const len = Math.hypot(n.x - target.x, n.y - target.y) || 1;
            const ux = (n.x - target.x) / len;
            const uy = (n.y - target.y) / len;
            const ax = target.x + ux * 96;
            const ay = target.y + uy * 96;
            const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
            const d = dist(o, game.destination);
            const best = d === bestDist;
            return (
              <g key={o} className="dir-arrow" onClick={() => onChoose(o)}>
                <path d={`M${target.x + ux * 30},${target.y + uy * 30} L${ax},${ay}`} stroke={colors[p.id]} strokeWidth={6} strokeDasharray="2 10" strokeLinecap="round" />
                <g transform={`translate(${ax} ${ay})`}>
                  <circle r={44} fill="transparent" />
                  <circle r={29} className="dir-pulse" fill="none" stroke={colors[p.id]} strokeWidth={6} />
                  <circle r={25} fill="#fff" stroke={colors[p.id]} strokeWidth={6} />
                  <path d="M-10,-10 L11,0 L-10,10 Z" transform={`rotate(${ang})`} fill={colors[p.id]} stroke="#4a3426" strokeWidth={2.5} strokeLinejoin="round" />
                </g>
                <g transform={`translate(${ax + ux * 46} ${ay + uy * 40})`}>
                  <rect x={-30} y={-14} width={60} height={27} rx={13.5} fill={best ? '#2e9e5b' : '#4a3426'} stroke="#fff" strokeWidth={2.5} />
                  <text className="dir-dist" y={6}>
                    🏮{d}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function clampX(x: number) {
  return Math.min(Math.max(x, -100), MAP_W + 100);
}
function clampY(y: number) {
  return Math.min(Math.max(y, -100), MAP_H + 100);
}
function clampZ(z: number, min: number, base: number) {
  return Math.min(Math.max(z, min * 0.9), base * 2.2);
}
