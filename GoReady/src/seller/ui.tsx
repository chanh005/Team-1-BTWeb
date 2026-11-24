import React from 'react';

// Thành phần dùng chung của Seller Center: nền #F8FAFC, chữ #1E293B, nút chính #3D72BB (bo tròn hoàn toàn), thẻ bo 12px.

export const inputClass = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary ${
    error ? 'border-red-400' : 'border-slate-200'
  }`;

export const primaryBtn =
  'rounded-full bg-[#3D72BB] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60';
export const outlineBtn =
  'rounded-full border border-[#3D72BB] bg-white px-5 py-2 text-sm font-semibold text-[#3D72BB] transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60';

export const Card: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = '', id }) => (
  <section id={id} className={`rounded-xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
    {children}
  </section>
);

/** Nhãn + ô nhập + lỗi ngay dưới ô. `name` dùng để cuộn tới ô lỗi đầu tiên. */
export const Field: React.FC<{ label: string; name: string; error?: string; hint?: string; className?: string; children: React.ReactNode }> = ({
  label, name, error, hint, className = '', children,
}) => (
  <div className={`flex flex-col gap-1 ${className}`} data-field={name}>
    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
    {children}
    {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
  </div>
);

export const Logo: React.FC<{ sub?: string }> = ({ sub = 'Dành cho doanh nghiệp' }) => (
  <a href="#/" className="flex items-center gap-2">
    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-lg font-bold text-white">G</span>
    <span className="text-lg font-bold text-slate-900">GoReady</span>
    <span className="hidden text-sm text-slate-500 sm:inline">· {sub}</span>
  </a>
);

export const Tag: React.FC<{ children: React.ReactNode; tone?: 'default' | 'ok' | 'warn' | 'bad' | 'muted' }> = ({ children, tone = 'default' }) => {
  const tones = {
    default: 'border-slate-400 text-slate-700',
    ok: 'border-emerald-500 text-emerald-700',
    warn: 'border-amber-500 text-amber-700',
    bad: 'border-red-400 text-red-600',
    muted: 'border-slate-300 text-slate-500',
  };
  return <span className={`inline-block whitespace-nowrap rounded-full border px-3 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};
