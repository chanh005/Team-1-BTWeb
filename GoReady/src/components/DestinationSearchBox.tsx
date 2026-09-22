import React from 'react';
import { normalizeText, type DestinationGroup } from '../utils/destinations';

interface DestinationSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** Áp dụng lọc theo `value` (Enter, chọn gợi ý). */
  onSubmit: (value: string) => void;
  groups: DestinationGroup[];
}

const DestinationSearchBox: React.FC<DestinationSearchBoxProps> = ({ value, onChange, onSubmit, groups }) => {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  // Gợi ý: các điểm đến có tour, thu hẹp dần theo những gì đã gõ (không phân biệt hoa/thường và dấu)
  const suggestions = React.useMemo(() => {
    const q = normalizeText(value);
    return q ? groups.filter((g) => g.tours.some((t) => normalizeText(t.destination).includes(q))) : groups;
  }, [groups, value]);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (group: DestinationGroup) => {
    onChange(group.label);
    onSubmit(group.label);
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (suggestions.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && suggestions[active]) choose(suggestions[active]);
      else {
        onSubmit(value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative flex-1">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Tìm theo điểm đến: Đà Nẵng, Phú Quốc, Tokyo..."
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-card"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">Chưa có tour nào cho điểm đến này.</li>
          ) : (
            suggestions.map((g, i) => (
              <li
                key={g.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown (không phải click) để chọn được trước khi ô nhập mất focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(g);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm ${
                  i === active ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                }`}
              >
                <span className="truncate font-medium">📍 {g.label}</span>
                <span className="shrink-0 text-xs text-slate-400">{g.count} tour</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default DestinationSearchBox;
