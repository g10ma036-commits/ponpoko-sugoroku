import type { ReactNode } from 'react';
import { sfx } from '../audio/sound';
import { CharShape } from '../characters/Characters';
import { formatRyo } from '../engine/format';
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
