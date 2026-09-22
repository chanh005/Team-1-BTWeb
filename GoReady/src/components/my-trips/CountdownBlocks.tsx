import React from 'react';
import { useCountdown } from './tripUtils';

const Block: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
    <span className="font-heading text-xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
    <span className="text-[10px] uppercase tracking-wide text-white/80">{label}</span>
  </div>
);

/** Days / hours / minutes / seconds until `target`, styled for a coloured background. */
const CountdownBlocks: React.FC<{ target: Date }> = ({ target }) => {
  const cd = useCountdown(target);
  if (cd.expired) return <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Chúc bạn lên đường vui vẻ! 🎉</span>;
  return (
    <div className="flex gap-2">
      <Block value={cd.days} label="Ngày" />
      <Block value={cd.hours} label="Giờ" />
      <Block value={cd.minutes} label="Phút" />
      <Block value={cd.seconds} label="Giây" />
    </div>
  );
};

export default CountdownBlocks;
