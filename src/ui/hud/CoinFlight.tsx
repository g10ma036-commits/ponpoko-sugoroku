// 物件を買ったとき、小判が プレイヤーの所持金から 駅へ ぴゅーっと飛んでいく。
import { useEffect, useRef } from 'react';

export interface Flight {
  key: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const COINS = 7;
const MS = 700;

export function CoinFlight({ flight, onDone }: { flight: Flight; onDone: (key: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { from, to } = flight;
    const kids = [...el.children] as HTMLElement[];
    kids.forEach((c, i) => {
      const jx = ((i * 37) % 60) - 30;
      const mx = (from.x + to.x) / 2 + jx;
      const my = Math.min(from.y, to.y) - 50 - ((i * 23) % 40);
      c.animate(
        [
          { transform: `translate(${from.x}px, ${from.y}px) scale(0.5)`, opacity: 0 },
          { transform: `translate(${from.x + jx * 0.3}px, ${from.y + 10}px) scale(0.9)`, opacity: 1, offset: 0.12 },
          { transform: `translate(${mx}px, ${my}px) scale(1.1) rotate(${i % 2 ? 160 : -160}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(0.7) rotate(${i % 2 ? 320 : -320}deg)`, opacity: 1, offset: 0.92 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(0.3)`, opacity: 0 },
        ],
        { duration: MS, delay: i * 55, easing: 'ease-in-out', fill: 'both' },
      );
    });
    const t = window.setTimeout(() => onDone(flight.key), MS + COINS * 55 + 50);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="coin-flight" ref={ref} aria-hidden="true">
      {Array.from({ length: COINS }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}
