// お祝いの演出（紙ふぶき・花火）。どちらも CSS アニメーションだけで動く。

const PARTY = ['#ff5a5a', '#ffc93c', '#4fc3f7', '#81c784', '#ba68c8', '#ff8a65'];

/** 上からふってくる紙ふぶき */
export function Confetti({ colors = PARTY, count = 36 }: { colors?: string[]; count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.08}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}

/** 夜空の花火（いくつかの場所で、時間をずらして ぱっと開く） */
const BURSTS = [
  { x: 22, y: 20, c: '#ffc93c', d: 0 },
  { x: 76, y: 16, c: '#ff5a5a', d: 0.35 },
  { x: 50, y: 30, c: '#4fc3f7', d: 0.7 },
  { x: 16, y: 44, c: '#ba68c8', d: 1.05 },
  { x: 84, y: 40, c: '#81c784', d: 1.4 },
];
const SPARKS = 14;

export function Fireworks() {
  return (
    <div className="fireworks" aria-hidden="true">
      {BURSTS.map((b, i) => (
        <div key={i} className="burst" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s` }}>
          {Array.from({ length: SPARKS }, (_, k) => (
            <i
              key={k}
              style={{
                background: k % 3 === 0 ? '#fff6c8' : b.c,
                ['--a' as string]: `${(k / SPARKS) * 360}deg`,
                animationDelay: `${b.d}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
