// シード付き乱数（mulberry32）。状態は GameState.rng に保存するので、
// セーブから再開しても同じ展開になり、テストでも再現できる。

export interface RngHolder {
  rng: number;
}

/** 0以上1未満の乱数を返し、holder.rng を進める */
export function rand(h: RngHolder): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** min 以上 max 以下の整数 */
export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(h) * (max - min + 1));
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(rand(h) * arr.length)];
}

/** weights に比例した確率で添字を選ぶ */
export function pickWeighted(h: RngHolder, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(h) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export function newSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
