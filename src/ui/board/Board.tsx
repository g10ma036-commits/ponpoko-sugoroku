// 盤面。ドラッグで移動、ピンチ（PCはホイール）で拡大縮小。手番のコマを自動で追いかける。
// マスやコマを押すと説明、光っているマス（止まれるマス）を押すと、説明を見てからそこまで一気に進める。
// フェリーに乗るときは、船が航路をわたるアニメーションを出す。
import { useGesture } from '@use-gesture/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { CharShape, VIEWBOX } from '../../characters/Characters';
import { CHARACTERS } from '../../data/characters';
import { routeSamples } from '../../data/japan';
import { MAP_H, MAP_W, NODE, ferryRoute } from '../../data/map';
import { dist } from '../../engine/graph';
import type { CharId, GameState } from '../../engine/types';
import { MapLayer } from './MapLayer';
import { Ship, Squares } from './Squares';

/** フェリーで移動中（アニメーション用） */
export interface VoyageInfo {
  player: number;
  /** 乗った乗り場 */
  from: string;
  ms: number;
  key: number;
}

interface Props {
  game: GameState;
  overview: boolean;
  /** 人間が操作できるとき true（分かれ道の矢印・止まれるマスを押せる） */
  canChoose: boolean;
  /** 止まれるマス（人間の移動中だけ） */
  ends: string[];
  onChoose: (to: string) => void;
  onGoal: (to: string) => void;
  onInspect: (node: string) => void;
  onPlayer: (id: number) => void;
  voyage: VoyageInfo | null;
}

const BASE_SPAN = 560; // ふだんの拡大率で、画面の横幅に入る地図の広さ
const PIECE_W = 66;

