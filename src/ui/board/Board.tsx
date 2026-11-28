// 盤面。ドラッグで移動、ピンチ（PCはホイール）で拡大縮小。手番のコマを自動で追いかける。
// マスやコマを押すと説明、光っているマス（止まれるマス）を押すと、説明を見てからそこまで一気に進める。
// フェリーに乗るときは、船が航路をわたるアニメーションを出す。
// おまつり会場の発表では、カメラが会場まで飛んで ちょうちんが灯る。くもすけは 雨をふらせながら コマからコマへ飛びうつる。
// 会場には ぴったりの目でしか止まれない。止まれるときは「ぴったり止まれる！」の札、通りすぎたときは「おしい！」を出す。
// 激アツ駅の発表（6月）でも、カメラが その駅へ飛ぶ。
import { useGesture } from '@use-gesture/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { CharShape, VIEWBOX } from '../../characters/Characters';
import { CHARACTERS } from '../../data/characters';
import { routeSamples } from '../../data/japan';
import { MAP_H, MAP_W, NODE, NODES, ferryRoute } from '../../data/map';
import { reachStations } from '../../engine/game';
import { dist } from '../../engine/graph';
import type { CharId, GameState } from '../../engine/types';
import { getLabels, labelBox } from './labels';
import { MapLayer } from './MapLayer';
import { BuildPops, Ship, Squares, useBuildPops } from './Squares';

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
  /** カメラを向けるマス（おまつり会場・激アツ駅の発表のとき） */
  focus?: string;
  /** サイコロが まだ回っている（のこりマス数を見せない） */
  rolling?: boolean;
}

const BASE_SPAN = 560; // ふだんの拡大率で、画面の横幅に入る地図の広さ
const PIECE_W = 66;
/** コマの上の くもすけ の高さ */
const KUMO_Y = -PIECE_W * 1.12 - 48;
const KUMO_FLY_MS = 800;

