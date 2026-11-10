import React from 'react';
import type { GroupSizeTag, SearchFilterState } from '../types';

interface HeroSearchProps {
  filters: SearchFilterState;
  onChange: (patch: Partial<SearchFilterState>) => void;
  onSearch: () => void;
}

const GROUP_OPTIONS: { label: string; value: GroupSizeTag | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đi 1 mình', value: 'Solo' },
  { label: 'Cặp đôi', value: 'Cặp đôi' },
  { label: 'Gia đình', value: 'Gia đình' },
  { label: 'Nhóm bạn', value: 'Nhóm bạn' },
];

const HeroSearch: React.FC<HeroSearchProps> = ({ filters, onChange, onSearch }) => {
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-cream/20 blur-3xl" />
      <div className="container-px relative mx-auto py-14 sm:py-20">
        <h1 className="max-w-2xl font-heading text-3xl font-bold leading-tight sm:text-5xl">
          Sẵn sàng cho hành trình tiếp theo cùng <span className="text-cream">GoReady</span>
        </h1>

        <div className="mt-8 rounded-2xl bg-white p-4 shadow-card sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="sm:col-span-2 flex flex-col gap-1 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-primary">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Điểm đến</span>
              <input
                value={filters.destination}
                onChange={(e) => onChange({ destination: e.target.value })}
                onKeyDown={onEnter}
                placeholder="Đà Nẵng, Phú Quốc, Tokyo..."
                className="bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="flex flex-col gap-1 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-primary">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ngày khởi hành</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ dateFrom: e.target.value })}
                onKeyDown={onEnter}
                className="bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-primary">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quy mô đoàn</span>
              <select
                value={filters.groupSize}
                onChange={(e) => onChange({ groupSize: e.target.value as GroupSizeTag | 'all' })}
                className="bg-transparent text-sm text-slate-800 outline-none"
              >
                {GROUP_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={onSearch}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 sm:w-auto sm:px-10"
          >
            Tìm tour ngay
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
