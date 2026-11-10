import React from 'react';
import type { DurationRange, GroupSizeTag, SortOption, Tour, TravelStyle } from '../types';

export interface TourFilterState {
  destination: string;
  priceRange: [number, number]; // [min, max]
  durations: DurationRange[];
  sortBy: SortOption;
  minRating?: number; // e.g. 4.5
  onlyPopular?: boolean; // bookingCount threshold
  styles?: TravelStyle[];
  groupSize?: GroupSizeTag | 'all';
}

interface TourFilterProps {
  tours: Tour[];
  filters: TourFilterState;
  onChange: (patch: Partial<TourFilterState>) => void;
  onReset: () => void;
  resultCount?: number;
}

export const formatPriceVND = (val: number): string => {
  if (isNaN(val) || val <= 0) return '0đ';
  return `${Math.round(val).toLocaleString('vi-VN')}đ`;
};

export const getPriceOfTour = (t: Tour): number => t.discountPrice ?? t.price;

const DURATION_CONFIG: { id: DurationRange; label: string; filterFn: (d: number) => boolean }[] = [
  { id: '1-2', label: '1 - 2 ngày', filterFn: (d) => d >= 1 && d <= 2 },
  { id: '3-4', label: '3 - 4 ngày', filterFn: (d) => d >= 3 && d <= 4 },
  { id: '5-plus', label: '5+ ngày', filterFn: (d) => d >= 5 },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Phổ biến nhất (lượt đặt cao)' },
  { value: 'rating', label: 'Đánh giá cao nhất (theo sao)' },
  { value: 'price-asc', label: 'Giá tăng dần (thấp đến cao)' },
  { value: 'price-desc', label: 'Giá giảm dần (cao đến thấp)' },
];

const STYLES: TravelStyle[] = [
  'Biển đảo nghỉ dưỡng',
  'Văn hóa & Lịch sử',
  'Khám phá & Trekking',
  'Nghỉ dưỡng gia đình',
  'Ẩm thực đường phố',
];