export function Board({ game, overview, canChoose, ends, onChoose, onGoal, onInspect, onPlayer, voyage }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 600 });
  const [cam, setCam] = useState({ x: NODE[game.players[0].pos].x, y: NODE[game.players[0].pos].y, z: 1 });
  const [dragging, setDragging] = useState(false);
  const camRef = useRef(cam);
  const followed = useRef(false);
  const zoomedForFork = useRef(false);
  const moved = useRef(false); // ドラッグした直後のタップを無視する
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
  const options = ph.t === 'moving' && ph.options && canChoose ? ph.options : [];
  const goal = ph.t === 'moving' ? ph.goal : undefined;
  const showEnds = canChoose && !goal ? ends : [];
  const forkKey = options.length > 0 ? `${p.pos}|${ends.join(',')}` : '';
  // フェリーに乗るか聞いているとき・乗っているときは、航路の全体を見せる
  const ferryAsk = canChoose && ph.t === 'ferry' ? ph : null;
  const routeFrom = voyage ? voyage.from : ferryAsk ? p.pos : null;
  const routeKey = routeFrom ? `${routeFrom}|${voyage ? 'go' : 'ask'}` : '';

  // 手番の人が動いたら、カメラが追いかける
  useEffect(() => {
    if (overview) {
      setCam({ x: MAP_W / 2, y: MAP_H / 2, z: fitZoom });
      return;
    }
    if (routeFrom) {
      const pts = ferryRoute(routeFrom);
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      // 聞いているときは下に説明が出るので、上の6割に収める
      const vh = voyage ? size.h : size.h * 0.6;
      const z = Math.max(Math.min(size.w / (x1 - x0 + 200), vh / (y1 - y0 + 200), baseZoom), fitZoom);
      setCam({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 + (size.h - vh) / 2 / z, z });
      zoomedForFork.current = true;
      return;
    }
    // 分かれ道では、止まれるマスがなるべく全部見えるように引く（今いるマスは画面に残す）
    if (forkKey) {
      const pts = [target, ...ends.map((id) => NODE[id])];
      const xs = pts.map((n) => n.x);
      const ys = pts.map((n) => n.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const z = Math.max(Math.min(size.w / (x1 - x0 + 240), size.h / (y1 - y0 + 280), baseZoom), baseZoom * 0.5);
      const hw = Math.max(size.w / 2 / z - 150, 0);
      const hh = Math.max(size.h / 2 / z - 150, 0);
      const clamp = (v: number, c: number, r: number) => Math.min(Math.max(v, c - r), c + r);
      setCam({ x: clamp((x0 + x1) / 2, target.x, hw), y: clamp((y0 + y1) / 2, target.y, hh), z });
      zoomedForFork.current = true;
      return;
    }
    const reset = !followed.current || zoomedForFork.current;
    followed.current = true;
    zoomedForFork.current = false;
    setCam((c) => ({ x: target.x, y: target.y - 20, z: reset || c.z < baseZoom * 0.7 || c.z === fitZoom ? baseZoom : c.z }));
  }, [target.x, target.y, game.turn, overview, baseZoom, fitZoom, forkKey, routeKey]);

  const bind = useGesture(
    {
      onDragStart: () => setDragging(true),
      onDrag: ({ delta: [dx, dy], movement: [mx, my], pinching, cancel }) => {
        if (pinching) return cancel();
        if (Math.hypot(mx, my) > 8) moved.current = true;
        setCam((c) => ({ ...c, x: clampX(c.x - dx / c.z), y: clampY(c.y - dy / c.z) }));
      },
      onDragEnd: () => setDragging(false),
      onPinchStart: () => {
        moved.current = true;
        setDragging(true);
      },
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

  // マス・駅・コマを押したとき（ドラッグのあとは無視）
  const onTap = (e: MouseEvent) => {
    if (moved.current) return;
    const el = e.target as Element;
    const goalEl = el.closest('[data-goal]');
    if (goalEl) return onGoal(goalEl.getAttribute('data-goal')!);
    const pieceEl = el.closest('[data-player]');
    if (pieceEl) return onPlayer(Number(pieceEl.getAttribute('data-player')));
    const nodeEl = el.closest('[data-node]');
    if (nodeEl) onInspect(nodeEl.getAttribute('data-node')!);
  };

  const colors = useMemo(() => game.players.map((q) => CHARACTERS[q.charId].color), [game.players]);
  const bestDist = Math.min(...options.map((o) => dist(o, game.destination)));
  const myColor = colors[p.id];

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
    <div
      className="board"
      ref={wrapRef}
      onPointerDown={() => {
        moved.current = false;
      }}
      onClick={onTap}
    >
      <svg width={size.w} height={size.h} className="board-svg">
        <g style={{ transform, transition: dragging ? 'none' : 'transform 0.45s ease' }}>
          <MapLayer />
          {/* 止まれるマスの光（マスの後ろ） */}
          {showEnds.map((id) => (
            <circle key={id} cx={NODE[id].x} cy={NODE[id].y} r={NODE[id].kind === 'station' ? 50 : 38} fill="#fff27a" opacity={0.9} className="reach-glow" />
          ))}
          <Squares owner={game.owner} colors={colors} destination={game.destination} />

          {/* 止まれるマスの輪 */}
          {showEnds.map((id) => {
            const n = NODE[id];
            return (
              <g key={id} transform={`translate(${n.x} ${n.y})`}>
                <circle r={n.kind === 'station' ? 42 : 30} fill="none" stroke={myColor} strokeWidth={5} className="reach-ring" />
              </g>
            );
          })}
          {/* フェリーの行き先 */}
          {ferryAsk && (
            <g transform={`translate(${NODE[ferryAsk.to].x} ${NODE[ferryAsk.to].y})`}>
              <circle r={34} fill="#fff27a" opacity={0.9} className="reach-glow" />
              <circle r={30} fill="none" stroke={myColor} strokeWidth={6} strokeDasharray="10 7" className="goal-ring" />
            </g>
          )}
          {/* 選んだ行き先 */}
          {goal && (
            <g transform={`translate(${NODE[goal].x} ${NODE[goal].y})`}>
              <circle r={NODE[goal].kind === 'station' ? 40 : 31} fill="none" stroke={myColor} strokeWidth={6} strokeDasharray="10 7" className="goal-ring" />
            </g>
          )}

          {/* コマ */}
          {order.map(({ q, x, y }) => {
            if (voyage && voyage.player === q.id) return null;
            const isCur = q.id === p.id;
            const moving = isCur && ph.t === 'moving';
            return (
              <g key={q.id} data-player={q.id} className="piece" style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.2s ease-out' }}>
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

          {voyage && <Voyage key={voyage.key} info={voyage} charId={game.players[voyage.player].charId} />}

          {/* 止まれるマスの押せる範囲（コマより手前） */}
          {showEnds.map((id) => (
            <circle key={id} data-goal={id} cx={NODE[id].x} cy={NODE[id].y} r={40} fill="transparent" className="reach-hit" />
          ))}

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
              <g
                key={o}
                className="dir-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!moved.current) onChoose(o);
                }}
              >
                <path d={`M${target.x + ux * 30},${target.y + uy * 30} L${ax},${ay}`} stroke={myColor} strokeWidth={6} strokeDasharray="2 10" strokeLinecap="round" />
                <g transform={`translate(${ax} ${ay})`}>
                  <circle r={44} fill="transparent" />
                  <circle r={29} className="dir-pulse" fill="none" stroke={myColor} strokeWidth={6} />
                  <circle r={25} fill="#fff" stroke={myColor} strokeWidth={6} />
                  <path d="M-10,-10 L11,0 L-10,10 Z" transform={`rotate(${ang})`} fill={myColor} stroke="#4a3426" strokeWidth={2.5} strokeLinejoin="round" />
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

/** フェリーが航路をわたるアニメーション（コマは船の上に乗る） */
function Voyage({ info, charId }: { info: VoyageInfo; charId: CharId }) {
  const ref = useRef<SVGGElement>(null);
  const shipRef = useRef<SVGGElement>(null);
  const pts = useMemo(() => routeSamples(ferryRoute(info.from), 16), [info.from]);
  useEffect(() => {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = L[L.length - 1];
    const t0 = performance.now();
    let raf = 0;
    let i = 1;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / info.ms);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ゆっくり出て、ゆっくり着く
      const at = e * total;
      while (i < L.length - 1 && L[i] < at) i++;
      const f = (at - L[i - 1]) / (L[i] - L[i - 1] || 1);
      const dx = pts[i][0] - pts[i - 1][0];
      ref.current?.setAttribute('transform', `translate(${pts[i - 1][0] + dx * f} ${pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f})`);
      if (Math.abs(dx) > 0.5) shipRef.current?.setAttribute('transform', `scale(${dx < 0 ? -1 : 1} 1)`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pts, info.ms]);
  const w = PIECE_W * 0.85;
  return (
    <g ref={ref} transform={`translate(${pts[0][0]} ${pts[0][1]})`} className="voyage">
      <ellipse cx={0} cy={26} rx={52} ry={10} fill="#ffffff" opacity={0.5} />
      <g ref={shipRef}>
        <Ship y={6} scale={1.9} />
      </g>
      {/* 甲板の上に立つ */}
      <svg x={-w / 2} y={-w * 1.12 + 12} width={w} height={w * 1.12} viewBox={VIEWBOX} overflow="visible">
        <CharShape id={charId} expr="happy" />
      </svg>
    </g>
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
