// 日本列島の形（ゲーム用にデフォルメ）。輪郭は経度・緯度で書き、画面の座標に変換する。
// 本州が細長すぎて駅が並ばないので、北西〜南東の向きに少し太らせている。

/** 緯度1度あたりのピクセル */
const K = 200;
/** 経度1度の長さ（緯度36度あたりの cos） */
const LON = 0.82;
/** 北西〜南東の向きに太らせる倍率 */
const STRETCH = 1.5;
// 太らせる向き（本州の向きに垂直・南東向き）
const VX = 0.646;
const VY = 0.762;

function raw(lon: number, lat: number): [number, number] {
  const x = (lon - 129) * LON * K;
  const y = (46 - lat) * K;
  const d = (x * VX + y * VY) * (STRETCH - 1);
  return [x + d * VX, y + d * VY];
}

// 沖縄は本当の場所だと遠すぎるので、九州の南西に寄せて少し大きく描く
const OKINAWA_SHIFT = { lon: 1.6, lat: 3.0, scale: 1.7, cx: 127.95, cy: 26.45 };
function okinawa(lon: number, lat: number): [number, number] {
  const o = OKINAWA_SHIFT;
  return [o.cx + o.lon + (lon - o.cx) * o.scale, o.cy + o.lat + (lat - o.cy) * o.scale];
}

type LL = [number, number];

const HOKKAIDO: LL[] = [
  [141.94, 45.52], [142.4, 45.2], [142.97, 44.75], [143.6, 44.28], [144.3, 44.02], [144.85, 43.95], [145.3, 44.35],
  [145.15, 43.95], [145.25, 43.6], [145.82, 43.38], [145.25, 43.15], [144.4, 42.98], [143.75, 42.6], [143.32, 42.0],
  [142.6, 42.25], [141.65, 42.6], [141.0, 42.35], [140.55, 42.3], [140.6, 42.05], [141.15, 41.8], [140.72, 41.72],
  [140.1, 41.42], [140.0, 41.75], [139.85, 42.45], [140.05, 42.75], [140.5, 43.0], [140.35, 43.35], [141.0, 43.22],
  [141.35, 43.25], [141.45, 43.75], [141.65, 44.1], [141.7, 44.7], [141.65, 45.25],
];

const HONSHU: LL[] = [
  // 津軽・下北
  [140.35, 41.25], [140.62, 41.15], [140.75, 40.9], [141.1, 40.95], [140.95, 41.53], [141.46, 41.43], [141.42, 40.95],
  [141.55, 40.5],
  // 三陸〜関東
  [141.85, 40.0], [142.07, 39.55], [141.9, 39.1], [141.6, 38.75], [141.5, 38.35], [141.05, 38.2], [141.0, 37.7],
  [141.03, 37.1], [140.85, 36.75], [140.6, 36.3], [140.85, 35.75], [140.45, 35.35], [140.0, 34.92], [139.85, 35.3],
  [140.05, 35.6], [139.78, 35.65], [139.65, 35.4], [139.62, 35.13], [139.3, 35.3], [139.1, 35.12],
  // 伊豆〜紀伊
  [138.85, 34.6], [138.75, 35.05], [138.5, 34.95], [138.2, 34.6], [137.6, 34.68], [137.05, 34.58], [137.1, 34.8],
  [136.85, 35.05], [136.6, 34.8], [136.85, 34.45], [136.82, 34.25], [136.35, 34.1], [135.95, 33.6], [135.76, 33.44],
  [135.35, 33.7], [135.05, 34.25],
  // 瀬戸内
  [135.3, 34.6], [135.0, 34.68], [134.65, 34.75], [134.15, 34.62], [133.75, 34.5], [133.2, 34.38], [132.5, 34.3],
  [132.15, 34.1], [131.8, 34.0], [131.25, 33.95], [130.9, 33.93],
  // 日本海側
  [130.92, 34.25], [131.4, 34.45], [131.85, 34.7], [132.4, 35.15], [132.65, 35.42], [133.05, 35.58], [133.4, 35.52],
  [134.2, 35.55], [134.85, 35.65], [135.25, 35.78], [135.55, 35.5], [136.05, 35.68], [136.15, 36.25], [136.6, 36.6],
  [136.75, 37.1], [137.25, 37.5], [137.05, 37.08], [137.2, 36.78], [137.85, 37.03], [138.25, 37.17], [138.6, 37.4],
  [139.05, 37.92], [139.45, 38.25], [139.8, 38.9], [140.0, 39.6], [139.7, 39.95], [140.0, 40.25], [139.92, 40.62],
  [140.2, 40.82],
];

const SHIKOKU: LL[] = [
  [134.05, 34.36], [134.45, 34.25], [134.62, 34.18], [134.7, 33.9], [134.3, 33.45], [134.18, 33.25], [133.75, 33.5],
  [133.25, 33.3], [133.0, 32.75], [132.7, 32.92], [132.5, 33.2], [132.4, 33.45], [132.0, 33.34], [132.4, 33.55],
  [132.7, 33.85], [133.0, 34.08], [133.3, 33.97], [133.65, 34.15], [133.85, 34.3],
];

const KYUSHU: LL[] = [
  [130.95, 33.95], [131.0, 33.8], [131.25, 33.6], [131.7, 33.62], [131.65, 33.3], [131.92, 33.2], [131.9, 32.95],
  [131.68, 32.58], [131.45, 31.92], [131.33, 31.37], [131.05, 31.45], [130.67, 31.0], [130.65, 31.5], [130.55, 31.18],
  [130.18, 31.38], [130.27, 31.72], [130.2, 32.02], [130.58, 32.5], [130.62, 32.8], [130.38, 32.75], [130.18, 32.62],
  [129.85, 32.72], [129.72, 32.6], [129.68, 32.95], [129.72, 33.18], [129.55, 33.38], [129.97, 33.47], [130.38, 33.62],
  [130.65, 33.9],
];

