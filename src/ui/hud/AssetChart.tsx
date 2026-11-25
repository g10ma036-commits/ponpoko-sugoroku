// 結果画面の「総資産のうつりかわり」グラフ。月末ごとの総資産を折れ線で描く。
// 線の色はキャラの色ではなく席順の4色（キャラの色はオレンジ系が多く、線どうしの見分けがつかないため）。
// だれの線かは、凡例と線の終わりの顔でわかる。グラフを押す（なぞる）と、その月の金額が出る。
import { useRef, useState, type PointerEvent } from 'react';
import { formatRyo } from '../../engine/format';
import type { Player } from '../../engine/types';
import { CharFace } from '../common';

/** 線の色（席順）。色の見分けやすさを点検ずみ */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

const W = 340;
const H = 200;
const M = { l: 44, r: 34, t: 12, b: 24 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;

function niceStep(range: number): number {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * mag >= raw) return k * mag;
  return 10 * mag;
}

const shortRyo = (v: number) => {
  if (v === 0) return '0';
  const a = Math.abs(v);
  const t = a >= 10000 ? `${Math.round((a / 10000) * 10) / 10}万` : `${a}`;
  return v < 0 ? `-${t}` : t;
};

/** 何番目の点が何年目何月か（0 はスタート） */
export const monthLabel = (i: number) => (i === 0 ? 'スタート' : `${Math.ceil(i / 12)}年目 ${((i - 1) % 12) + 1}月`);

export function AssetChart({ history, players, years }: { history: number[][]; players: Player[]; years: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = history.length - 1;
  const all = history.flat();
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all, 1);
  const step = niceStep(hi - lo);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;
  const x = (i: number) => M.l + (n === 0 ? 0 : (i / n) * PW);
  const y = (v: number) => M.t + PH - ((v - yMin) / (yMax - yMin || 1)) * PH;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-6; v += step) yTicks.push(v);
  const every = years <= 5 ? 1 : 2;
  const xTicks: { i: number; label: string }[] = [{ i: 0, label: 'スタート' }];
  for (let k = every; k <= years; k += every) if (k * 12 <= n) xTicks.push({ i: k * 12, label: `${k}年` });
  if (years === 1 && n >= 6) xTicks.splice(1, 0, { i: 6, label: '6月' });

  // 線の終わりの顔：重ならないように 上下に ずらす
  const ends = players
    .map((_, k) => ({ k, y: y(history[n][k]) }))
    .sort((a, b) => a.y - b.y);
  for (let j = 1; j < ends.length; j++) ends[j].y = Math.max(ends[j].y, ends[j - 1].y + 19);
  const over = ends.length ? ends[ends.length - 1].y - (M.t + PH) : 0;
  if (over > 0) for (const e of ends) e.y -= over;

  const pick = (e: PointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.min(n, Math.max(0, Math.round(((px - M.l) / PW) * n))));
  };

  const rows = hover === null ? [] : players.map((p, k) => ({ p, k, v: history[hover][k] })).sort((a, b) => b.v - a.v);
  const tipLeft = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div className="asset-chart">
      <div className="chart-legend">
        {players.map((p, k) => (
          <span key={p.id} className="legend-item">
            <i style={{ background: SERIES[k] }} />
            <CharFace id={p.charId} size={20} />
            {p.name}
          </span>
        ))}
      </div>
      <div className="chart-box">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          onPointerDown={pick}
          onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons ? pick(e) : undefined)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
          role="img"
          aria-label="総資産のうつりかわりのグラフ"
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + PW} y1={y(v)} y2={y(v)} className={v === 0 ? 'chart-zero' : 'chart-grid'} />
              <text x={M.l - 6} y={y(v) + 4} className="chart-ylabel">
                {shortRyo(v)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t.i} x={x(t.i)} y={H - 6} className="chart-xlabel" textAnchor={t.i === 0 ? 'start' : t.i === n ? 'end' : 'middle'}>
              {t.label}
            </text>
          ))}
          {players.map((p, k) => (
            <path
              key={p.id}
              d={history.map((row, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(row[k]).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={SERIES[k]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* 線の終わり：点と顔 */}
          {ends.map((e) => {
            const vy = y(history[n][e.k]);
            return (
              <g key={e.k}>
                {Math.abs(e.y - vy) > 2 && <line x1={x(n) + 4} y1={vy} x2={x(n) + 10} y2={e.y} stroke={SERIES[e.k]} strokeWidth={1} />}
                <circle cx={x(n)} cy={vy} r={4} fill={SERIES[e.k]} stroke="#fffdf7" strokeWidth={2} />
                <g transform={`translate(${x(n) + 10} ${e.y - 9})`}>
                  <CharFace id={players[e.k].charId} size={20} />
                </g>
              </g>
            );
          })}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + PH} className="chart-cross" />
              {players.map((p, k) => (
                <circle key={p.id} cx={x(hover)} cy={y(history[hover][k])} r={4.5} fill={SERIES[k]} stroke="#fffdf7" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="chart-tip" style={{ left: `${Math.min(Math.max(tipLeft, 22), 70)}%` }}>
            <div className="chart-tip-title">{monthLabel(hover)}</div>
            {rows.map((r) => (
              <div key={r.k} className="chart-tip-row">
                <i style={{ background: SERIES[r.k] }} />
                <span>{r.p.name}</span>
                <b>{formatRyo(r.v)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="chart-hint">グラフを押すと、その月の 総資産が 見られるよ</p>
      <details className="chart-table">
        <summary>数字で見る（年の終わりごと）</summary>
        <table>
          <thead>
            <tr>
              <th />
              {players.map((p) => (
                <th key={p.id}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) =>
              i === 0 || i % 12 === 0 ? (
                <tr key={i}>
                  <th>{i === 0 ? 'スタート' : `${i / 12}年目`}</th>
                  {row.map((v, k) => (
                    <td key={k}>{formatRyo(v)}</td>
                  ))}
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}
