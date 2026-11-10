import React from 'react';
import type { DestinationGroup } from '../utils/destinations';

interface DestinationTabsProps {
  groups: DestinationGroup[];
  /** `key` của nhóm đang chọn; null = "Tất cả" (hoặc từ khoá không trùng hẳn với điểm đến nào). */
  activeKey: string | null;
  /** Nhãn của điểm đến được chọn; chuỗi rỗng khi chọn "Tất cả". */
  onSelect: (destination: string) => void;
  /** "Tất cả" chỉ sáng khi không có từ khoá điểm đến nào đang áp dụng. */
  allActive: boolean;
}

const tabClass = (active: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
    active ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
  }`;

const DestinationTabs: React.FC<DestinationTabsProps> = ({ groups, activeKey, onSelect, allActive }) => {
  if (groups.length < 2) return null;

  return (
    <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Lọc theo điểm đến">
      <button role="tab" aria-selected={allActive} onClick={() => onSelect('')} className={tabClass(allActive)}>
        Tất cả
      </button>
      {groups.map((g) => (
        <button key={g.key} role="tab" aria-selected={activeKey === g.key} onClick={() => onSelect(g.label)} className={tabClass(activeKey === g.key)}>
          {g.label}
        </button>
      ))}
    </div>
  );
};

export default DestinationTabs;