export function Board({ game, overview, canChoose, ends, onChoose, onGoal, onInspect, onPlayer, voyage, focus, rolling = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 600 });
  const [cam, setCam] = useState({ x: NODE[game.players[0].pos].x, y: NODE[game.players[0].pos].y, z: 1 });
  const [dragging, setDragging] = useState(false);
  const [slowCam, setSlowCam] = useState(false);
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
  // 物件を買う画面は下半分をおおうので、駅が上のほうに見えるようにする
  const buyLift = canChoose && ph.t === 'buy';

  // おまつり会場へ飛ぶときと、もどるときは、カメラをゆっくり動かす
  const firstFocus = useRef(true);
  useEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    setSlowCam(true);
    const t = window.setTimeout(() => setSlowCam(false), 1400);
    return () => window.clearTimeout(t);
  }, [focus]);

  // 手番の人が動いたら、カメラが追いかける
  useEffect(() => {
    if (overview) {
      setCam({ x: MAP_W / 2, y: MAP_H / 2, z: fitZoom });
      return;
    }
    if (focus) {
      const n = NODE[focus];
      const z = baseZoom * 1.1;
      // 下にメッセージが出るので、会場は画面の上のほうに見せる
      setCam({ x: n.x, y: n.y + (size.h * 0.17) / z, z });
      zoomedForFork.current = true;
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
    setCam((c) => {
      const z = reset || c.z < baseZoom * 0.7 || c.z === fitZoom ? baseZoom : c.z;
      return { x: target.x, y: target.y - 20 + (buyLift ? (size.h * 0.27) / z : 0), z };
    });
  }, [target.x, target.y, game.turn, overview, baseZoom, fitZoom, forkKey, routeKey, focus, buyLift, size.h]);

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

  const charKey = game.players.map((q) => q.charId).join(',');
  const colors = useMemo(() => game.players.map((q) => CHARACTERS[q.charId].color), [charKey]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // ---- くもすけが 乗りうつる・くっつく・逃げていく ときは、空を飛んで移動する
  const prevKumo = useRef(game.kumo);
  const [kumoFly, setKumoFly] = useState<{ from: [number, number]; to: [number, number]; target: number | null; key: number } | null>(null);
  useEffect(() => {
    const a = prevKumo.current;
    const b = game.kumo;
    prevKumo.current = b;
    if (a === b) return;
    const top = (id: number): [number, number] => {
      const pp = placed.find((x) => x.q.id === id)!;
      return [pp.x, pp.y + KUMO_Y + 32];
    };
    const from: [number, number] = a !== null ? top(a) : [top(b!)[0] - 60, top(b!)[1] - 340];
    const to: [number, number] = b !== null ? top(b) : [from[0] + 160, from[1] - 380];
    setKumoFly({ from, to, target: b, key: Date.now() });
    const t = window.setTimeout(() => setKumoFly(null), KUMO_FLY_MS + 60);
    return () => window.clearTimeout(t);
  }, [game.kumo]); // eslint-disable-line react-hooks/exhaustive-deps

  const pops = useBuildPops(game.owner);

  // ひとりじめできそうな駅（人間の人のぶんだけ、その人の色で光らせる）
  const humanKey = game.players.map((q) => (q.isCpu ? 0 : 1)).join('');
  const reach = useMemo(() => {
    const out: Record<string, { player: number; left: number }> = {};
    for (const q of game.players) if (!q.isCpu) for (const r of reachStations(game, q.id)) out[r.station] = { player: q.id, left: r.left.length };
    return out;
  }, [game.owner, humanKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // おまつり会場の発表と、激アツ駅の発表で 飾りを変える
  const festFocus = focus !== undefined && focus === game.destination;
  const dest = NODE[game.destination];
  const canArrive = showEnds.includes(game.destination);

  // 会場を通りすぎたら「おしい！」（ぴったりの目でないと止まれない）
  const passing = ph.t === 'moving' && ph.steps > 0 && p.pos === game.destination;
  const [passBy, setPassBy] = useState<number | null>(null);
  useEffect(() => {
    if (!passing) return;
    const k = Date.now();
    setPassBy(k);
    window.setTimeout(() => setPassBy((v) => (v === k ? null : v)), 1700);
  }, [passing]);

  const labels = getLabels();
  // 分かれ道の札の場所（先に置いた札とも ぶつからないように 順番に決める）
  const pills: Record<string, { x: number; y: number }> = {};
  for (const o of options) {
    const n = NODE[o];
    const len = Math.hypot(n.x - target.x, n.y - target.y) || 1;
    pills[o] = pillSpot(n, (n.x - target.x) / len, (n.y - target.y) / len, n.kind === 'station' ? 38 : 28, target, labels[o] ? labelBox(n, labels[o]) : null, Object.values(pills));
  }

  // 「ぴったり止まれる！」の札の場所（ほかのマス・コマ・分かれ道の札と ぶつからない側）
  const tag = canArrive ? exactSpot(dest, target, Object.values(pills), labels) : null;
  // 全体マップのときは、会場と激アツ駅に 大きな目印を出す（画面の上で同じ大きさ）
  const pinK = 1 / cam.z;
  const showPins = cam.z < baseZoom * 0.6;
  const hot = game.economy?.hot;

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
        <g style={{ transform, transition: dragging ? 'none' : `transform ${slowCam ? 1.2 : 0.45}s ease-in-out` }}>
          <MapLayer />
          {/* おまつり会場・激アツ駅の発表：後ろから光がさす（激アツ駅は だいだい色） */}
          {focus && (
            <g key={`rays-${focus}`} transform={`translate(${NODE[focus].x} ${NODE[focus].y})`} pointerEvents="none">
              <g className="fest-rays">
                {Array.from({ length: 12 }, (_, i) => (
                  <path key={i} d="M0,0 L-16,-170 L16,-170 Z" transform={`rotate(${i * 30})`} fill={festFocus ? '#fff6b0' : '#ffb36b'} />
                ))}
              </g>
            </g>
          )}
          {/* 止まれるマスの光（マスの後ろ） */}
          {showEnds.map((id) => (
            <circle key={id} cx={NODE[id].x} cy={NODE[id].y} r={NODE[id].kind === 'station' ? 50 : 38} fill="#fff27a" opacity={0.9} className="reach-glow" />
          ))}
          <Squares owner={game.owner} colors={colors} destination={game.destination} pops={pops} hot={game.economy?.hot} reach={reach} />

          {/* おまつり会場の発表：ちょうちんが 順番に灯る */}
          {festFocus && (
            <g key={`lights-${focus}`} transform={`translate(${NODE[focus].x} ${NODE[focus].y})`} pointerEvents="none">
              {Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                return (
                  <g key={i} transform={`translate(${(Math.cos(a) * 80).toFixed(1)} ${(Math.sin(a) * 66).toFixed(1)})`}>
                    <g className="lantern" style={{ animationDelay: `${0.9 + i * 0.08}s` }}>
                      <circle r={15} fill="#ffd45a" className="lantern-glow" />
                      <rect x={-5} y={-13} width={10} height={4} rx={1} fill="#4a3426" />
                      <ellipse rx={8.5} ry={10.5} fill="#ff5a5a" stroke="#4a3426" strokeWidth={2} />
                      <path d="M-8,-3 L8,-3 M-8,3 L8,3" stroke="#ffb0a0" strokeWidth={1.3} />
                      <rect x={-5} y={9} width={10} height={4} rx={1} fill="#4a3426" />
                    </g>
                  </g>
                );
              })}
            </g>
          )}

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
            const hasKumo = game.kumo === q.id && !(kumoFly && kumoFly.target === q.id);
            return (
              <g key={q.id} data-player={q.id} className="piece" style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.2s ease-out' }}>
                <ellipse cx={0} cy={2} rx={22} ry={8} fill="#000" opacity={0.2} />
                {isCur && <ellipse cx={0} cy={2} rx={28} ry={11} fill="none" stroke={colors[q.id]} strokeWidth={4} className="cur-ring" />}
                <g className={isCur ? 'piece-bob' : ''}>
                  <svg x={-PIECE_W / 2} y={-PIECE_W * 1.12 + 6} width={PIECE_W} height={PIECE_W * 1.12} viewBox={VIEWBOX} overflow="visible">
                    <CharShape id={q.charId} expr={game.kumo === q.id ? 'sad' : 'normal'} />
                  </svg>
                  {hasKumo && (
                    <g className="kumo-float">
                      {/* 雨：頭の上に ぽつぽつ */}
                      <g className="kumo-rain" transform={`translate(0 ${KUMO_Y + 50})`}>
                        {[-16, -5, 6, 16].map((dx, i) => (
                          <g key={i} style={{ animationDelay: `${i * 0.17}s` }}>
                            <line x1={dx} x2={dx - 3.5} y1={0} y2={14} className="drop-edge" />
                            <line x1={dx} x2={dx - 3.5} y1={0} y2={14} />
                          </g>
                        ))}
                      </g>
                      <svg x={-29} y={KUMO_Y} width={58} height={65} viewBox={VIEWBOX} overflow="visible">
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
                {moving && ph.steps > 0 && !rolling && (
                  <g transform={`translate(0 ${-PIECE_W * 1.12 - (game.kumo === q.id ? 58 : 6)})`}>
                    <rect x={-34} y={-30} width={68} height={30} rx={15} fill="#ff7a45" stroke="#fff" strokeWidth={3} />
                    <text className="steps-left" y={-9}>
                      あと{ph.steps}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          <BuildPops pops={pops} colors={colors} />
          {voyage && <Voyage key={voyage.key} info={voyage} charId={game.players[voyage.player].charId} />}
          {kumoFly && <KumoFlight key={kumoFly.key} from={kumoFly.from} to={kumoFly.to} leaving={kumoFly.target === null} />}

          {/* 止まれるマスの押せる範囲（コマより手前） */}
          {showEnds.map((id) => (
            <circle key={id} data-goal={id} cx={NODE[id].x} cy={NODE[id].y} r={40} fill="transparent" className="reach-hit" />
          ))}

          {/* 会場に ぴったり止まれる！（押すと 会場へ） */}
          {tag && (
            <g data-goal={game.destination} transform={`translate(${tag.x} ${tag.y})`} className="reach-hit">
              <g className="exact-tag">
                <rect x={-TAG_W / 2} y={-TAG_H / 2} width={TAG_W} height={TAG_H} rx={TAG_H / 2} fill="#ff5a5a" stroke="#fff" strokeWidth={3.5} />
                <path d={TAG_ARROW[tag.dir]} fill="#ff5a5a" />
                <text className="exact-tag-text" y={6}>
                  🏮 ぴったり止まれる！
                </text>
              </g>
            </g>
          )}
          {/* 会場を 通りすぎた */}
          {passBy !== null && (
            <g key={passBy} transform={`translate(${dest.x} ${dest.y - 138})`} pointerEvents="none">
              <g className="pass-pop">
                <rect x={-96} y={-20} width={192} height={36} rx={18} fill="#ffffff" stroke="#ff5a5a" strokeWidth={3.5} />
                <text className="pass-pop-text" y={6}>
                  おしい！ 通りすぎ〜
                </text>
              </g>
            </g>
          )}

          {/*
            分かれ道：となりのマスを 自分の色の輪でかこみ、外側に 進む向きの矢印と 会場までのマス数を出す。
            マスそのものは かくさないので、何のマス・何の駅か 見える。
          */}
          {options.map((o) => {
            const n = NODE[o];
            const len = Math.hypot(n.x - target.x, n.y - target.y) || 1;
            const ux = (n.x - target.x) / len;
            const uy = (n.y - target.y) / len;
            const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
            const rr = n.kind === 'station' ? 38 : 28;
            const isEnd = showEnds.includes(o);
            const d = dist(o, game.destination);
            const best = d === bestDist;
            const tab = { x: n.x + ux * (rr + 3), y: n.y + uy * (rr + 3) };
            const pill = pills[o];
            const pick = () => (isEnd ? onGoal(o) : onChoose(o));
            return (
              <g
                key={o}
                className="dir-opt"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!moved.current) pick();
                }}
              >
                <circle cx={n.x} cy={n.y} r={rr + 14} fill="transparent" />
                {!isEnd && <circle cx={n.x} cy={n.y} r={rr} fill="none" stroke={myColor} strokeWidth={5} className="dir-ring" />}
                <g transform={`translate(${tab.x.toFixed(1)} ${tab.y.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
                  <g className="dir-tab">
                    <circle r={14} fill={myColor} stroke="#fff" strokeWidth={3} />
                    <path d="M-5,-7 L7,0 L-5,7 Z" fill="#fff" stroke="#4a3426" strokeWidth={1.5} strokeLinejoin="round" />
                  </g>
                </g>
                <g transform={`translate(${pill.x.toFixed(1)} ${pill.y.toFixed(1)})`}>
                  <rect x={-30} y={-14} width={60} height={27} rx={13.5} fill={best ? '#2e9e5b' : '#4a3426'} stroke="#fff" strokeWidth={2.5} />
                  <text className="dir-dist" y={6}>
                    🏮{d}
                  </text>
                </g>
              </g>
            );
          })}
          {/* 全体マップの目印：🏮 おまつり会場・🔥 激アツ駅 */}
          {showPins &&
            [
              { id: game.destination, icon: '🏮', color: '#ff5a5a' },
              ...(hot && hot !== game.destination ? [{ id: hot, icon: '🔥', color: '#ff7a1f' }] : []),
            ].map((pin) => (
              <g key={pin.id} transform={`translate(${NODE[pin.id].x} ${NODE[pin.id].y}) scale(${pinK})`} pointerEvents="none">
                <g className="map-pin">
                  <path d="M-9,-18 L0,-2 L9,-18 Z" fill={pin.color} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
                  <circle cy={-34} r={19} fill={pin.color} stroke="#fff" strokeWidth={3.5} />
                  <text className="pin-icon" y={-27}>
                    {pin.icon}
                  </text>
                </g>
              </g>
            ))}
        </g>
      </svg>
      {focus && <div key={`spot-${focus}`} className="fest-spot" />}
    </div>
  );
}

/**
 * 分かれ道の「会場まで○マス」の札を置く場所。
 * 道の先には次のマスがあるので、まず道の横。ほかのマス・駅の名前・今いるマスと ぶつからない所をえらぶ。
 */
function pillSpot(
  n: { x: number; y: number },
  ux: number,
  uy: number,
  rr: number,
  from: { x: number; y: number },
  label: { x0: number; x1: number; y0: number; y1: number } | null,
  taken: { x: number; y: number }[],
) {
  const at = (vx: number, vy: number, k: number) => ({ x: n.x + vx * k, y: n.y + vy * k });
  const d = Math.SQRT1_2;
  const cands = [
    at(-uy, ux, rr + 32),
    at(uy, -ux, rr + 32),
    at(d * (ux - uy), d * (uy + ux), rr + 36),
    at(d * (ux + uy), d * (uy - ux), rr + 36),
    at(ux, uy, rr + 44),
  ];
  const hits = (c: { x: number; y: number }) => {
    let k = 0;
    // 今いるマスと、その上のコマ・「あと○」の札
    if (Math.abs(c.x - from.x) < 70 && c.y > from.y - 135 && c.y < from.y + 40) k += 3;
    for (const o of NODES) if (Math.abs(o.x - c.x) < 54 && Math.abs(o.y - c.y) < 40 && (o.x !== n.x || o.y !== n.y)) k++;
    for (const t of taken) if (Math.abs(t.x - c.x) < 66 && Math.abs(t.y - c.y) < 32) k += 4;
    if (label && c.x + 30 > label.x0 && c.x - 30 < label.x1 && c.y + 14 > label.y0 && c.y - 14 < label.y1) k += 2;
    return k;
  };
  let best = cands[0];
  let bestHits = Infinity;
  for (const c of cands) {
    const h = hits(c);
    if (h < bestHits) {
      bestHits = h;
      best = c;
    }
  }
  return best;
}

const TAG_W = 200;
const TAG_H = 36;
type TagDir = 'down' | 'up' | 'left' | 'right';
/** 札から 会場を指す三角 */
const TAG_ARROW: Record<TagDir, string> = {
  down: `M-9,${TAG_H / 2 - 2} L0,${TAG_H / 2 + 11} L9,${TAG_H / 2 - 2} Z`,
  up: `M-9,${-TAG_H / 2 + 2} L0,${-TAG_H / 2 - 11} L9,${-TAG_H / 2 + 2} Z`,
  left: `M${-TAG_W / 2 + 2},-9 L${-TAG_W / 2 - 11},0 L${-TAG_W / 2 + 2},9 Z`,
  right: `M${TAG_W / 2 - 2},-9 L${TAG_W / 2 + 11},0 L${TAG_W / 2 - 2},9 Z`,
};

/**
 * 「ぴったり止まれる！」の札を置く場所。会場の上・下・右・左のうち、
 * 今いるマスとコマ・ほかのマス・分かれ道の札・駅の名前に いちばん ぶつからないところ。
 */
function exactSpot(
  dest: { id: string; x: number; y: number },
  from: { x: number; y: number },
  pills: { x: number; y: number }[],
  labels: ReturnType<typeof getLabels>,
): { x: number; y: number; dir: TagDir } {
  const cands: { x: number; y: number; dir: TagDir }[] = [
    { x: dest.x, y: dest.y - 106, dir: 'down' },
    { x: dest.x, y: dest.y + 100, dir: 'up' },
    { x: dest.x + 142, y: dest.y - 46, dir: 'left' },
    { x: dest.x - 142, y: dest.y - 46, dir: 'right' },
  ];
  const hw = TAG_W / 2;
  const hh = TAG_H / 2;
  const near = NODES.filter((o) => Math.abs(o.x - dest.x) < 360 && Math.abs(o.y - dest.y) < 260);
  const boxes = near.filter((o) => labels[o.id]).map((o) => labelBox(o, labels[o.id]));
  let best = cands[0];
  let bestHits = Infinity;
  cands.forEach((c, i) => {
    let k = i * 0.3;
    if (Math.abs(c.x - from.x) < hw + 36 && c.y + hh > from.y - 130 && c.y - hh < from.y + 30) k += 5;
    for (const o of near) if (o.id !== dest.id && Math.abs(o.x - c.x) < hw + 22 && Math.abs(o.y - c.y) < hh + 22) k += 1;
    for (const p of pills) if (Math.abs(p.x - c.x) < hw + 30 && Math.abs(p.y - c.y) < hh + 14) k += 3;
    for (const b of boxes) if (c.x + hw > b.x0 && c.x - hw < b.x1 && c.y + hh > b.y0 && c.y - hh < b.y1) k += 2;
    if (k < bestHits) {
      bestHits = k;
      best = c;
    }
  });
  return best;
}

/** くもすけが 空を飛んで移動する（ふわっと山なりに） */
function KumoFlight({ from, to, leaving }: { from: [number, number]; to: [number, number]; leaving: boolean }) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    const t0 = performance.now();
    const cx = (from[0] + to[0]) / 2;
    const cy = Math.min(from[1], to[1]) - 110;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / KUMO_FLY_MS);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = (1 - e) * (1 - e) * from[0] + 2 * (1 - e) * e * cx + e * e * to[0];
      const y = (1 - e) * (1 - e) * from[1] + 2 * (1 - e) * e * cy + e * e * to[1];
      const el = ref.current;
      if (el) {
        el.setAttribute('transform', `translate(${x} ${y})`);
        if (leaving) el.setAttribute('opacity', String(1 - e));
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, leaving]);
  return (
    <g ref={ref} transform={`translate(${from[0]} ${from[1]})`} pointerEvents="none">
      <svg x={-28} y={-34} width={56} height={63} viewBox={VIEWBOX} overflow="visible">
        <CharShape id="kumo" expr={leaving ? 'sad' : 'happy'} />
      </svg>
    </g>
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