export const TourFilter: React.FC<TourFilterProps> = ({
  tours,
  filters,
  onChange,
  onReset,
  resultCount,
}) => {
  // Accordion open/close state for each group
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    budget: true,
    destination: true,
    duration: true,
    popularity: true,
    styles: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Calculate min and max price across ALL tours (handling edge cases)
  const { minBound, maxBound, hasTours, isSamePrice } = React.useMemo(() => {
    const validPrices = tours
      .map(getPriceOfTour)
      .filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0);

    if (validPrices.length === 0) {
      return { minBound: 0, maxBound: 0, hasTours: false, isSamePrice: true };
    }

    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    return {
      minBound: min,
      maxBound: max,
      hasTours: true,
      isSamePrice: min === max,
    };
  }, [tours]);

  // Step for slider: 100,000 VND
  const priceStep = 100000;

  // Local state for instant thumb response and smooth dragging (Debounced to parent)
  const [localPriceRange, setLocalPriceRange] = React.useState<[number, number]>(filters.priceRange);

  // Sync local price range when external filters change (e.g. Reset or initial load)
  React.useEffect(() => {
    setLocalPriceRange(filters.priceRange);
  }, [filters.priceRange[0], filters.priceRange[1]]);

  // Debounce the price slider changes (250ms) to prevent unnecessary re-filtering on every pixel drag
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (
        localPriceRange[0] !== filters.priceRange[0] ||
        localPriceRange[1] !== filters.priceRange[1]
      ) {
        onChange({ priceRange: localPriceRange });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [localPriceRange[0], localPriceRange[1]]);

  const currentMin = Math.max(minBound, Math.min(localPriceRange[0], maxBound));
  const currentMax = Math.min(maxBound, Math.max(localPriceRange[1], minBound));

  // 2. Extract unique destinations from all tours
  const destinationList = React.useMemo(() => {
    const set = new Set<string>();
    tours.forEach((t) => {
      if (t.destination && t.destination.trim()) set.add(t.destination.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [tours]);

  // Faceted filtering helper matchers (AND across groups, OR within checkbox group)
  const matchDest = React.useCallback((t: Tour, dest: string) => {
    if (!dest) return true;
    const q = dest.toLowerCase();
    return (
      t.destination.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.country.toLowerCase().includes(q)
    );
  }, []);

  const matchPrice = React.useCallback(
    (t: Tour, range: [number, number]) => {
      if (!hasTours || isSamePrice) return true;
      if (range[0] <= minBound && range[1] >= maxBound) return true;
      const p = getPriceOfTour(t);
      if (typeof p !== 'number' || isNaN(p) || p <= 0) return false;
      return p >= range[0] && p <= range[1];
    },
    [hasTours, isSamePrice, minBound, maxBound]
  );

  const matchDuration = React.useCallback((t: Tour, durations: DurationRange[]) => {
    if (!durations || durations.length === 0) return true;
    // Cùng nhóm checkbox: OR
    return durations.some((id) => {
      if (id === '1-2') return t.duration >= 1 && t.duration <= 2;
      if (id === '3-4') return t.duration >= 3 && t.duration <= 4;
      if (id === '5-plus') return t.duration >= 5;
      return false;
    });
  }, []);

  const matchPopularity = React.useCallback((t: Tour, onlyPop?: boolean, rating?: number) => {
    if (!onlyPop && !rating) return true;
    // Cùng nhóm checkbox: OR
    const conditions: boolean[] = [];
    if (onlyPop) conditions.push((t.bookingCount ?? 0) >= 100);
    if (rating) conditions.push((t.rating ?? 0) >= rating);
    return conditions.some(Boolean);
  }, []);

  const matchStyles = React.useCallback((t: Tour, styles?: TravelStyle[]) => {
    if (!styles || styles.length === 0) return true;
    // Cùng nhóm checkbox: OR
    return styles.some((s) => t.styleTags.includes(s));
  }, []);

  // Dynamic Faceted Counts:
  // 1. Duration counts (matching destination, price, popularity, styles)
  const durationCounts = React.useMemo(() => {
    const counts: Record<DurationRange, number> = { '1-2': 0, '3-4': 0, '5-plus': 0 };
    tours.forEach((t) => {
      if (
        matchDest(t, filters.destination) &&
        matchPrice(t, localPriceRange) &&
        matchPopularity(t, filters.onlyPopular, filters.minRating) &&
        matchStyles(t, filters.styles)
      ) {
        DURATION_CONFIG.forEach((cfg) => {
          if (cfg.filterFn(t.duration)) counts[cfg.id]++;
        });
      }
    });
    return counts;
  }, [tours, filters.destination, localPriceRange, filters.onlyPopular, filters.minRating, filters.styles, matchDest, matchPrice, matchPopularity, matchStyles]);

  // 2. Destination counts (matching price, duration, popularity, styles)
  const destinationCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    tours.forEach((t) => {
      if (
        matchPrice(t, localPriceRange) &&
        matchDuration(t, filters.durations) &&
        matchPopularity(t, filters.onlyPopular, filters.minRating) &&
        matchStyles(t, filters.styles)
      ) {
        if (t.destination) {
          counts[t.destination] = (counts[t.destination] || 0) + 1;
        }
      }
    });
    return counts;
  }, [tours, localPriceRange, filters.durations, filters.onlyPopular, filters.minRating, filters.styles, matchPrice, matchDuration, matchPopularity, matchStyles]);

  // 3. Popularity counts (matching destination, price, duration, styles)
  const popularCount = React.useMemo(() => {
    return tours.filter(
      (t) =>
        matchDest(t, filters.destination) &&
        matchPrice(t, localPriceRange) &&
        matchDuration(t, filters.durations) &&
        matchStyles(t, filters.styles) &&
        (t.bookingCount ?? 0) >= 100
    ).length;
  }, [tours, filters.destination, localPriceRange, filters.durations, filters.styles, matchDest, matchPrice, matchDuration, matchStyles]);

  const highRatingCount = React.useMemo(() => {
    return tours.filter(
      (t) =>
        matchDest(t, filters.destination) &&
        matchPrice(t, localPriceRange) &&
        matchDuration(t, filters.durations) &&
        matchStyles(t, filters.styles) &&
        (t.rating ?? 0) >= 4.5
    ).length;
  }, [tours, filters.destination, localPriceRange, filters.durations, filters.styles, matchDest, matchPrice, matchDuration, matchStyles]);

  // Calculate percentages for slider track highlight
  const leftPercent =
    maxBound > minBound ? Math.round(((currentMin - minBound) / (maxBound - minBound)) * 100) : 0;
  const rightPercent =
    maxBound > minBound ? Math.round(((currentMax - minBound) / (maxBound - minBound)) * 100) : 100;

  // Toggle duration checkbox (Cùng nhóm: OR)
  const handleToggleDuration = (d: DurationRange) => {
    const exists = filters.durations.includes(d);
    const updated = exists ? filters.durations.filter((x) => x !== d) : [...filters.durations, d];
    onChange({ durations: updated });
  };

  // Toggle style tag (Cùng nhóm: OR)
  const handleToggleStyle = (style: TravelStyle) => {
    const currentStyles = filters.styles ?? [];
    const exists = currentStyles.includes(style);
    onChange({
      styles: exists ? currentStyles.filter((s) => s !== style) : [...currentStyles, style],
    });
  };

  // Check if any filter is active compared to defaults
  const isFilterActive =
    filters.destination !== '' ||
    filters.durations.length > 0 ||
    filters.sortBy !== 'popular' ||
    (filters.styles && filters.styles.length > 0) ||
    Boolean(filters.onlyPopular) ||
    Boolean(filters.minRating) ||
    (hasTours && (localPriceRange[0] > minBound || localPriceRange[1] < maxBound));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <h3 className="font-heading text-lg font-bold text-slate-900">Bộ lọc</h3>
          {typeof resultCount === 'number' && (
            <span className="text-xs text-slate-400 font-medium">({resultCount} tour)</span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!isFilterActive}
          className={`text-xs font-semibold transition-colors ${
            isFilterActive
              ? 'text-primary hover:text-primary-700 hover:underline cursor-pointer'
              : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          Đặt lại
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {/* GROUP 1: Ngân sách (Dual Range Slider với Debounce) */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleGroup('budget')}
            className="flex w-full items-center justify-between text-left font-heading text-sm font-bold text-slate-800 transition hover:text-primary"
          >
            <span>Ngân sách</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                openGroups.budget ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openGroups.budget && (
            <div className="mt-4 pt-1">
              {!hasTours ? (
                <p className="text-xs text-slate-400 italic">Không có dữ liệu tour</p>
              ) : isSamePrice ? (
                <div className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600">
                  Tất cả tour hiện có đồng giá:{' '}
                  <span className="font-bold text-primary">{formatPriceVND(minBound)}</span>
                </div>
              ) : (
                <div className="px-1">
                  {/* Dual Range Slider Component */}
                  <div className="relative flex items-center h-6">
                    {/* Background track */}
                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200" />
                    {/* Selected range highlight */}
                    <div
                      className="absolute h-1.5 rounded-full bg-primary transition-all duration-75"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(0, rightPercent - leftPercent)}%`,
                      }}
                    />

                    {/* Left Thumb */}
                    <input
                      type="range"
                      min={minBound}
                      max={maxBound}
                      step={priceStep}
                      value={currentMin}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), currentMax - priceStep);
                        setLocalPriceRange([val, currentMax]);
                      }}
                      className="pointer-events-none absolute inset-x-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-125 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                    />

                    {/* Right Thumb */}
                    <input
                      type="range"
                      min={minBound}
                      max={maxBound}
                      step={priceStep}
                      value={currentMax}
                      onChange={(e) => {
                        const val = Math.max(Number(e.target.value), currentMin + priceStep);
                        setLocalPriceRange([currentMin, val]);
                      }}
                      className="pointer-events-none absolute inset-x-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-125 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                    />
                  </div>

                  {/* Prices at both ends */}
                  <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="rounded bg-slate-50 px-2 py-0.5 text-primary-800">
                      {formatPriceVND(currentMin)}
                    </span>
                    <span className="rounded bg-slate-50 px-2 py-0.5 text-primary-800">
                      {formatPriceVND(currentMax)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GROUP 2: Điểm đến */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleGroup('destination')}
            className="flex w-full items-center justify-between text-left font-heading text-sm font-bold text-slate-800 transition hover:text-primary"
          >
            <span>Điểm đến</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                openGroups.destination ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openGroups.destination && (
            <div className="mt-3.5 space-y-3">
              {/* Dropdown with placeholder and chevron icon */}
              <div className="relative">
                <select
                  value={filters.destination}
                  onChange={(e) => onChange({ destination: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-xs font-medium text-slate-700 outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">Tất cả điểm đến</option>
                  {destinationList.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest} ({destinationCounts[dest] ?? 0})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Destination Chips sync */}
              {destinationList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {destinationList.slice(0, 6).map((dest) => {
                    const isSelected = filters.destination.toLowerCase() === dest.toLowerCase();
                    const count = destinationCounts[dest] ?? 0;
                    return (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => onChange({ destination: isSelected ? '' : dest })}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                        }`}
                      >
                        {dest} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* GROUP 3: Thời gian (Checkbox gom nhóm, Cùng nhóm: OR) */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleGroup('duration')}
            className="flex w-full items-center justify-between text-left font-heading text-sm font-bold text-slate-800 transition hover:text-primary"
          >
            <span>Thời gian</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                openGroups.duration ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openGroups.duration && (
            <div className="mt-3 space-y-2">
              {DURATION_CONFIG.map(({ id, label }) => {
                const isChecked = filters.durations.includes(id);
                const count = durationCounts[id] ?? 0;
                return (
                  <label
                    key={id}
                    onClick={() => handleToggleDuration(id)}
                    className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-slate-700 select-none group"
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isChecked
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-300 bg-white group-hover:border-primary'
                      }`}
                    >
                      {isChecked && (
                        <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-xs group-hover:text-primary transition-colors">
                      {label}
                    </span>
                    <span className="ml-auto text-xs text-slate-400 font-normal">
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* GROUP 4: Phổ biến & Sắp xếp (Cùng nhóm checkbox: OR) */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleGroup('popularity')}
            className="flex w-full items-center justify-between text-left font-heading text-sm font-bold text-slate-800 transition hover:text-primary"
          >
            <span>Phổ biến & Sắp xếp</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                openGroups.popularity ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openGroups.popularity && (
            <div className="mt-3.5 space-y-3">
              {/* Dropdown for Sort Option */}
              <div className="relative">
                <select
                  value={filters.sortBy}
                  onChange={(e) => onChange({ sortBy: e.target.value as SortOption })}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-xs font-medium text-slate-700 outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Checkboxes based on bookingCount & rating (Cùng nhóm checkbox: OR) */}
              <div className="space-y-2 pt-1 border-t border-slate-50">
                <label
                  onClick={() => onChange({ onlyPopular: !filters.onlyPopular })}
                  className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-slate-700 select-none group"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      filters.onlyPopular
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white group-hover:border-primary'
                    }`}
                  >
                    {filters.onlyPopular && (
                      <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-xs group-hover:text-primary transition-colors">
                    Nhiều lượt đặt nhất
                  </span>
                  <span className="ml-auto text-xs text-slate-400 font-normal">
                    ({popularCount})
                  </span>
                </label>

                <label
                  onClick={() => onChange({ minRating: filters.minRating === 4.5 ? undefined : 4.5 })}
                  className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-slate-700 select-none group"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      filters.minRating === 4.5
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white group-hover:border-primary'
                    }`}
                  >
                    {filters.minRating === 4.5 && (
                      <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-xs group-hover:text-primary transition-colors">
                    Đánh giá từ 4.5★ trở lên
                  </span>
                  <span className="ml-auto text-xs text-slate-400 font-normal">
                    ({highRatingCount})
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Optional GROUP 5: Phong cách du lịch (Cùng nhóm: OR) */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleGroup('styles')}
            className="flex w-full items-center justify-between text-left font-heading text-sm font-bold text-slate-800 transition hover:text-primary"
          >
            <span>Phong cách du lịch</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                openGroups.styles ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openGroups.styles && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STYLES.map((style) => {
                const isSelected = (filters.styles ?? []).includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => handleToggleStyle(style)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourFilter;