const OKINAWA: LL[] = [
  [128.26, 26.87], [128.3, 26.65], [128.1, 26.45], [127.95, 26.3], [127.82, 26.15], [127.68, 26.08], [127.66, 26.12],
  [127.67, 26.21], [127.72, 26.44], [127.87, 26.6], [127.85, 26.7], [128.0, 26.75],
];

const SADO: LL[] = [[138.25, 38.2], [138.5, 38.33], [138.55, 38.05], [138.5, 37.82], [138.25, 37.8], [138.38, 38.0]];
const AWAJI: LL[] = [[134.95, 34.6], [135.0, 34.45], [134.85, 34.2], [134.7, 34.25], [134.85, 34.45]];
const BIWA: LL[] = [[136.06, 35.49], [136.25, 35.45], [136.1, 35.2], [135.92, 35.05], [135.95, 35.25], [136.0, 35.4]];

// ---- 画面の座標へ（左上に余白をとる）
const ALL_RAW = [HOKKAIDO, HONSHU, SHIKOKU, KYUSHU, OKINAWA.map(([a, b]) => okinawa(a, b)), SADO, AWAJI].flat().map(([a, b]) => raw(a, b));
const MARGIN = 170;
const MIN_X = Math.min(...ALL_RAW.map((p) => p[0]));
const MIN_Y = Math.min(...ALL_RAW.map((p) => p[1]));

/** 経度・緯度 → 地図の座標 */
export function geo(lon: number, lat: number): [number, number] {
  const [x, y] = raw(lon, lat);
  return [Math.round(x - MIN_X + MARGIN), Math.round(y - MIN_Y + MARGIN)];
}
/** 沖縄の経度・緯度 → 地図の座標（寄せて大きくしたぶんを含む） */
export function geoOkinawa(lon: number, lat: number): [number, number] {
  return geo(...okinawa(lon, lat));
}

const toXY = (pts: LL[]) => pts.map(([a, b]) => geo(a, b));

export interface Island {
  id: string;
  points: [number, number][];
  /** 雪景色 */
  snowy?: boolean;
}

export const ISLANDS: Island[] = [
  { id: 'hokkaido', points: toXY(HOKKAIDO), snowy: true },
  { id: 'honshu', points: toXY(HONSHU) },
  { id: 'shikoku', points: toXY(SHIKOKU) },
  { id: 'kyushu', points: toXY(KYUSHU) },
  { id: 'okinawa', points: OKINAWA.map(([a, b]) => geoOkinawa(a, b)) },
  { id: 'sado', points: toXY(SADO) },
  { id: 'awaji', points: toXY(AWAJI) },
];

export const LAKES: [number, number][][] = [toXY(BIWA)];

/** なめらかな輪郭（描くときと同じ曲線）を細かい折れ線にしたもの。陸かどうかの判定に使う */
function densify(pts: [number, number][], per = 8): [number, number][] {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const u = 1 - t;
      out.push([
        u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2,
        u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2,
      ]);
    }
  }
  return out;
}
const LAND_POLYS = ISLANDS.map((i) => densify(i.points));
const LAKE_POLYS = LAKES.map((l) => densify(l));

/** 輪郭の線分（外枠つき）。遠い線分をまとめて飛ばして、距離の計算を速くする */
interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
const SEGS: Seg[] = [...LAND_POLYS, ...LAKE_POLYS].flatMap((poly) =>
  poly.map(([ax, ay], i) => {
    const [bx, by] = poly[(i + 1) % poly.length];
    return { ax, ay, bx, by, x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by) };
  }),
);
const bbox = (poly: [number, number][]) => ({
  x0: Math.min(...poly.map((p) => p[0])),
  x1: Math.max(...poly.map((p) => p[0])),
  y0: Math.min(...poly.map((p) => p[1])),
  y1: Math.max(...poly.map((p) => p[1])),
});
const LAND_BOX = LAND_POLYS.map(bbox);
const LAKE_BOX = LAKE_POLYS.map(bbox);
const inBox = (b: { x0: number; x1: number; y0: number; y1: number }, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

const ALL = ISLANDS.flatMap((i) => i.points);
export const MAP_W = Math.max(...ALL.map((p) => p[0])) + MARGIN;
export const MAP_H = Math.max(...ALL.map((p) => p[1])) + MARGIN;

/** 点が陸の上か（湖は陸に含めない） */
export function onLand(x: number, y: number): boolean {
  return LAND_POLYS.some((poly, i) => inBox(LAND_BOX[i], x, y) && inside(poly, x, y)) && !LAKE_POLYS.some((l, i) => inBox(LAKE_BOX[i], x, y) && inside(l, x, y));
}

/** 陸の端（海岸線）までの距離。海の上ならマイナス */
export function coastDistance(x: number, y: number): number {
  let best = Infinity;
  for (const s of SEGS) {
    const dx = Math.max(s.x0 - x, 0, x - s.x1);
    const dy = Math.max(s.y0 - y, 0, y - s.y1);
    if (dx * dx + dy * dy >= best * best) continue;
    best = Math.min(best, segDist(x, y, s.ax, s.ay, s.bx, s.by));
  }
  return onLand(x, y) ? best : -best;
}

function inside(poly: [number, number][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** なめらかな輪郭の SVG パス（Catmull-Rom 曲線） */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M${p(0)[0]},${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2},${y2}`;
  }
  return `${d} Z`;
}
