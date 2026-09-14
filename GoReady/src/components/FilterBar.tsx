import React from 'react';
import type { BudgetRange, DurationRange, SearchFilterState, SortOption, TravelStyle } from '../types';

interface FilterBarProps {
  filters: SearchFilterState;
  onChange: (patch: Partial<SearchFilterState>) => void;
  resultCount: number;
}

const BUDGET_OPTIONS: { label: string; value: BudgetRange | 'all' }[] = [
  { label: 'Mọi ngân sách', value: 'all' },
  { label: 'Dưới 3 triệu', value: 'under-3' },
  { label: '3 - 5 triệu', value: '3-5' },
  { label: '5 - 10 triệu', value: '5-10' },
  { label: 'Trên 10 triệu', value: 'over-10' },
];

const DURATION_OPTIONS: { label: string; value: DurationRange | 'all' }[] = [
  { label: 'Mọi thời lượng', value: 'all' },
  { label: '1 - 2 ngày', value: '1-2' },
  { label: '3 - 4 ngày', value: '3-4' },
  { label: '5+ ngày', value: '5-plus' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Phổ biến nhất', value: 'popular' },
  { label: 'Giá tăng dần', value: 'price-asc' },
  { label: 'Giá giảm dần', value: 'price-desc' },
  { label: 'Đánh giá cao nhất', value: 'rating' },
];

const STYLES: TravelStyle[] = ['Biển đảo nghỉ dưỡng', 'Văn hóa & Lịch sử', 'Khám phá & Trekking', 'Nghỉ dưỡng gia đình', 'Ẩm thực đường phố'];

const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, resultCount }) => {
  const toggleStyle = (style: TravelStyle) => {
    const has = filters.styles.includes(style);
    onChange({ styles: has ? filters.styles.filter((s) => s !== style) : [...filters.styles, style] });
  };

  return (
    <div className="sticky top-16 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="container-px mx-auto flex flex-col gap-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.budget}
            onChange={(e) => onChange({ budget: e.target.value as BudgetRange | 'all' })}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 outline-none hover:border-primary"
          >
            {BUDGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                💰 {o.label}
              </option>
            ))}
          </select>
          <select
            value={filters.duration}
            onChange={(e) => onChange({ duration: e.target.value as DurationRange | 'all' })}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 outline-none hover:border-primary"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                🗓️ {o.label}
              </option>
            ))}
          </select>
          <div className="hidden h-5 w-px bg-slate-200 sm:block" />
          {STYLES.map((style) => (
            <button
              key={style}
              onClick={() => toggleStyle(style)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filters.styles.includes(style)
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
              }`}
            >
              {style}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">{resultCount} tour</span>
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ sortBy: e.target.value as SortOption })}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 outline-none hover:border-primary"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
