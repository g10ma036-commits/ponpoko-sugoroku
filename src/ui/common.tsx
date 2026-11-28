import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../audio/sound';
import { CharShape } from '../characters/Characters';
import { formatRyo, signedRyo } from '../engine/format';
import type { Expr, SpeakerId } from '../engine/types';

/** 顔のアップ（頭だけを切り取って表示） */
export function CharFace({ id, expr = 'normal', size = 44, className }: { id: SpeakerId; expr?: Expr; size?: number; className?: string }) {
  return (
    <svg viewBox="4 -6 112 104" width={size} height={size * (104 / 112)} className={className} aria-hidden="true">
      <CharShape id={id} expr={expr} />
    </svg>
  );
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`money ${value < 0 ? 'neg' : ''} ${className}`}>{formatRyo(value)}</span>;
}

/** 数字を from から to へ、なめらかに動かす（お金のカウントアップ） */
export function useCountUp(value: number, ms = 700, from?: number): number {
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(from ?? value);
  useEffect(() => {
    const start = shownRef.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - t) ** 3;
      const v = t < 1 ? Math.round((start + (value - start) * e) / 10) * 10 : value;
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** 所持金の表示。増えると金色に光り、減ると赤くゆれて、増減の額がふわっと出る */
export function AnimatedMoney({ value, className = '' }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  const last = useRef(value);
  const [pop, setPop] = useState<{ d: number; k: number } | null>(null);
  useEffect(() => {
    const d = value - last.current;
    last.current = value;
    if (d === 0) return;
    const k = Date.now() + Math.random();
    setPop({ d, k });
    const t = window.setTimeout(() => setPop((p) => (p?.k === k ? null : p)), 1400);
    return () => window.clearTimeout(t);
  }, [value]);
  const dir = pop ? (pop.d > 0 ? 'up' : 'down') : '';
  return (
    <span className={`money-anim ${dir}`}>
      <span key={pop?.k} className={`money ${shown < 0 ? 'neg' : ''} ${className}`}>
        {formatRyo(shown)}
      </span>
      {pop && (
        <span key={`p${pop.k}`} className={`money-pop ${dir}`}>
          {signedRyo(pop.d)}
        </span>
      )}
    </span>
  );
}

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  big?: boolean;
}

export function Btn({ children, onClick, variant = 'secondary', disabled, className = '', big }: BtnProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${big ? 'btn-big' : ''} ${className}`}
      disabled={disabled}
      onClick={() => {
        sfx.tap();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

/** 「〜しますか？」の確認。まわりを押すか「やめる」で取り消し */
export function ConfirmDialog({
  icon,
  title,
  children,
  okLabel,
  onOk,
  onCancel,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  okLabel: string;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">{icon}</div>
        <div className="confirm-title">{title}</div>
        {children}
        <div className="confirm-btns">
          <Btn onClick={onCancel} className="confirm-no">
            やめる
          </Btn>
          <Btn variant="primary" onClick={onOk} className="confirm-yes">
            {okLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/** 画面下からせり上がるパネル */
export function Sheet({ title, children, footer, onClose }: { title: ReactNode; children: ReactNode; footer?: ReactNode; onClose?: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          {onClose && (
            <button type="button" className="sheet-close" onClick={onClose} aria-label="とじる">
              ×
            </button>
          )}
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`seg-btn ${o.value === value ? 'on' : ''}`}
          onClick={() => {
            sfx.tap();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
