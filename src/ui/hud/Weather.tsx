// 季節の天気。月に合わせて、画面の上を 雪・桜・雨・ほたる・紅葉 が舞う。
// どれも CSS アニメーションだけで動く（押しても下の盤面にとどく）。
import type { CSSProperties } from 'react';

export type Season = 'snow' | 'sakura' | 'rain' | 'firefly' | 'leaf';

export function seasonOf(month: number): Season {
  if (month === 12 || month <= 2) return 'snow';
  if (month <= 5) return 'sakura';
  if (month === 6) return 'rain';
  if (month <= 8) return 'firefly';
  return 'leaf';
}

export const SEASON_NAME: Record<Season, string> = { snow: '❄️ 冬', sakura: '🌸 春', rain: '☔ 梅雨', firefly: '🌙 夏', leaf: '🍁 秋' };

const COUNT: Record<Season, number> = { snow: 26, sakura: 18, rain: 32, firefly: 14, leaf: 14 };
/** 1つぶが 上から下まで落ちる秒数 */
const FALL: Record<Season, [number, number]> = { snow: [7, 13], sakura: [6, 11], rain: [0.55, 0.9], firefly: [5, 9], leaf: [6, 11] };
const LEAF = ['#e2502f', '#f08a24', '#f4b62c', '#c9442a', '#e86a2c'];
const PETAL = ['#ffc4d6', '#ffb0c8', '#ffd9e4'];

/** 番号ごとに決まった 0〜1 の数（毎回同じ並びになる） */
const r = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function Weather({ month, className = '' }: { month: number; className?: string }) {
  const season = seasonOf(month);
  const [lo, hi] = FALL[season];
  return (
    <div className={`weather weather-${season} ${className}`} aria-hidden="true">
      {Array.from({ length: COUNT[season] }, (_, i) => {
        const size = 0.6 + r(i, 3) * 0.7;
        const style = {
          left: `${r(i, 1) * 100}%`,
          top: season === 'firefly' ? `${15 + r(i, 6) * 75}%` : undefined,
          animationDuration: `${lo + r(i, 2) * (hi - lo)}s`,
          animationDelay: `${-r(i, 4) * hi}s`,
          ['--s' as string]: size,
          ['--sway' as string]: `${(r(i, 5) - 0.5) * 120}px`,
          ['--rot' as string]: `${(r(i, 7) - 0.5) * 900}deg`,
        } as CSSProperties;
        return (
          <i key={i} style={style}>
            {season === 'sakura' && <b style={{ background: PETAL[i % PETAL.length] }} />}
            {season === 'leaf' && (
              <svg viewBox="0 0 20 20" width={18} height={18}>
                <path
                  d="M10 1 L12 6 L17 4 L15 9 L19 11 L14 12 L15 17 L10 14 L5 17 L6 12 L1 11 L5 9 L3 4 L8 6 Z"
                  fill={LEAF[i % LEAF.length]}
                  stroke="rgba(74,52,38,0.45)"
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
                <path d="M10 14 L10 19" stroke="rgba(74,52,38,0.6)" strokeWidth={1.4} strokeLinecap="round" />
              </svg>
            )}
          </i>
        );
      })}
    </div>
  );
}
