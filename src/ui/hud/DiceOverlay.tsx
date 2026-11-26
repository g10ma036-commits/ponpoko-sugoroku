import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sound';

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

export function Die({ value, size = 64, rolling = false }: { value: number; size?: number; rolling?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={rolling ? 'die rolling' : 'die'}>
      <rect x={5} y={8} width={90} height={90} rx={20} fill="#c9b79c" />
      <rect x={5} y={3} width={90} height={90} rx={20} fill="#fffdf7" stroke="#4a3426" strokeWidth={5} />
      {PIPS[value].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y - 2} r={value === 1 ? 13 : 9} fill={value === 1 ? '#e0524a' : '#4a3426'} />
      ))}
    </svg>
  );
}

/** サイコロをふったときの演出。rollId が変わるたびに再生する */
export function DiceOverlay({ rollId, dice, speed, sleepy = false }: { rollId: number; dice: number[]; speed: number; sleepy?: boolean }) {
  const [state, setState] = useState<'hidden' | 'rolling' | 'shown'>('hidden');
  const [faces, setFaces] = useState<number[]>(dice);

  useEffect(() => {
    if (dice.length === 0) return;
    sfx.dice();
    setState('rolling');
    const spin = window.setInterval(() => setFaces(dice.map(() => 1 + Math.floor(Math.random() * (sleepy ? 3 : 6)))), 70);
    const t1 = window.setTimeout(() => {
      window.clearInterval(spin);
      setFaces(dice);
      setState('shown');
    }, 650 / speed);
    const t2 = window.setTimeout(() => setState('hidden'), 1250 / speed);
    return () => {
      window.clearInterval(spin);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // rollId が変わったときだけ再生する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  if (state === 'hidden') return null;
  const total = dice.reduce((a, b) => a + b, 0);
  return (
    <div className="dice-overlay">
      <div className="dice-row">
        {faces.map((f, i) => (
          <Die key={i} value={f} size={dice.length > 2 ? 64 : 80} rolling={state === 'rolling'} />
        ))}
      </div>
      {state === 'shown' && <div className="dice-total">{total}マス すすむ！</div>}
      {sleepy && <div className="dice-sleepy">💤 ねむり中… 1〜3しか出ない</div>}
    </div>
  );
}
